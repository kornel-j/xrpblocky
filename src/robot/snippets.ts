/** MicroPython snippets the app runs on the robot. */

export const SLOT_DIR = '/slots';
export const slotPath = (slot: number) => `${SLOT_DIR}/slot${slot}.py`;

/**
 * Starts XRPLib's dashboard (XPP sensor stream) when a Bluetooth app is connected.
 * Without a BLE connection XPP would fall back to USB stdio and disable Ctrl-C, so it stays off.
 */
export const TELEMETRY_FN = `def _xrpb_telemetry(rate=5):
    try:
        from ble.blerepl import uart
        if uart is None or len(uart._connections) == 0:
            return False
        from XRPLib.dashboard import Dashboard
        Dashboard.get_default_dashboard().start(rate)
        return True
    except Exception:
        return False
`;

export const TELEMETRY_START = TELEMETRY_FN + 'print(_xrpb_telemetry())\n';

/** Prints one line: XRPB|machine|xrplib version|battery V|has dashboard|unique id|free bytes|total bytes|slot names */
export const INFO = `import sys, os, machine
_v = '?'
try:
    with open('/lib/XRPLib/version.py') as _f:
        for _l in _f:
            if '__version__' in _l:
                _v = _l.split("'")[1]
except Exception:
    pass
try:
    from XRPLib.board import Board
    _b = Board.get_default_board().get_battery_voltage()
except Exception:
    _b = -1
try:
    import XRPLib.dashboard
    _d = 1
except Exception:
    _d = 0
_s = []
try:
    for _n in os.listdir('${SLOT_DIR}'):
        if _n.startswith('slot') and _n.endswith('.py'):
            with open('${SLOT_DIR}/' + _n) as _f:
                _s.append(_n[4:-3] + ':' + _f.readline()[2:].strip().split(' \\xb7 ')[0])
except Exception:
    pass
try:
    _fs = os.statvfs('/')
    _free, _total = _fs[0] * _fs[3], _fs[0] * _fs[2]
except Exception:
    _free, _total = -1, -1
print('XRPB|%s|%s|%.3f|%d|%s|%d|%d|%s' % (sys.implementation._machine, _v, _b, _d, ''.join('{:02x}'.format(x) for x in machine.unique_id()), _free, _total, ';'.join(_s)))
`;

export const VOLTAGE = `from XRPLib.board import Board
print('%.3f' % Board.get_default_board().get_battery_voltage())
`;

const RESET = `import sys
if 'XRPLib.resetbot' in sys.modules:
    del sys.modules['XRPLib.resetbot']
from XRPLib.resetbot import reset_hard
reset_hard()
`;
export const RESET_ROBOT = RESET;

/** Frees memory from the previous run, the same way XRPCode does before running. */
const CLEANUP = `import sys, gc
for _m in list(sys.modules.keys()):
    if _m not in ('ble.blerepl', 'ble', 'ble.ble_uart_peripheral') and 'XRPLib' not in _m:
        del sys.modules[_m]
gc.collect()
`;

/** Runs a saved slot now, from the app. */
export function runSlot(slot: number): string {
  const path = slotPath(slot);
  // SystemExit ("end program" block) must not reach the raw REPL: it would soft-reset the robot.
  return CLEANUP + `try:
    exec(compile(open('${path}').read(), 'slot${slot}.py', 'exec'), {'__name__': '__main__'})
except SystemExit:
    pass
finally:
    if 'XRPLib.resetbot' in sys.modules:
        del sys.modules['XRPLib.resetbot']
    import XRPLib.resetbot
`;
}

/**
 * /main.py: works without a computer. After power-on the LED blinks the selected
 * slot number (slot 0 = one long blink), then stays lit while waiting:
 *   short press  → run the program in that slot
 *   long press   → step to the next saved slot (≥ 0.8 s)
 * When the program ends the robot goes back to waiting, so it can be run again.
 * Bluetooth stays up the whole time; the app interrupts the wait with Ctrl-C.
 * After ##XRPSTOP## it skips everything so the app gets a free REPL (same flag file XRPCode uses).
 */
export function mainRunner(slot: number): string {
  return `# XRP Blocky
import os, sys, time
_x = os.dupterm(None, 0)
if _x is None:
    import ble.blerepl
else:
    os.dupterm(_x, 0)
_skip = False
try:
    with open('/lib/ble/isrunning', 'r+b') as _f:
        if _f.read(1) == b'\\x01':
            _f.seek(0)
            _f.write(b'\\x00')
            _skip = True
except OSError:
    pass

def _saved():
    try:
        return sorted(int(n[4:-3]) for n in os.listdir('${SLOT_DIR}') if n.startswith('slot') and n.endswith('.py'))
    except Exception:
        return []

def _show(b, n):
    b.led_off()
    time.sleep(0.4)
    if n == 0:
        b.led_on()
        time.sleep(0.8)
        b.led_off()
    for _ in range(n):
        b.led_on()
        time.sleep(0.15)
        b.led_off()
        time.sleep(0.25)
    time.sleep(0.3)
    b.led_on()

def _wait_press(b):
    while not b.is_button_pressed():
        time.sleep(0.01)
    t0 = time.ticks_ms()
    while b.is_button_pressed():
        time.sleep(0.01)
    return time.ticks_diff(time.ticks_ms(), t0)

if not _skip:
    from XRPLib.board import Board
    _board = Board.get_default_board()
    _all = _saved()
    _cur = ${slot} if ${slot} in _all else (_all[0] if _all else None)
    while _cur is not None:
        _show(_board, _cur)
        while _wait_press(_board) >= 800 and len(_all) > 1:
            _cur = _all[(_all.index(_cur) + 1) % len(_all)]
            _show(_board, _cur)
        _board.led_off()
        try:
            exec(compile(open('${SLOT_DIR}/slot%d.py' % _cur).read(), 'slot%d.py' % _cur, 'exec'), {'__name__': '__main__'})
        except SystemExit:
            pass
        except Exception as _e:
            sys.print_exception(_e)
        finally:
            if 'XRPLib.resetbot' in sys.modules:
                del sys.modules['XRPLib.resetbot']
            import XRPLib.resetbot
        time.sleep(0.5)
`;
}

/**
 * Drive mode: tank mix from the app's on-screen joystick (XRPLib gamepad over XPP). Stick
 * right always turns right, also when reversing (drivetrain.arcade flips the turn when
 * reversing, which made left and right swap around the centre).
 * The app sends a heartbeat in $gamepad.x2; if it stops changing for 0.7 s (link lost,
 * tab closed) the robot stops instead of driving on with the last stick position.
 */
export const DRIVE_PROGRAM = `from XRPLib.defaults import *
from XRPLib.gamepad import Gamepad
import time
${TELEMETRY_FN}_xrpb_telemetry()
_gp = Gamepad.get_default_gamepad()
_DEAD = 0.08
def _dz(v):
    # Ignore tiny stick movements around the centre, then rescale to the full range.
    if abs(v) < _DEAD:
        return 0.0
    return (v - _DEAD if v > 0 else v + _DEAD) / (1 - _DEAD)
_horn = False
_beat = None
_beat_at = time.ticks_ms()
while True:
    _b = _gp.get_value(Gamepad.X2)
    if _b != _beat:
        _beat = _b
        _beat_at = time.ticks_ms()
    if time.ticks_diff(time.ticks_ms(), _beat_at) > 700:
        drivetrain.stop()
    else:
        _fwd = _dz(_gp.get_value(Gamepad.Y1))
        _right = _dz(-_gp.get_value(Gamepad.X1))
        _l = _fwd + _right
        _r = _fwd - _right
        _m = max(1, abs(_l), abs(_r))
        drivetrain.set_effort(_l / _m, _r / _m)
    _a = _gp.is_button_pressed(Gamepad.BUTTON_A)
    if _a and not _horn:
        try:
            buzzer.play_note('C5', 'eighth', blocking=False)
        except Exception:
            pass
    _horn = _a
    if _gp.is_button_pressed(Gamepad.BUTTON_B):
        board.led_on()
    else:
        board.led_off()
    time.sleep(0.02)
`;

export function identify(rgb: [number, number, number]): string {
  return `from XRPLib.board import Board
import time
_b = Board.get_default_board()
for _i in range(6):
    try:
        _b.set_rgb_led(${rgb.join(', ')}) if _i % 2 == 0 else _b.set_rgb_led(0, 0, 0)
    except Exception:
        _b.led_on() if _i % 2 == 0 else _b.led_off()
    time.sleep(0.25)
try:
    _b.set_rgb_led(${rgb.join(', ')})
except Exception:
    _b.led_off()
`;
}
