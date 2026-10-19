import { describe, expect, it } from 'vitest';
import { VoltageFilter, batteryLevel, batteryPercent, detectBattery } from '../src/robot/battery';

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
  it('handles Li-ion packs', () => {
    expect(batteryPercent(8.4, 'li2s')).toBe(100);
    expect(batteryPercent(7.4, 'li2s')).toBe(40);
    expect(batteryPercent(3.7, 'li1s')).toBe(40);
  });
  it('detects the pack from voltage and board', () => {
    expect(detectBattery(7.8)).toBe('li2s');
    expect(detectBattery(5.4)).toBe('nimh');
    expect(detectBattery(3.9)).toBe('li1s');
    expect(detectBattery(5.0, 'NanoXRP with RP2040')).toBe('li1s');
    expect(detectBattery(undefined)).toBe('nimh');
  });
  it('labels levels', () => {
    expect(batteryLevel(80)).toBe('ok');
    expect(batteryLevel(20)).toBe('low');
    expect(batteryLevel(5)).toBe('empty');
  });

  it('smooths motor sag but takes fresh batteries at once', () => {
    const f = new VoltageFilter();
    let t = 0;
    f.push(5.6, t);
    let v = 0;
    for (let i = 0; i < 10; i++) v = f.push(4.9, (t += 200)); // 2 s of driving
    expect(v).toBeGreaterThan(5.4);
    expect(f.push(6.6, (t += 200))).toBe(6.6);
  });
});
