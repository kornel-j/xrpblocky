import { describe, expect, it } from 'vitest';
import { tankMix } from '../src/robot/drive';

describe('tankMix', () => {
  it('drives straight', () => {
    expect(tankMix(0, -1)).toEqual([1, 1]);
    expect(tankMix(0, 1)).toEqual([-1, -1]);
  });
  it('turns right for stick right, forwards and backwards alike', () => {
    const [lf, rf] = tankMix(0.6, -0.6);
    expect(lf).toBeGreaterThan(rf);
    const [lb, rb] = tankMix(0.6, 0.6);
    expect(lb).toBeGreaterThan(rb);
  });
  it('does not flip direction for small vertical wobble while spinning', () => {
    for (const y of [-0.05, 0, 0.05]) {
      const [l, r] = tankMix(0.9, y);
      expect(l).toBeGreaterThan(0);
      expect(r).toBeLessThan(0);
    }
  });
  it('ignores tiny movements near the centre', () => {
    expect(tankMix(0.05, -0.05)).toEqual([0, 0]);
  });
});
