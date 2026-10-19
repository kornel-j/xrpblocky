/**
 * XRP Puppet Protocol (XPP) — the binary protocol XRPLib uses for dashboard
 * and gamepad data. Mirrors XRPLib/puppet.py.
 *
 * Frame: [0xAA 0x55] [type] [payload length] [payload] [0x55 0xAA]
 */

export const MsgType = {
  VAR_DEF: 1,
  VAR_UPDATE: 2,
  VAR_SUBSCRIBE: 3,
  VAR_UNSUBSCRIBE: 4,
  PROGRAM_START: 5,
  PROGRAM_END: 6,
  HEARTBEAT: 7
} as const;

export const VarType = { INT: 1, FLOAT: 2, BOOL: 3 } as const;

/** Variable ids fixed by XRPLib (puppet._STANDARD_VAR_IDS). */
export const STANDARD_VARS: Record<string, number> = {
  '$gamepad.x1': 1, '$gamepad.y1': 2, '$gamepad.x2': 3, '$gamepad.y2': 4,
  '$gamepad.button_a': 5, '$gamepad.button_b': 6, '$gamepad.button_x': 7, '$gamepad.button_y': 8,
  '$gamepad.bumper_l': 9, '$gamepad.bumper_r': 10, '$gamepad.trigger_l': 11, '$gamepad.trigger_r': 12,
  '$gamepad.back': 13, '$gamepad.start': 14, '$gamepad.dpad_up': 15, '$gamepad.dpad_dn': 16,
  '$gamepad.dpad_l': 17, '$gamepad.dpad_r': 18, '$gamepad.enabled': 19,
  '$imu.yaw': 20, '$imu.roll': 21, '$imu.pitch': 22, '$imu.acc_x': 23, '$imu.acc_y': 24, '$imu.acc_z': 25,
  '$encoder.left': 26, '$encoder.right': 27, '$encoder.3': 28, '$encoder.4': 29,
  '$current.left': 30, '$current.right': 31, '$current.3': 32, '$current.4': 33,
  '$rangefinder.distance': 34, '$reflectance.left': 35, '$reflectance.right': 36, '$voltage': 37
};

const START = [0xaa, 0x55];
const END = [0x55, 0xaa];
const MAX_PAYLOAD = 251;

export interface XppPacket {
  type: number;
  payload: Uint8Array;
}

export interface VarUpdate {
  id: number;
  type: number;
  value: number;
}

export function packMessage(type: number, payload: Uint8Array): Uint8Array {
  if (payload.length > MAX_PAYLOAD) throw new Error(`XPP payload too large: ${payload.length}`);
  const out = new Uint8Array(payload.length + 6);
  out.set(START, 0);
  out[2] = type;
  out[3] = payload.length;
  out.set(payload, 4);
  out.set(END, 4 + payload.length);
  return out;
}

/** Incremental frame parser: feed it notification chunks, get whole packets back. */
export class XppParser {
  private buf = new Uint8Array(0);

  push(chunk: Uint8Array): XppPacket[] {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf, 0);
    merged.set(chunk, this.buf.length);
    let b = merged;
    const packets: XppPacket[] = [];

    while (b.length >= 2) {
      let start = -1;
      for (let i = 0; i < b.length - 1; i++) {
        if (b[i] === START[0] && b[i + 1] === START[1]) { start = i; break; }
      }
      if (start === -1) {
        // Keep a trailing 0xAA: it may be the first half of the next start marker.
        b = b[b.length - 1] === START[0] ? b.slice(b.length - 1) : new Uint8Array(0);
        break;
      }
      if (start > 0) b = b.slice(start);
      if (b.length < 4) break;
      const len = b[3];
      if (len > MAX_PAYLOAD) { b = b.slice(2); continue; }
      const total = len + 6;
      if (b.length < total) break;
      if (b[total - 2] !== END[0] || b[total - 1] !== END[1]) { b = b.slice(2); continue; }
      packets.push({ type: b[2], payload: b.slice(4, 4 + len) });
      b = b.slice(total);
    }
    this.buf = b;
    return packets;
  }
}

export function decodeVarUpdates(payload: Uint8Array): VarUpdate[] {
  const out: VarUpdate[] = [];
  if (payload.length < 1) return out;
  const count = payload[0];
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  let o = 1;
  for (let i = 0; i < count; i++) {
    if (o + 2 > payload.length) break;
    const id = payload[o++];
    const type = payload[o++];
    if (type === VarType.INT || type === VarType.FLOAT) {
      if (o + 4 > payload.length) break;
      const value = type === VarType.INT ? view.getInt32(o, true) : view.getFloat32(o, true);
      o += 4;
      out.push({ id, type, value });
    } else if (type === VarType.BOOL) {
      if (o + 1 > payload.length) break;
      out.push({ id, type, value: payload[o++] ? 1 : 0 });
    } else {
      break;
    }
  }
  return out;
}

export function encodeVarUpdates(updates: VarUpdate[]): Uint8Array {
  const bytes: number[] = [updates.length];
  const tmp = new DataView(new ArrayBuffer(4));
  for (const u of updates) {
    bytes.push(u.id, u.type);
    if (u.type === VarType.BOOL) {
      bytes.push(u.value ? 1 : 0);
    } else {
      if (u.type === VarType.INT) tmp.setInt32(0, Math.round(u.value), true);
      else tmp.setFloat32(0, u.value, true);
      for (let i = 0; i < 4; i++) bytes.push(tmp.getUint8(i));
    }
  }
  return new Uint8Array(bytes);
}

export function decodeVarDef(payload: Uint8Array): { name: string; type: number; perm: number; id: number } | null {
  if (payload.length < 4) return null;
  const n = payload[0];
  if (payload.length < 1 + n + 3) return null;
  const name = new TextDecoder().decode(payload.slice(1, 1 + n));
  return { name, type: payload[1 + n], perm: payload[2 + n], id: payload[3 + n] };
}

/** Keeps the id → name map and the latest value of every variable seen. */
export class XppTable {
  private names = new Map<number, string>();
  readonly values = new Map<string, number>();

  constructor() {
    for (const [name, id] of Object.entries(STANDARD_VARS)) this.names.set(id, name);
  }

  /** Applies a packet; returns the names whose value changed. */
  apply(p: XppPacket): string[] {
    if (p.type === MsgType.VAR_DEF) {
      const d = decodeVarDef(p.payload);
      if (d) this.names.set(STANDARD_VARS[d.name] ?? d.id, d.name);
      return [];
    }
    if (p.type !== MsgType.VAR_UPDATE) return [];
    const changed: string[] = [];
    for (const u of decodeVarUpdates(p.payload)) {
      const name = this.names.get(u.id);
      if (!name) continue;
      this.values.set(name, u.value);
      changed.push(name);
    }
    return changed;
  }
}

/** Gamepad frame the robot's XRPLib.gamepad reads ($gamepad.* are write-only on the robot). */
export function gamepadPacket(x1: number, y1: number, buttonA = false, buttonB = false): Uint8Array {
  return packMessage(MsgType.VAR_UPDATE, encodeVarUpdates([
    { id: STANDARD_VARS['$gamepad.x1'], type: VarType.FLOAT, value: x1 },
    { id: STANDARD_VARS['$gamepad.y1'], type: VarType.FLOAT, value: y1 },
    { id: STANDARD_VARS['$gamepad.button_a'], type: VarType.INT, value: buttonA ? 1 : 0 },
    { id: STANDARD_VARS['$gamepad.button_b'], type: VarType.INT, value: buttonB ? 1 : 0 }
  ]));
}
