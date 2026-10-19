import { tankMix } from './drive';
import { VoltageFilter } from './battery';
import { Emitter, type Robot, type RobotInfo, type RobotState, type Telemetry } from './robot';

/** Demo robot for trying the app without hardware. Values are made up. */
export class SimRobot extends Emitter implements Robot {
  readonly simulated = true;
  readonly name = 'XRP-DEMO';
  state: RobotState = 'ready';
  info: RobotInfo = { id: 'demo', machine: 'Simulated XRP', xrplib: '—', hasDashboard: true, slots: {} };
  telemetry: Telemetry = {};
  private t = 0;
  private v = 5.72;
  private enc = [0, 0];
  private yaw = 0;
  private effort = [0, 0];
  private runStart = 0;
  private timer: ReturnType<typeof setInterval>;
  private runTimers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    super();
    let last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.step(Math.min(0.3, (now - last) / 1000));
      last = now;
    }, 100);
  }

  private step(dt: number) {
    this.t += dt;
    let [l, r] = this.effort;
    if (this.state === 'running' && !this.driving) {
      const ph = ((performance.now() - this.runStart) / 1000) % 2.6;
      [l, r] = ph < 1.8 ? [0.6, 0.6] : [-0.45, 0.45];
    }
    this.enc[0] += l * dt * 576;
    this.enc[1] += r * dt * 576;
    this.yaw = ((this.yaw + (r - l) * dt * 95 + 540) % 360) - 180;
    this.v = Math.max(4.4, this.v - dt * 0.0008);
    const load = (Math.abs(l) + Math.abs(r)) * 0.18;
    const raw = this.v - load + (Math.random() - 0.5) * 0.01;
    this.telemetry = {
      voltage: this.vFilter.push(raw, performance.now()),
      voltageRaw: raw,
      distance: Math.max(3, 38 + 26 * Math.sin(this.t / 2.7) + (Math.random() - 0.5) * 1.5),
      lineL: clamp01(0.5 + 0.45 * Math.sin(this.t / 1.9)),
      lineR: clamp01(0.5 - 0.45 * Math.sin(this.t / 1.9 + 0.6)),
      yaw: this.yaw,
      pitch: 1.2 + Math.sin(this.t * 1.3) * 0.6 + (l + r) * 1.5,
      roll: -0.6 + Math.cos(this.t) * 0.4,
      encL: this.enc[0],
      encR: this.enc[1],
      enc3: 0,
      enc4: 0,
      at: performance.now()
    };
    this.emit('telemetry', this.telemetry);
  }

  private driving = false;
  private vFilter = new VoltageFilter();

  private setState(s: RobotState) {
    this.state = s;
    this.emit('state', s);
  }

  async save(code: string, slot: number): Promise<boolean> {
    this.info.slots[slot] = code.split('\n')[0].replace(/^#\s*/, '').split(' · ')[0];
    return true;
  }

  async run(code: string, slot: number): Promise<void> {
    await this.stop();
    this.setState('busy');
    this.info.slots[slot] = code.split('\n')[0].replace(/^#\s*/, '').split(' · ')[0];
    this.runTimers.push(setTimeout(() => {
      this.emit('output', `▶ ${slot}`, 'sys');
      this.runStart = performance.now();
      this.setState('running');
      const prints = [...code.matchAll(/print\((['"])(.*?)\1\)/g)].map((m) => m[2]);
      prints.forEach((p, i) => this.runTimers.push(setTimeout(() => this.emit('output', p + '\n', 'out'), 1500 + i * 1200)));
      this.runTimers.push(setTimeout(() => this.finish(), 12000));
    }, 600));
  }

  async drive(): Promise<void> {
    await this.stop();
    this.driving = true;
    this.emit('output', '🕹', 'sys');
    this.setState('running');
  }

  private finish() {
    this.runTimers.forEach(clearTimeout);
    this.runTimers = [];
    this.driving = false;
    this.effort = [0, 0];
    this.setState('ready');
  }

  async stop(): Promise<void> {
    if (this.state === 'running' || this.state === 'busy') this.finish();
  }

  sendGamepad(x: number, y: number): void {
    if (!this.driving) return;
    this.effort = tankMix(x, y);
  }

  async identify(): Promise<void> {}

  disconnect(): void {
    clearInterval(this.timer);
    this.finish();
    this.setState('disconnected');
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
