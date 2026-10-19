import { BleLink, STOP_MESSAGE } from './ble';
import { RawRepl, ReplTimeout } from './repl';
import { XppParser, XppTable, gamepadAxesFrame, gamepadBeatFrame, gamepadButtonsFrame } from './xpp';
import * as S from './snippets';
import { VoltageFilter } from './battery';
import { t } from '../i18n/ui';

/** XRP drive motors: 48.75:1 gearbox × 12 counts per motor turn. */
const COUNTS_PER_REV = 585;

export interface Telemetry {
  /** Pack voltage, smoothed (see VoltageFilter). */
  voltage?: number;
  /** Last raw voltage reading. */
  voltageRaw?: number;
  distance?: number;
  lineL?: number;
  lineR?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** Wheel positions in degrees. */
  encL?: number;
  encR?: number;
  enc3?: number;
  enc4?: number;
  /** Time of the last live sample (ms, performance.now()). */
  at?: number;
}

export interface RobotInfo {
  id: string;
  machine: string;
  xrplib: string;
  hasDashboard: boolean;
  /** slot number → program name, as stored on the robot */
  slots: Record<number, string>;
}

export type RobotState = 'connecting' | 'ready' | 'busy' | 'running' | 'reconnecting' | 'disconnected';

export interface RobotEvents {
  state(s: RobotState): void;
  telemetry(t: Telemetry): void;
  /** Program output (print) */
  output(text: string, kind: 'out' | 'err' | 'sys'): void;
}

/** What the UI talks to: the real Bluetooth robot or the simulator. */
export interface Robot {
  readonly simulated: boolean;
  readonly name: string;
  state: RobotState;
  info: RobotInfo | null;
  telemetry: Telemetry;
  run(code: string, slot: number): Promise<void>;
  drive(): Promise<void>;
  stop(): Promise<void>;
  sendGamepad(x: number, y: number, a: boolean, b: boolean): void;
  identify(rgb: [number, number, number]): Promise<void>;
  disconnect(): void;
  on(l: Listener): () => void;
}

export type Listener = { [K in keyof RobotEvents]?: RobotEvents[K] };

export class Emitter {
  private ls: Listener[] = [];
  on(l: Listener): () => void {
    this.ls.push(l);
    return () => { this.ls = this.ls.filter((x) => x !== l); };
  }
  protected emit<K extends keyof RobotEvents>(k: K, ...a: Parameters<RobotEvents[K]>): void {
    for (const l of this.ls) (l[k] as ((...x: unknown[]) => void) | undefined)?.(...a);
  }
}

export class BleRobot extends Emitter implements Robot {
  readonly simulated = false;
  state: RobotState = 'connecting';
  info: RobotInfo | null = null;
  telemetry: Telemetry = {};
  private link: BleLink;
  private repl: RawRepl;
  private parser = new XppParser();
  private table = new XppTable();
  private running: Promise<unknown> | null = null;
  private stopRequested = false;
  private voltageTimer: ReturnType<typeof setInterval> | undefined;
  private vFilter = new VoltageFilter();

  constructor(private device: BluetoothDevice) {
    super();
    this.link = new BleLink({
      onRepl: (b) => this.repl.feed(b),
      onData: (b) => this.onData(b),
      onDrop: (retry) => {
        this.repl.reset();
        this.emit('output', retry ? t('linkLost') : t('linkGone'), 'sys');
        this.setState(retry ? 'reconnecting' : 'disconnected');
      },
      onRestore: () => {
        this.emit('output', t('linkBack'), 'sys');
        void this.afterConnect();
      }
    });
    this.repl = new RawRepl({ write: (b) => this.link.writeRepl(b) });
    this.repl.onIdleOutput = (t) => this.emit('output', t, 'out');
  }

  get name(): string {
    return this.device.name ?? 'XRP';
  }

  private setState(s: RobotState) {
    this.state = s;
    if (s === 'disconnected') clearInterval(this.voltageTimer);
    this.emit('state', s);
  }

  async connect(): Promise<void> {
    this.setState('connecting');
    await this.link.open(this.device);
    await this.afterConnect();
  }

  /** Reads robot info and starts the sensor stream. Runs again after every reconnect. */
  private async afterConnect(): Promise<void> {
    this.setState('busy');
    try {
      let r;
      try {
        r = await this.repl.exec(S.INFO);
      } catch (e) {
        // A program started from main.py may be holding the REPL; reboot it to a free REPL.
        if (!(e instanceof ReplTimeout)) throw e;
        await this.link.writeRepl(new TextEncoder().encode(STOP_MESSAGE));
        return; // the link drops and onRestore brings us back here
      }
      const line = r.out.split('\n').find((l) => l.startsWith('XRPB|'));
      if (line) {
        const [, machine, xrplib, volts, dash, id, slots] = line.trim().split('|');
        const slotMap: Record<number, string> = {};
        for (const s of (slots ?? '').split(';').filter(Boolean)) {
          const [n, name] = s.split(':');
          slotMap[Number(n)] = name || '';
        }
        this.info = { machine, xrplib, id, hasDashboard: dash === '1' && this.link.hasDataChannel, slots: slotMap };
        const v = parseFloat(volts);
        if (v > 0) this.telemetry = { ...this.telemetry, voltage: this.vFilter.push(v, performance.now()), voltageRaw: v };
        this.emit('telemetry', this.telemetry);
      }
      await this.startTelemetry();
      this.setState('ready');
    } catch (e) {
      this.emit('output', String((e as Error).message ?? e), 'err');
      this.setState('ready');
    }
  }

  private async startTelemetry(): Promise<void> {
    clearInterval(this.voltageTimer);
    if (this.info?.hasDashboard) {
      await this.repl.exec(S.TELEMETRY_START).catch(() => undefined);
      return;
    }
    // Older XRPLib without the dashboard: poll the battery every 30 s while idle.
    this.voltageTimer = setInterval(async () => {
      if (this.state !== 'ready') return;
      const r = await this.repl.exec(S.VOLTAGE).catch(() => null);
      const v = r ? parseFloat(r.out) : NaN;
      if (v > 0) {
        this.telemetry = { ...this.telemetry, voltage: this.vFilter.push(v, performance.now()), voltageRaw: v, at: performance.now() };
        this.emit('telemetry', this.telemetry);
      }
    }, 30000);
  }

  private onData(bytes: Uint8Array) {
    const changed = new Set<string>();
    for (const p of this.parser.push(bytes)) for (const n of this.table.apply(p)) changed.add(n);
    if (!changed.size) return;
    const v = this.table.values;
    const deg = (n?: number) => (n === undefined ? undefined : (n / COUNTS_PER_REV) * 360);
    const rawV = changed.has('$voltage') ? v.get('$voltage') : undefined;
    this.telemetry = {
      voltage: rawV !== undefined ? this.vFilter.push(rawV, performance.now()) : this.telemetry.voltage,
      voltageRaw: rawV ?? this.telemetry.voltageRaw,
      distance: v.get('$rangefinder.distance'),
      lineL: v.get('$reflectance.left'),
      lineR: v.get('$reflectance.right'),
      yaw: v.get('$imu.yaw'),
      pitch: v.get('$imu.pitch'),
      roll: v.get('$imu.roll'),
      encL: deg(v.get('$encoder.left')),
      encR: deg(v.get('$encoder.right')),
      enc3: deg(v.get('$encoder.3')),
      enc4: deg(v.get('$encoder.4')),
      at: performance.now()
    };
    this.emit('telemetry', this.telemetry);
  }

  private async exec(code: string, label: string): Promise<void> {
    if (this.running) await this.stop();
    this.stopRequested = false;
    this.setState('running');
    this.emit('output', label, 'sys');
    const job = this.repl.exec(code, { timeoutMs: 0, onOutput: (t) => this.emit('output', t, 'out') });
    this.running = job;
    try {
      const r = await job;
      const err = r.err.trim();
      if (err && !(this.stopRequested && err.includes('KeyboardInterrupt'))) this.emit('output', err, 'err');
    } catch (e) {
      if (!this.stopRequested) this.emit('output', String((e as Error).message ?? e), 'err');
    } finally {
      this.running = null;
      if (this.link.connected) {
        this.setState('busy');
        await this.startTelemetry().catch(() => undefined);
        this.setState('ready');
      }
    }
  }

  /** Saves the program to a slot, makes it the button-start program, and runs it. */
  async run(code: string, slot: number): Promise<void> {
    if (this.running) await this.stop();
    this.setState('busy');
    try {
      await this.repl.writeFile(S.slotPath(slot), code);
      await this.repl.writeFile('/main.py', S.mainRunner(slot));
    } catch (e) {
      this.emit('output', String((e as Error).message ?? e), 'err');
      this.setState('ready');
      return;
    }
    const name = code.split('\n')[0].replace(/^#\s*/, '').split(' · ')[0];
    if (this.info) this.info.slots[slot] = name;
    void this.exec(S.runSlot(slot), `▶ ${slot}`);
  }

  async drive(): Promise<void> {
    if (this.running) await this.stop();
    void this.exec(S.DRIVE_PROGRAM, '🕹');
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.stopRequested = true;
    const job = this.running;
    await this.repl.interrupt().catch(() => undefined);
    const ended = await Promise.race([job.then(() => true, () => true), sleep(2000).then(() => false)]);
    if (!ended) {
      // Ctrl-C did not get through: reboot the robot into a free REPL.
      await this.link.writeRepl(new TextEncoder().encode(STOP_MESSAGE)).catch(() => undefined);
    }
  }

  private lastPad = { x: NaN, y: NaN, a: false, b: false, at: 0 };
  private beat = 0;
  private lastBeat = 0;

  /** Sends joystick state when it changes, and refreshes it every 300 ms in case a frame was lost. */
  sendGamepad(x: number, y: number, a: boolean, b: boolean): void {
    const p = this.lastPad;
    const now = performance.now();
    const refresh = now - p.at > 300;
    if (refresh || Math.abs(x - p.x) > 0.01 || Math.abs(y - p.y) > 0.01) {
      this.link.writeData('axes', gamepadAxesFrame(x, y));
    }
    if (refresh || a !== p.a || b !== p.b) {
      this.link.writeData('buttons', gamepadButtonsFrame(a, b));
    }
    if (now - this.lastBeat > 200) {
      this.lastBeat = now;
      this.link.writeData('beat', gamepadBeatFrame(++this.beat));
    }
    this.lastPad = { x, y, a, b, at: refresh ? now : p.at };
  }

  async identify(rgb: [number, number, number]): Promise<void> {
    if (this.state !== 'ready') return;
    await this.repl.exec(S.identify(rgb)).catch(() => undefined);
  }

  disconnect(): void {
    clearInterval(this.voltageTimer);
    this.link.close();
    this.setState('disconnected');
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
