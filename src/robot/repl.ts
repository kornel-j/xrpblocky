/**
 * MicroPython raw REPL client over any byte link (Bluetooth UART here).
 *
 * Raw REPL protocol:
 *   Ctrl-A  → "raw REPL; CTRL-B to exit\r\n>"
 *   <code> Ctrl-D → "OK" <stdout> \x04 <stderr> \x04 ">"
 *   Ctrl-B  → back to the friendly ">>>" REPL
 */

export interface ReplPort {
  write(data: Uint8Array): Promise<void>;
}

export interface ExecResult {
  out: string;
  err: string;
}

export interface ExecOptions {
  /** Called with stdout text as it arrives (for long-running programs). */
  onOutput?: (text: string) => void;
  /** Give up waiting for the program to finish after this many ms (0 = wait forever). */
  timeoutMs?: number;
}

export class ReplTimeout extends Error {
  constructor(what: string) {
    super(`REPL timeout: ${what}`);
  }
}

const RAW_BANNER = 'raw REPL; CTRL-B to exit\r\n>';
const CHUNK = 240;

export class RawRepl {
  private rx = '';
  private decoder = new TextDecoder();
  private waiters: (() => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  /** Text that arrives while no command is collecting it (friendly REPL, boot messages). */
  onIdleOutput: (text: string) => void = () => {};
  private collecting = false;
  private aborted: Error | null = null;

  constructor(private port: ReplPort) {}

  /** Feed bytes received from the robot. */
  feed(bytes: Uint8Array): void {
    const text = this.decoder.decode(bytes, { stream: true });
    if (!text) return;
    if (!this.collecting) {
      this.onIdleOutput(text);
      return;
    }
    this.rx += text;
    const w = this.waiters;
    this.waiters = [];
    w.forEach((f) => f());
  }

  /** Runs REPL jobs one at a time so two commands never interleave on the link. */
  private serial<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async send(data: string | Uint8Array): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await this.port.write(bytes.subarray(i, i + CHUNK));
    }
  }

  /** Waits until `test(rx)` returns an index >= 0; returns that index. */
  private waitFor(test: (rx: string) => number, timeoutMs: number, what: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const check = () => {
        if (this.aborted) {
          if (timer) clearTimeout(timer);
          reject(this.aborted);
          return true;
        }
        const i = test(this.rx);
        if (i >= 0) {
          if (timer) clearTimeout(timer);
          resolve(i);
          return true;
        }
        return false;
      };
      if (check()) return;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          this.waiters = this.waiters.filter((f) => f !== loop);
          reject(new ReplTimeout(what));
        }, timeoutMs);
      }
      const loop = () => {
        if (!check()) this.waiters.push(loop);
      };
      this.waiters.push(loop);
    });
  }

  /** The link dropped: fail whatever is waiting and start clean. */
  reset(reason = 'Connection lost'): void {
    this.aborted = new Error(reason);
    const w = this.waiters;
    this.waiters = [];
    w.forEach((f) => f());
    this.aborted = null;
    this.collecting = false;
    this.rx = '';
    this.decoder = new TextDecoder();
  }

  private async enterRaw(timeoutMs = 3000): Promise<void> {
    this.collecting = true;
    this.rx = '';
    // Two Ctrl-C to stop anything running, then Ctrl-A for raw mode.
    await this.send('\r\x03\x03');
    await new Promise((r) => setTimeout(r, 80));
    this.rx = '';
    await this.send('\x01');
    const i = await this.waitFor((rx) => rx.lastIndexOf(RAW_BANNER), timeoutMs, 'raw REPL banner');
    this.rx = this.rx.slice(i + RAW_BANNER.length);
  }

  private async exitRaw(): Promise<void> {
    await this.send('\x02');
    // Let the friendly banner arrive before handing output back to the idle listener.
    await new Promise((r) => setTimeout(r, 120));
    this.collecting = false;
    this.rx = '';
  }

  private async runRaw(code: string, opts: ExecOptions): Promise<ExecResult> {
    await this.send(code);
    await this.send('\x04');
    await this.waitFor((rx) => (rx.length >= 2 ? 0 : -1), 5000, 'OK');
    if (!this.rx.startsWith('OK')) throw new Error('Robot rejected the code: ' + this.rx.slice(0, 80));
    this.rx = this.rx.slice(2);

    let streamed = 0;
    const firstEot = await this.waitFor((rx) => {
      const i = rx.indexOf('\x04');
      const visible = i >= 0 ? rx.slice(0, i) : rx;
      if (opts.onOutput && visible.length > streamed) {
        opts.onOutput(visible.slice(streamed));
        streamed = visible.length;
      }
      return i;
    }, opts.timeoutMs ?? 0, 'program end');
    const out = this.rx.slice(0, firstEot);
    this.rx = this.rx.slice(firstEot + 1);
    const secondEot = await this.waitFor((rx) => rx.indexOf('\x04'), 3000, 'stderr end');
    const err = this.rx.slice(0, secondEot);
    this.rx = this.rx.slice(secondEot + 1);
    return { out, err };
  }

  /** Executes code in raw mode and returns its output. */
  exec(code: string, opts: ExecOptions = { timeoutMs: 8000 }): Promise<ExecResult> {
    return this.serial(async () => {
      try {
        await this.enterRaw();
        return await this.runRaw(code, opts);
      } finally {
        await this.exitRaw().catch(() => undefined);
      }
    });
  }

  /** Writes a file on the robot's flash. */
  writeFile(path: string, content: string): Promise<void> {
    const bytes = new TextEncoder().encode(content);
    const parts: string[] = [];
    for (let i = 0; i < bytes.length; i += 1024) parts.push(pyBytesLiteral(bytes.subarray(i, i + 1024)));
    const dir = path.slice(0, path.lastIndexOf('/'));
    const code =
      'import os\n' +
      (dir ? `try:\n    os.mkdir(${JSON.stringify(dir)})\nexcept OSError:\n    pass\n` : '') +
      `f = open(${JSON.stringify(path)}, 'wb')\n` +
      parts.map((p) => `f.write(${p})\n`).join('') +
      'f.close()\n';
    return this.exec(code, { timeoutMs: 15000 }).then((r) => {
      if (r.err.trim()) throw new Error(r.err.trim());
    });
  }

  /** Sends Ctrl-C to interrupt a running program (does not wait). */
  async interrupt(): Promise<void> {
    await this.send('\x03\x03');
  }
}

/** Python bytes literal that is pure ASCII (safe to send through the raw REPL). */
export function pyBytesLiteral(bytes: Uint8Array): string {
  let s = "b'";
  for (const b of bytes) {
    if (b === 0x5c) s += '\\\\';
    else if (b === 0x27) s += "\\'";
    else if (b === 0x0a) s += '\\n';
    else if (b === 0x0d) s += '\\r';
    else if (b === 0x09) s += '\\t';
    else if (b >= 0x20 && b < 0x7f) s += String.fromCharCode(b);
    else s += '\\x' + b.toString(16).padStart(2, '0');
  }
  return s + "'";
}
