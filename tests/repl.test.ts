import { describe, expect, it } from 'vitest';
import { RawRepl, pyBytesLiteral } from '../src/robot/repl';

/** A tiny stand-in for MicroPython's raw REPL that "runs" code by pattern. */
class FakeBoard {
  repl!: RawRepl;
  mode: 'friendly' | 'raw' = 'friendly';
  code = '';
  executed: string[] = [];
  hang = false;
  private enc = new TextEncoder();

  reply(s: string) {
    // Answer in small pieces, like BLE notifications.
    const b = this.enc.encode(s);
    for (let i = 0; i < b.length; i += 7) {
      const part = b.slice(i, i + 7);
      setTimeout(() => this.repl.feed(part), 0);
    }
  }

  async write(data: Uint8Array) {
    for (const byte of data) {
      if (byte === 0x03) {
        if (this.hang) { this.hang = false; this.reply('\x04Traceback\r\nKeyboardInterrupt: \r\n\x04>'); }
        continue;
      }
      if (byte === 0x01) { this.mode = 'raw'; this.code = ''; this.reply('raw REPL; CTRL-B to exit\r\n>'); continue; }
      if (byte === 0x02) { this.mode = 'friendly'; this.reply('\r\nMicroPython v1.25\r\n>>> '); continue; }
      if (byte === 0x04 && this.mode === 'raw') {
        this.executed.push(this.code);
        const out = [...this.code.matchAll(/print\('([^']*)'\)/g)].map((m) => m[1] + '\r\n').join('');
        if (this.code.includes('while True')) { this.hang = true; this.reply('OK' + out); }
        else if (this.code.includes('1/0')) this.reply('OK\x04Traceback\r\nZeroDivisionError: divide by zero\r\n\x04>');
        else this.reply('OK' + out + '\x04\x04>');
        this.code = '';
        continue;
      }
      if (this.mode === 'raw') this.code += String.fromCharCode(byte);
    }
  }
}

function setup() {
  const board = new FakeBoard();
  const repl = new RawRepl({ write: (b) => board.write(b) });
  board.repl = repl;
  return { board, repl };
}

describe('RawRepl', () => {
  it('runs code and returns stdout', async () => {
    const { repl } = setup();
    const r = await repl.exec("print('hello')\n");
    expect(r.out).toBe('hello\r\n');
    expect(r.err).toBe('');
  });

  it('returns stderr from exceptions', async () => {
    const { repl } = setup();
    const r = await repl.exec('1/0\n');
    expect(r.err).toContain('ZeroDivisionError');
  });

  it('streams output of a long program and stops on interrupt', async () => {
    const { repl } = setup();
    const seen: string[] = [];
    const job = repl.exec("print('tick')\nwhile True:\n    pass\n", { timeoutMs: 0, onOutput: (t) => seen.push(t) });
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.join('')).toContain('tick');
    await repl.interrupt();
    const r = await job;
    expect(r.err).toContain('KeyboardInterrupt');
  });

  it('serialises commands', async () => {
    const { repl, board } = setup();
    const [a, b] = await Promise.all([repl.exec("print('a')\n"), repl.exec("print('b')\n")]);
    expect(a.out).toBe('a\r\n');
    expect(b.out).toBe('b\r\n');
    expect(board.executed).toHaveLength(2);
  });

  it('writes files as ASCII-only bytes literals', async () => {
    const { repl, board } = setup();
    await repl.writeFile('/slots/slot1.py', "# Négyzet · XRP\nprint('Akadály!')\n");
    const code = board.executed[0];
    expect(code).toContain("open(\"/slots/slot1.py\", 'wb')");
    expect(/^[\x09\x0a\x20-\x7e]*$/.test(code)).toBe(true);
  });

  it('fails waiting commands when the link resets', async () => {
    const { repl, board } = setup();
    const job = repl.exec("while True:\n    pass\n", { timeoutMs: 0 });
    await new Promise((r) => setTimeout(r, 200));
    repl.reset();
    await expect(job).rejects.toThrow('Connection lost');
    board.hang = false;
    expect((await repl.exec("print('again')\n")).out).toBe('again\r\n');
  });
});

describe('pyBytesLiteral', () => {
  it('escapes everything outside printable ASCII', () => {
    const bytes = new TextEncoder().encode("a'\\\n\tá");
    expect(pyBytesLiteral(bytes)).toBe("b'a\\'\\\\\\n\\t\\xc3\\xa1'");
  });
});
