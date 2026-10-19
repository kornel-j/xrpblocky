/**
 * Web Bluetooth link to an XRP robot. The robot (ble/ble_uart_peripheral.py)
 * exposes a Nordic UART service with two extra characteristics for XPP data.
 *
 * Robot-side limits this link respects:
 * - every characteristic accepts only write-with-response (no WRITE_NO_RESPONSE flag);
 * - the XPP data characteristic keeps MicroPython's default 20-byte buffer, so
 *   longer writes are truncated on the robot.
 */

const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const REPL_WRITE = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const REPL_NOTIFY = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const DATA_WRITE = '92ae6088-f24d-4360-b1b1-a432a8ed36ff';
const DATA_NOTIFY = '92ae6088-f24d-4360-b1b1-a432a8ed36fe';

/** Largest single write the robot's XPP data characteristic keeps. */
export const DATA_WRITE_MAX = 20;

/** Sent on the REPL channel, this makes the robot reboot to a free REPL (see ble_uart_peripheral.py). */
export const STOP_MESSAGE = '##XRPSTOP##';

/** Waits between reconnect attempts after an unexpected drop (~45 s in total). */
const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 8000];

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

const valueOf = (e: Event) => {
  const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
  return v ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice() : null;
};

export class BleLink {
  private device: BluetoothDevice | null = null;
  private replTx: BluetoothRemoteGATTCharacteristic | null = null;
  private dataTx: BluetoothRemoteGATTCharacteristic | null = null;
  private replRx: BluetoothRemoteGATTCharacteristic | null = null;
  private dataRx: BluetoothRemoteGATTCharacteristic | null = null;
  /** Web Bluetooth allows one GATT operation at a time per device, so every write goes through here. */
  private gatt: Promise<void> = Promise.resolve();
  /** Latest data frames waiting to be written; newer frames for the same key replace older ones. */
  private pendingData = new Map<string, Uint8Array>();
  private dataPumping = false;
  private closing = false;
  private retrying = false;
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

  private onReplValue = (e: Event) => {
    const b = valueOf(e);
    if (b) this.h.onRepl(b);
  };

  private onDataValue = (e: Event) => {
    const b = valueOf(e);
    if (b) this.h.onData(b);
  };

  private async attach(): Promise<void> {
    const dev = this.device!;
    const server = await withTimeout(dev.gatt!.connect(), 10000, 'Bluetooth connect');
    const service = await server.getPrimaryService(UART_SERVICE);
    this.gatt = Promise.resolve();
    this.replTx = await service.getCharacteristic(REPL_WRITE);
    // Chrome may hand back the same characteristic objects after a reconnect: never double-subscribe.
    this.replRx?.removeEventListener('characteristicvaluechanged', this.onReplValue);
    this.replRx = await service.getCharacteristic(REPL_NOTIFY);
    this.replRx.addEventListener('characteristicvaluechanged', this.onReplValue);
    await this.replRx.startNotifications();
    try {
      this.dataTx = await service.getCharacteristic(DATA_WRITE);
      this.dataRx?.removeEventListener('characteristicvaluechanged', this.onDataValue);
      this.dataRx = await service.getCharacteristic(DATA_NOTIFY);
      this.dataRx.addEventListener('characteristicvaluechanged', this.onDataValue);
      await this.dataRx.startNotifications();
      this.hasDataChannel = true;
    } catch {
      // Older robot firmware has only the REPL characteristics.
      this.dataTx = null;
      this.hasDataChannel = false;
    }
  }

  private onGattDrop = () => {
    if (this.closing || this.retrying) return;
    this.replTx = null;
    this.dataTx = null;
    this.pendingData.clear();
    this.h.onDrop(true);
    void this.retry();
  };

  /** The robot reboots after STOP_MESSAGE, and radios hiccup: keep trying for a while. */
  private async retry(): Promise<void> {
    this.retrying = true;
    try {
      for (const wait of RETRY_DELAYS_MS) {
        await new Promise((r) => setTimeout(r, wait));
        if (this.closing) return;
        try {
          await this.attach();
          this.h.onRestore();
          return;
        } catch {
          try { this.device?.gatt?.disconnect(); } catch { /* not connected */ }
        }
      }
      if (!this.closing) this.h.onDrop(false);
    } finally {
      this.retrying = false;
    }
  }

  get connected(): boolean {
    return !!this.device?.gatt?.connected && !!this.replTx;
  }

  private enqueue(op: () => Promise<void>): Promise<void> {
    const job = this.gatt.then(op);
    this.gatt = job.catch(() => undefined);
    return job;
  }

  writeRepl(bytes: Uint8Array): Promise<void> {
    return this.enqueue(async () => {
      if (!this.replTx) throw new Error('Not connected');
      await this.replTx.writeValueWithResponse(bytes);
    });
  }

  /**
   * Queues one XPP frame (≤ DATA_WRITE_MAX bytes). Frames with the same key are
   * coalesced, so a slow link sends the newest joystick position instead of a backlog.
   */
  writeData(key: string, frame: Uint8Array): void {
    if (!this.dataTx) return;
    if (frame.length > DATA_WRITE_MAX) throw new Error(`XPP frame too long for the robot: ${frame.length} bytes`);
    this.pendingData.set(key, frame);
    if (this.dataPumping) return;
    this.dataPumping = true;
    void this.enqueue(async () => {
      // Write one batch, then step back into the queue so REPL commands (like Stop) are not starved.
      const batch = [...this.pendingData.values()];
      this.pendingData.clear();
      try {
        for (const f of batch) if (this.dataTx) await this.dataTx.writeValueWithResponse(f);
      } finally {
        this.dataPumping = false;
      }
    }).catch(() => {
      // A lost gamepad frame is harmless; the next one follows shortly.
    });
  }

  close(): void {
    this.closing = true;
    this.pendingData.clear();
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
