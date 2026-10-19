import { describe, expect, it } from 'vitest';
import { MsgType, VarType, XppParser, XppTable, decodeVarUpdates, encodeVarUpdates, gamepadAxesFrame, gamepadBeatFrame, gamepadButtonsFrame, packMessage } from '../src/robot/xpp';

/** Builds the same bytes XRPLib's Puppet._send_batched_var_updates sends. */
function robotUpdate(vars: [number, number, number][]): Uint8Array {
  return packMessage(MsgType.VAR_UPDATE, encodeVarUpdates(vars.map(([id, type, value]) => ({ id, type, value }))));
}

describe('XPP', () => {
  it('round-trips batched variable updates', () => {
    const payload = encodeVarUpdates([
      { id: 34, type: VarType.FLOAT, value: 23.5 },
      { id: 26, type: VarType.INT, value: -1170 },
      { id: 19, type: VarType.BOOL, value: 1 }
    ]);
    expect(decodeVarUpdates(payload)).toEqual([
      { id: 34, type: VarType.FLOAT, value: 23.5 },
      { id: 26, type: VarType.INT, value: -1170 },
      { id: 19, type: VarType.BOOL, value: 1 }
    ]);
  });

  it('reassembles packets split across notifications and skips noise', () => {
    const a = robotUpdate([[37, VarType.FLOAT, 5.5]]);
    const b = robotUpdate([[34, VarType.FLOAT, 12.25], [35, VarType.FLOAT, 0.75]]);
    const stream = new Uint8Array([0x01, 0x02, ...a, 0xaa, ...b]);
    const parser = new XppParser();
    const got = [...parser.push(stream.slice(0, 7)), ...parser.push(stream.slice(7, 20)), ...parser.push(stream.slice(20))];
    expect(got).toHaveLength(2);
    const table = new XppTable();
    got.forEach((p) => table.apply(p));
    expect(table.values.get('$voltage')).toBeCloseTo(5.5);
    expect(table.values.get('$rangefinder.distance')).toBeCloseTo(12.25);
    expect(table.values.get('$reflectance.left')).toBeCloseTo(0.75);
  });

  it('learns custom variable ids from VAR_DEF', () => {
    const name = new TextEncoder().encode('score');
    const def = packMessage(MsgType.VAR_DEF, new Uint8Array([name.length, ...name, VarType.INT, 1, 38]));
    const table = new XppTable();
    const parser = new XppParser();
    parser.push(def).forEach((p) => table.apply(p));
    parser.push(robotUpdate([[38, VarType.INT, 7]])).forEach((p) => table.apply(p));
    expect(table.values.get('score')).toBe(7);
  });

  it('keeps every gamepad frame inside the robot\'s 20-byte buffer', () => {
    const frames = [gamepadAxesFrame(0.5, -1), gamepadButtonsFrame(true, false), gamepadBeatFrame(7)];
    for (const f of frames) {
      expect(f.length).toBeLessThanOrEqual(20);
      expect([...f.slice(0, 2)]).toEqual([0xaa, 0x55]);
      expect(f[2]).toBe(MsgType.VAR_UPDATE);
      expect([...f.slice(-2)]).toEqual([0x55, 0xaa]);
    }
    const axes = decodeVarUpdates(gamepadAxesFrame(0.5, -1).slice(4, -2));
    expect(axes.map((u) => [u.id, u.value])).toEqual([[1, 0.5], [2, -1]]);
    const buttons = decodeVarUpdates(gamepadButtonsFrame(true, false).slice(4, -2));
    expect(buttons.map((u) => [u.id, u.value])).toEqual([[5, 1], [6, 0]]);
    expect(decodeVarUpdates(gamepadBeatFrame(7).slice(4, -2))[0].id).toBe(3);
  });
});
