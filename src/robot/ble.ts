/**
 * Web Bluetooth link to an XRP robot. The robot (ble/ble_uart_peripheral.py)
 * exposes a Nordic UART service with two extra characteristics for XPP data.
 */

const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const REPL_WRITE = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const REPL_NOTIFY = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const DATA_WRITE = '92ae6088-f24d-4360-b1b1-a432a8ed36ff';
const DATA_NOTIFY = '92ae6088-f24d-4360-b1b1-a432a8ed36fe';

/** Sent on the REPL channel, this makes the robot reboot to a free REPL (see ble_uart_peripheral.py). */
export const STOP_MESSAGE = '##XRPSTOP##';

export function bluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export interface BleHandlers {
  onRepl(bytes: Uint8Array): void;
  onData(bytes: Uint8Array): void;
  /** `willRetry` is true while the link tries to come back by itself. */
  onDrop(willRetry: boolean): void;
  onRestore(): void;
}

export class BleLink {
  private device: BluetoothDevice | null = null;
  private replTx: BluetoothRemoteGATTCharacteristic | null = null;
  private dataTx: BluetoothRemoteGATTCharacteristic | null = null;
  private writes: Promise<void> = Promise.resolve();
  private closing = false;
  hasDataChannel = false;

  constructor(private h: BleHandlers) {}

  get name(): string {
    return this.device?.name ?? 'XRP';
  }

  /** Opens the browser's device chooser. Must be called from a click handler. */
  static async choose(): Promise<BluetoothDevice> {
    return navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'XRP' }],
      optionalServices: [UART_SERVICE]
    });
  }

  async open(device: BluetoothDevice): Promise<void> {
    this.closing = false;
    this.device = device;
    device.removeEventListener('gattserverdisconnected', this.onGattDrop);
    device.addEventListener('gattserverdisconnected', this.onGattDrop);
    await this.attach();
  }

  private async attach(): Promise<void> {
    const dev = this.device!;
    const server = await withTimeout(dev.gatt!.connect(), 10000, 'Bluetooth connect');
    const service = await server.getPrimaryService(UART_SERVICE);
    this.replTx = await service.getCharacteristic(REPL_WRITE);
    const replRx = await service.getCharacteristic(REPL_NOTIFY);
    replRx.addEventListener('characteristicvaluechanged', (e) => {
      const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (v) this.h.onRepl(new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice());
    });
    await replRx.startNotifications();
    try {
      this.dataTx = await service.getCharacteristic(DATA_WRITE);
      const dataRx = await service.getCharacteristic(DATA_NOTIFY);
      dataRx.addEventListener('characteristicvaluechanged', (e) => {
        const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
        if (v) this.h.onData(new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice());
      });
      await dataRx.startNotifications();
      this.hasDataChannel = true;
    } catch {
      // Older robot firmware has only the REPL characteristics.
      this.dataTx = null;
      this.hasDataChannel = false;
    }
  }

  private onGattDrop = () => {
    if (this.closing) return;
    this.replTx = null;
    this.dataTx = null;
    this.h.onDrop(true);
    void this.retry();
  };

  /** The robot reboots after STOP_MESSAGE or a brown-out; try to get back for ~12 s. */
  private async retry(): Promise<void> {
    for (let i = 0; i < 6 && !this.closing; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await this.attach();
        this.h.onRestore();
        return;
      } catch {
        // keep trying
      }
    }
    if (!this.closing) this.h.onDrop(false);
  }

  get connected(): boolean {
    return !!this.device?.gatt?.connected && !!this.replTx;
  }

  writeRepl(bytes: Uint8Array): Promise<void> {
    const job = this.writes.then(async () => {
      if (!this.replTx) throw new Error('Not connected');
      await this.replTx.writeValueWithResponse(bytes);
    });
    this.writes = job.catch(() => undefined);
    return job;
  }

  async writeData(bytes: Uint8Array): Promise<void> {
    if (!this.dataTx) return;
    try {
      await this.dataTx.writeValueWithoutResponse(bytes);
    } catch {
      // A dropped gamepad frame is harmless; the next one follows 50 ms later.
    }
  }

  close(): void {
    this.closing = true;
    try {
      this.device?.gatt?.disconnect();
    } catch {
      // already gone
    }
    this.replTx = null;
    this.dataTx = null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(what + ' timed out')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
