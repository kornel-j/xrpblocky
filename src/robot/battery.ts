/**
 * Battery percentage estimate from pack voltage. Per-cell curves are rough
 * discharge shapes under light load and should be calibrated against a real robot.
 *
 * Packs seen on XRP robots: 4 × AA (alkaline or NiMH), 1-cell Li-ion/LiPo
 * (NanoXRP) and 2-cell Li-ion/LiPo packs.
 */

export type BatteryType = 'alk' | 'nimh' | 'li1s' | 'li2s';
export type BatterySetting = BatteryType | 'auto';

const ALK: [number, number][] = [[1.0, 0], [1.1, 8], [1.2, 28], [1.25, 45], [1.3, 62], [1.4, 85], [1.5, 100]];
const NIMH: [number, number][] = [[1.0, 0], [1.1, 6], [1.18, 25], [1.22, 50], [1.26, 75], [1.3, 90], [1.38, 100]];
const LIION: [number, number][] = [[3.0, 0], [3.45, 5], [3.6, 20], [3.7, 40], [3.8, 60], [3.9, 75], [4.0, 85], [4.1, 95], [4.2, 100]];

const PACKS: Record<BatteryType, { curve: [number, number][]; cells: number }> = {
  alk: { curve: ALK, cells: 4 },
  nimh: { curve: NIMH, cells: 4 },
  li1s: { curve: LIION, cells: 1 },
  li2s: { curve: LIION, cells: 2 }
};

export function batteryPercent(packVolts: number, type: BatteryType): number {
  const { curve: c, cells } = PACKS[type];
  const cell = packVolts / cells;
  if (!Number.isFinite(cell) || cell <= c[0][0]) return 0;
  for (let i = 1; i < c.length; i++) {
    if (cell <= c[i][0]) {
      const [v0, p0] = c[i - 1];
      const [v1, p1] = c[i];
      return Math.round(p0 + (p1 - p0) * (cell - v0) / (v1 - v0));
    }
  }
  return 100;
}

/**
 * Guesses the pack from the board and its voltage. Rechargeable AA cells are
 * the usual XRP choice in class, so the 4 × AA range defaults to NiMH.
 */
export function detectBattery(packVolts: number | undefined, machine = ''): BatteryType {
  if (/nano/i.test(machine)) return 'li1s';
  if (packVolts === undefined || packVolts <= 0) return 'nimh';
  if (packVolts < 4.4) return 'li1s';
  if (packVolts > 6.7) return 'li2s';
  return 'nimh';
}

export type BatteryLevel = 'ok' | 'low' | 'empty';

export function batteryLevel(percent: number): BatteryLevel {
  if (percent > 30) return 'ok';
  if (percent > 12) return 'low';
  return 'empty';
}

/**
 * Smooths pack voltage so the percentage does not jump while the motors pull it
 * down. Rises are followed slowly (a sag recovering is not a charge), drops a bit
 * faster; a big jump up (fresh batteries) is taken at once.
 */
export class VoltageFilter {
  private v: number | null = null;
  private at = 0;

  push(volts: number, nowMs: number): number {
    if (!(volts > 0)) return this.v ?? volts;
    if (this.v === null || volts - this.v > 0.6) {
      this.v = volts;
    } else {
      const dt = Math.min(5, Math.max(0, (nowMs - this.at) / 1000));
      const tau = volts > this.v ? 20 : 8;
      this.v += (volts - this.v) * (1 - Math.exp(-dt / tau));
    }
    this.at = nowMs;
    return this.v;
  }
}
