import { describe, expect, it } from 'vitest';
import { batteryLevel, batteryPercent } from '../src/robot/battery';

describe('battery', () => {
  it('maps 4×AA pack voltage to a percentage', () => {
    expect(batteryPercent(6.2, 'alk')).toBe(100);
    expect(batteryPercent(4.0, 'alk')).toBe(0);
    expect(batteryPercent(5.0, 'alk')).toBe(45);
    expect(batteryPercent(4.88, 'nimh')).toBe(50);
    expect(batteryPercent(NaN, 'alk')).toBe(0);
  });
  it('is monotonic', () => {
    let prev = -1;
    for (let v = 3.8; v <= 6.4; v += 0.05) {
      const p = batteryPercent(v, 'alk');
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
  it('labels levels', () => {
    expect(batteryLevel(80)).toBe('ok');
    expect(batteryLevel(20)).toBe('low');
    expect(batteryLevel(5)).toBe('empty');
  });
});
