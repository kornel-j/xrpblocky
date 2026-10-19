import { describe, expect, it } from 'vitest';
import { BleLink } from '../src/robot/ble';
import { gamepadAxesFrame, gamepadButtonsFrame } from '../src/robot/xpp';

/** Fake GATT device that enforces the robot's rules: write-with-response only, one operation at a time. */
function fakeDevice() {
  const log: { uuid: string; len: number }[] = [];
  let busy = false;
  let violations = 0;
  const listeners: Record<string, (() => void)[]> = {};
  const char = (uuid: string) => ({
    uuid,
    addEventListener() {},
    removeEventListener() {},
    async startNotifications() {},
    async writeValueWithResponse(v: Uint8Array) {
      if (busy) violations++;
      busy = true;
      await new Promise((r) => setTimeout(r, 5));
      busy = false;
      log.push({ uuid, len: v.length });
    },
    async writeValueWithoutResponse() {
      throw new Error('NotSupportedError: GATT operation not permitted');
    }
  });
  let connected = false;
  const device = {
    name: 'XRP-TEST',
    gatt: {
      get connected() { return connected; },
      async connect() { connected = true; return { getPrimaryService: async () => ({ getCharacteristic: async (u: string) => char(u) }) }; },
      disconnect() { connected = false; }
    },
    addEventListener(ev: string, f: () => void) { (listeners[ev] ??= []).push(f); },
    removeEventListener(ev: string, f: () => void) { listeners[ev] = (listeners[ev] ?? []).filter((x) => x !== f); },
    drop() { connected = false; (listeners.gattserverdisconnected ?? []).forEach((f) => f()); }
  };
  return { device, log, violations: () => violations };
}

describe('BleLink', () => {
  it('serialises REPL and gamepad writes and coalesces gamepad frames', async () => {
    const f = fakeDevice();
    const link = new BleLink({ onRepl() {}, onData() {}, onDrop() {}, onRestore() {} });
    await link.open(f.device as unknown as BluetoothDevice);
    const repl = link.writeRepl(new Uint8Array(200));
    for (let i = 0; i < 10; i++) link.writeData('axes', gamepadAxesFrame(i / 10, 0));
    link.writeData('buttons', gamepadButtonsFrame(true, false));
    await repl;
    await new Promise((r) => setTimeout(r, 60));
    expect(f.violations()).toBe(0);
    const data = f.log.filter((l) => l.uuid.startsWith('92ae'));
    expect(data.length).toBe(2); // newest axes frame + buttons frame
    expect(data.every((d) => d.len <= 20)).toBe(true);
  });

  it('reconnects by itself after a drop', async () => {
    const f = fakeDevice();
    const events: string[] = [];
    const link = new BleLink({ onRepl() {}, onData() {}, onDrop: (r) => events.push('drop:' + r), onRestore: () => events.push('restore') });
    await link.open(f.device as unknown as BluetoothDevice);
    f.device.drop();
    await new Promise((r) => setTimeout(r, 700));
    expect(events).toEqual(['drop:true', 'restore']);
    expect(link.connected).toBe(true);
  });
});
