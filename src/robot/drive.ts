/** Joystick → wheel efforts. Must match the mix in DRIVE_PROGRAM (snippets.ts). */

export const DEADZONE = 0.08;

export function deadzone(v: number): number {
  if (Math.abs(v) < DEADZONE) return 0;
  return (v > 0 ? v - DEADZONE : v + DEADZONE) / (1 - DEADZONE);
}

/** x: right is positive; y: screen coordinates, so pushing the stick up is negative. */
export function tankMix(x: number, y: number): [number, number] {
  const fwd = deadzone(-y);
  const right = deadzone(x);
  const l = fwd + right;
  const r = fwd - right;
  const m = Math.max(1, Math.abs(l), Math.abs(r));
  return [l / m, r / m];
}
