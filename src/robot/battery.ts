/**
 * Battery percentage estimate from pack voltage. The XRP runs on 4 × AA cells;
 * these per-cell curves are rough discharge shapes under light load and should
 * be calibrated against a real robot.
 */

export type BatteryType = 'alk' | 'nimh';

const CURVES: Record<BatteryType, [number, number][]> = {
  alk: [[1.0, 0], [1.1, 8], [1.2, 28], [1.25, 45], [1.3, 62], [1.4, 85], [1.5, 100]],
  nimh: [[1.0, 0], [1.1, 6], [1.18, 25], [1.22, 50], [1.26, 75], [1.3, 90], [1.38, 100]]
};

export function batteryPercent(packVolts: number, type: BatteryType, cells = 4): number {
  const c = CURVES[type];
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

export type BatteryLevel = 'ok' | 'low' | 'empty';

export function batteryLevel(percent: number): BatteryLevel {
  if (percent > 30) return 'ok';
  if (percent > 12) return 'low';
  return 'empty';
}
