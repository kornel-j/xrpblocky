import * as Blockly from 'blockly/core';
import { pythonGenerator as gen, Order as O } from 'blockly/python';
import { TELEMETRY_FN } from '../robot/snippets';

gen.INDENT = '    ';

const V = (b: Blockly.Block, name: string, order = O.NONE, dflt = '0') => gen.valueToCode(b, name, order) || dflt;
const S = (b: Blockly.Block, name: string) => gen.statementToCode(b, name) || gen.INDENT + 'pass\n';
const F = gen.forBlock;
type G = Parameters<(typeof F)[string]>;
const def = (type: string, fn: (b: G[0]) => string | [string, number]) => { F[type] = fn; };

def('xrp_when_start', () => '');
def('xrp_when_button', () => '');
def('xrp_when_near', () => '');

def('xrp_move', (b) => `drivetrain.straight(${b.getFieldValue('DIR') === 'BACK' ? '-' : ''}${V(b, 'DIST', O.UNARY_SIGN)}, _speed)\n`);
def('xrp_turn', (b) => `drivetrain.turn(${b.getFieldValue('DIR') === 'RIGHT' ? '-' : ''}${V(b, 'DEG', O.UNARY_SIGN)}, _speed)\n`);
def('xrp_speed', (b) => `_speed = max(0, min(100, ${V(b, 'PCT')})) / 100\n`);
def('xrp_drive', (b) => (b.getFieldValue('DIR') === 'BACK' ? 'drivetrain.set_effort(-_speed, -_speed)\n' : 'drivetrain.set_effort(_speed, _speed)\n'));
def('xrp_drive_lr', (b) => `drivetrain.set_effort(${V(b, 'L', O.MULTIPLICATIVE)} / 100, ${V(b, 'R', O.MULTIPLICATIVE)} / 100)\n`);
def('xrp_stop', () => 'drivetrain.stop()\n');

def('xrp_motor', (b) => `${b.getFieldValue('M')}.set_effort(${V(b, 'PCT', O.MULTIPLICATIVE)} / 100)\n`);
def('xrp_motor_stop', (b) => `${b.getFieldValue('M')}.set_effort(0)\n`);
def('xrp_servo', (b) => `${b.getFieldValue('S')}.set_angle(${V(b, 'DEG')})\n`);
def('xrp_reset_enc', () => 'drivetrain.reset_encoder_position()\n');
def('xrp_motor_pos', (b) => [`${b.getFieldValue('M')}.get_position() * 360`, O.MULTIPLICATIVE]);

def('xrp_led_on', () => 'board.led_on()\n');
def('xrp_led_off', () => 'board.led_off()\n');
def('xrp_led_blink', (b) => `board.led_blink(${V(b, 'HZ')})\n`);
def('xrp_led_color', (b) => `_rgb(${b.getFieldValue('C')})\n`);

def('xrp_note', (b) => `buzzer.play_note("${b.getFieldValue('N')}", "${b.getFieldValue('D')}")\n`);
def('xrp_song', (b) => `buzzer.${b.getFieldValue('S')}()\n`);

def('xrp_dist', () => ['rangefinder.distance()', O.FUNCTION_CALL]);
def('xrp_line', (b) => [`reflectance.${b.getFieldValue('S')}()`, O.FUNCTION_CALL]);
def('xrp_button', () => ['board.is_button_pressed()', O.FUNCTION_CALL]);
def('xrp_imu', (b) => [`imu.${b.getFieldValue('A')}()`, O.FUNCTION_CALL]);
def('xrp_reset_yaw', () => 'imu.reset_yaw()\n');
def('xrp_volt', () => ['board.get_battery_voltage()', O.FUNCTION_CALL]);
def('xrp_timer', () => ['time.ticks_diff(time.ticks_ms(), _t0) / 1000', O.MULTIPLICATIVE]);
def('xrp_reset_timer', () => '_t0 = time.ticks_ms()\n');

def('xrp_wait', (b) => `time.sleep(${V(b, 'S')})\n`);
def('xrp_repeat', (b) => `for _ in range(int(${V(b, 'N')})):\n${S(b, 'DO')}`);
def('xrp_forever', (b) => `while True:\n${S(b, 'DO')}`);
def('xrp_if', (b) => `if ${V(b, 'C', O.NONE, 'False')}:\n${S(b, 'DO')}`);
def('xrp_ifelse', (b) => `if ${V(b, 'C', O.NONE, 'False')}:\n${S(b, 'DO')}else:\n${S(b, 'ELSE')}`);
def('xrp_wait_until', (b) => `while not (${V(b, 'C', O.NONE, 'False')}):\n${gen.INDENT}time.sleep(0.01)\n`);
def('xrp_repeat_until', (b) => `while not (${V(b, 'C', O.NONE, 'False')}):\n${S(b, 'DO')}`);
def('xrp_print', (b) => `print(${V(b, 'V', O.NONE, '""')})\n`);
def('xrp_end', () => 'raise SystemExit\n');

def('xrp_arith', (b) => {
  const op = b.getFieldValue('OP');
  const o = op === '+' || op === '-' ? O.ADDITIVE : O.MULTIPLICATIVE;
  return [`${V(b, 'A', o)} ${op} ${V(b, 'B', o)}`, o];
});
def('xrp_compare', (b) => [`${V(b, 'A', O.RELATIONAL)} ${b.getFieldValue('OP')} ${V(b, 'B', O.RELATIONAL)}`, O.RELATIONAL]);
def('xrp_and', (b) => [`${V(b, 'A', O.LOGICAL_AND, 'False')} and ${V(b, 'B', O.LOGICAL_AND, 'False')}`, O.LOGICAL_AND]);
def('xrp_or', (b) => [`${V(b, 'A', O.LOGICAL_OR, 'False')} or ${V(b, 'B', O.LOGICAL_OR, 'False')}`, O.LOGICAL_OR]);
def('xrp_not', (b) => [`not ${V(b, 'A', O.LOGICAL_NOT, 'False')}`, O.LOGICAL_NOT]);
def('xrp_random', (b) => [`random.randint(int(${V(b, 'A')}), int(${V(b, 'B')}))`, O.FUNCTION_CALL]);
def('xrp_round', (b) => [`round(${V(b, 'A')})`, O.FUNCTION_CALL]);

/** Shims so programs also run on boards without a buzzer or an RGB LED. */
const PRELUDE = `from XRPLib.defaults import *
import time
import random

try:
    buzzer
except NameError:
    class _NoBuzzer:
        def __getattr__(self, name):
            return lambda *a, **k: None
    buzzer = _NoBuzzer()

def _rgb(r, g, b):
    try:
        board.set_rgb_led(r, g, b)
    except Exception:
        board.led_on() if (r or g or b) else board.led_off()

${TELEMETRY_FN}_xrpb_telemetry()

_speed = 0.5
_t0 = time.ticks_ms()
`;

/**
 * Builds the robot program. Event hats become functions: every "when program starts"
 * stack runs in order, then one loop polls the button / distance events (edge-triggered).
 */
export function toPython(ws: Blockly.Workspace, projectName: string, eventLoopLabel = 'event loop'): string {
  gen.init(ws);
  const globals = ['_speed', '_t0'].concat(ws.getAllVariables().map((v) => gen.getVariableName(v.getId())));
  const fns: string[] = [];
  const starts: string[] = [];
  const events: { name: string; cond: string }[] = [];
  const count: Record<string, number> = { start: 0, button: 0, near: 0 };

  for (const b of ws.getTopBlocks(true)) {
    const kind = b.type === 'xrp_when_start' ? 'start' : b.type === 'xrp_when_button' ? 'button' : b.type === 'xrp_when_near' ? 'near' : null;
    if (!kind || !b.isEnabled()) continue;
    const name = `on_${kind}_${++count[kind]}`;
    const next = b.getNextBlock();
    let body = next ? gen.blockToCode(next) : '';
    if (Array.isArray(body)) body = body[0];
    body = gen.INDENT + 'global ' + globals.join(', ') + '\n' + (body ? gen.prefixLines(body, gen.INDENT) : gen.INDENT + 'pass\n');
    fns.push(`def ${name}():\n${body}`);
    if (kind === 'start') starts.push(name);
    else if (kind === 'button') events.push({ name, cond: 'board.is_button_pressed()' });
    else events.push({ name, cond: `rangefinder.distance() < ${V(b, 'CM', O.RELATIONAL, '15')}` });
  }

  const defs = gen.finish('').trim();
  const title = projectName.replace(/[\r\n]/g, ' ').trim() || 'XRP';
  let out = `# ${title} · XRP Blocky\n` + PRELUDE;
  if (defs) out += defs + '\n';
  out += '\n' + fns.join('\n') + (fns.length ? '\n' : '');
  out += starts.map((s) => s + '()\n').join('');
  if (events.length) {
    const I = gen.INDENT;
    out += `\n# ${eventLoopLabel}\n`;
    out += events.map((_, i) => `_prev${i} = False\n`).join('');
    out += 'while True:\n';
    events.forEach((e, i) => {
      out += `${I}_now = ${e.cond}\n${I}if _now and not _prev${i}:\n${I}${I}${e.name}()\n${I}_prev${i} = _now\n`;
    });
    out += `${I}time.sleep(0.02)\n`;
  }
  return out;
}
