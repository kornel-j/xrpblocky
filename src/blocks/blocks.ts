import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as En from 'blockly/msg/en';
import * as Hu from 'blockly/msg/hu';
import { BLOCK_MSG } from '../i18n/blocks';
import type { Lang } from '../i18n/ui';

/** Category colours, Scratch 3 palette: [primary, secondary (shadows), tertiary (borders)]. */
export const COLORS = {
  ev: ['#FFBF00', '#FFE08A', '#CC9900'], mv: ['#4C97FF', '#A9CBFF', '#3373CC'], mo: ['#0FA3B1', '#86D6DD', '#0B7C87'],
  li: ['#9966FF', '#CDB6FF', '#774DCB'], so: ['#CF63CF', '#ECB4EC', '#A63FA6'], se: ['#36A9D9', '#A3D9F0', '#2384AE'],
  co: ['#FFAB19', '#FFD38C', '#CF8B17'], op: ['#59C059', '#ACE0AC', '#389438'], va: ['#FF8C1A', '#FFC48C', '#DB6E00']
} as const;

export function applyBlockMessages(lang: Lang): void {
  const base = (lang === 'hu' ? Hu : En) as unknown as Record<string, string>;
  Blockly.setLocale(base);
  Object.assign(Blockly.Msg, BLOCK_MSG[lang]);
}

export function createTheme(): Blockly.Theme {
  const blockStyles: Record<string, Partial<Blockly.Theme.BlockStyle>> = {};
  for (const [k, c] of Object.entries(COLORS)) {
    blockStyles[k] = { colourPrimary: c[0], colourSecondary: c[1], colourTertiary: c[2] };
  }
  blockStyles.ev.hat = 'cap';
  blockStyles.variable_blocks = blockStyles.va;
  blockStyles.math_blocks = blockStyles.op;
  blockStyles.text_blocks = blockStyles.op;
  return Blockly.Theme.defineTheme('xrpb', {
    name: 'xrpb',
    base: Blockly.Themes.Classic,
    blockStyles: blockStyles as Record<string, Blockly.Theme.BlockStyle>,
    componentStyles: { workspaceBackgroundColour: 'transparent', toolboxBackgroundColour: 'transparent', flyoutOpacity: 1, scrollbarOpacity: 0.6 },
    fontStyle: { family: 'Lexend, system-ui, sans-serif', weight: '500', size: 12 }
  });
}

const svgUri = (s: string) => 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
const IMG_FLAG = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H7" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M5 21V4" stroke="#7a5a00" stroke-width="2"/></svg>');
const IMG_BTN = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff"/><circle cx="12" cy="12" r="5" fill="#d99a00"/></svg>');
const IMG_EYE = svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="3" fill="#fff"/><circle cx="8" cy="12" r="3" fill="#d99a00"/><circle cx="16" cy="12" r="3" fill="#d99a00"/></svg>');

const dd = (name: string, keys: [string, string][]) => ({ type: 'field_dropdown', name, options: keys.map(([k, v]) => ['%{BKY_' + k + '}', v]) });
const num = (name: string) => ({ type: 'input_value', name, check: 'Number' });
const bool = (name: string) => ({ type: 'input_value', name, check: 'Boolean' });
const img = (src: string) => ({ type: 'field_image', src, width: 22, height: 22, alt: '*' });
const stmt = (o: object) => ({ previousStatement: null, nextStatement: null, inputsInline: true, ...o });
const DO = (name = 'DO') => [{ type: 'input_statement', name }];
const MOTORS: [string, string][] = [['XRP_O_L', 'left_motor'], ['XRP_O_R', 'right_motor'], ['XRP_O_M3', 'motor_three'], ['XRP_O_M4', 'motor_four']];

export const HAT_TYPES = ['xrp_when_start', 'xrp_when_button', 'xrp_when_near'];

let defined = false;
export function defineBlocks(): void {
  if (defined) return;
  defined = true;
  Blockly.common.defineBlocksWithJsonArray([
    { type: 'xrp_when_start', message0: '%{BKY_XRP_WHEN_START}', args0: [img(IMG_FLAG)], nextStatement: null, style: 'ev' },
    { type: 'xrp_when_button', message0: '%{BKY_XRP_WHEN_BUTTON}', args0: [img(IMG_BTN)], nextStatement: null, style: 'ev' },
    { type: 'xrp_when_near', message0: '%{BKY_XRP_WHEN_NEAR}', args0: [img(IMG_EYE), num('CM')], nextStatement: null, style: 'ev', inputsInline: true },

    stmt({ type: 'xrp_move', message0: '%{BKY_XRP_MOVE}', args0: [dd('DIR', [['XRP_O_FWD', 'FWD'], ['XRP_O_BACK', 'BACK']]), num('DIST')], style: 'mv' }),
    stmt({ type: 'xrp_turn', message0: '%{BKY_XRP_TURN}', args0: [dd('DIR', [['XRP_O_RIGHT', 'RIGHT'], ['XRP_O_LEFT', 'LEFT']]), num('DEG')], style: 'mv' }),
    stmt({ type: 'xrp_speed', message0: '%{BKY_XRP_SPEED}', args0: [num('PCT')], style: 'mv' }),
    stmt({ type: 'xrp_drive', message0: '%{BKY_XRP_DRIVE}', args0: [dd('DIR', [['XRP_O_FWD', 'FWD'], ['XRP_O_BACK', 'BACK']])], style: 'mv' }),
    stmt({ type: 'xrp_drive_lr', message0: '%{BKY_XRP_DRIVE_LR}', args0: [num('L'), num('R')], style: 'mv' }),
    stmt({ type: 'xrp_stop', message0: '%{BKY_XRP_STOP}', style: 'mv' }),

    stmt({ type: 'xrp_motor', message0: '%{BKY_XRP_MOTOR}', args0: [dd('M', MOTORS), num('PCT')], style: 'mo' }),
    stmt({ type: 'xrp_motor_stop', message0: '%{BKY_XRP_MOTOR_STOP}', args0: [dd('M', MOTORS)], style: 'mo' }),
    stmt({ type: 'xrp_servo', message0: '%{BKY_XRP_SERVO}', args0: [dd('S', [['XRP_O_S1', 'servo_one'], ['XRP_O_S2', 'servo_two']]), num('DEG')], style: 'mo' }),
    stmt({ type: 'xrp_reset_enc', message0: '%{BKY_XRP_RESET_ENC}', style: 'mo' }),
    { type: 'xrp_motor_pos', message0: '%{BKY_XRP_MOTOR_POS}', args0: [dd('M', MOTORS)], output: 'Number', style: 'mo' },

    stmt({ type: 'xrp_led_on', message0: '%{BKY_XRP_LED_ON}', style: 'li' }),
    stmt({ type: 'xrp_led_off', message0: '%{BKY_XRP_LED_OFF}', style: 'li' }),
    stmt({ type: 'xrp_led_blink', message0: '%{BKY_XRP_LED_BLINK}', args0: [num('HZ')], style: 'li' }),
    stmt({ type: 'xrp_led_color', message0: '%{BKY_XRP_LED_COLOR}', args0: [dd('C', [['XRP_O_RED', '255,0,0'], ['XRP_O_GREEN', '0,255,0'], ['XRP_O_BLUE', '0,0,255'], ['XRP_O_YELLOW', '255,180,0'], ['XRP_O_PURPLE', '160,0,255'], ['XRP_O_WHITE', '255,255,255']])], style: 'li' }),

    stmt({ type: 'xrp_note', message0: '%{BKY_XRP_NOTE}', args0: [
      { type: 'field_dropdown', name: 'N', options: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'].map((n) => [n, n]) },
      dd('D', [['XRP_O_QUARTER', 'quarter'], ['XRP_O_HALF', 'half'], ['XRP_O_WHOLE', 'whole'], ['XRP_O_EIGHTH', 'eighth']])], style: 'so' }),
    stmt({ type: 'xrp_song', message0: '%{BKY_XRP_SONG}', args0: [dd('S', [['XRP_O_BDAY', 'play_happy_birthday'], ['XRP_O_TWINKLE', 'play_twinkle_twinkle'], ['XRP_O_MOVEIT', 'play_move_it']])], style: 'so' }),

    { type: 'xrp_dist', message0: '%{BKY_XRP_DIST}', output: 'Number', style: 'se' },
    { type: 'xrp_line', message0: '%{BKY_XRP_LINE}', args0: [dd('S', [['XRP_O_L', 'get_left'], ['XRP_O_R', 'get_right']])], output: 'Number', style: 'se' },
    { type: 'xrp_button', message0: '%{BKY_XRP_BUTTON}', output: 'Boolean', style: 'se' },
    { type: 'xrp_imu', message0: '%{BKY_XRP_IMU}', args0: [dd('A', [['XRP_O_YAW', 'get_yaw'], ['XRP_O_PITCH', 'get_pitch'], ['XRP_O_ROLL', 'get_roll']])], output: 'Number', style: 'se' },
    stmt({ type: 'xrp_reset_yaw', message0: '%{BKY_XRP_RESET_YAW}', style: 'se' }),
    { type: 'xrp_volt', message0: '%{BKY_XRP_VOLT}', output: 'Number', style: 'se' },
    { type: 'xrp_timer', message0: '%{BKY_XRP_TIMER}', output: 'Number', style: 'se' },
    stmt({ type: 'xrp_reset_timer', message0: '%{BKY_XRP_RESET_TIMER}', style: 'se' }),

    stmt({ type: 'xrp_wait', message0: '%{BKY_XRP_WAIT}', args0: [num('S')], style: 'co' }),
    stmt({ type: 'xrp_repeat', message0: '%{BKY_XRP_REPEAT}', args0: [num('N')], message1: '%1', args1: DO(), style: 'co' }),
    { type: 'xrp_forever', message0: '%{BKY_XRP_FOREVER}', message1: '%1', args1: DO(), previousStatement: null, style: 'co' },
    stmt({ type: 'xrp_if', message0: '%{BKY_XRP_IF}', args0: [bool('C')], message1: '%1', args1: DO(), style: 'co' }),
    stmt({ type: 'xrp_ifelse', message0: '%{BKY_XRP_IF}', args0: [bool('C')], message1: '%1', args1: DO(),
      message2: '%{BKY_XRP_ELSE}', message3: '%1', args3: DO('ELSE'), style: 'co' }),
    stmt({ type: 'xrp_wait_until', message0: '%{BKY_XRP_WAIT_UNTIL}', args0: [bool('C')], style: 'co' }),
    stmt({ type: 'xrp_repeat_until', message0: '%{BKY_XRP_REPEAT_UNTIL}', args0: [bool('C')], message1: '%1', args1: DO(), style: 'co' }),
    stmt({ type: 'xrp_print', message0: '%{BKY_XRP_PRINT}', args0: [{ type: 'input_value', name: 'V' }], style: 'co' }),
    { type: 'xrp_end', message0: '%{BKY_XRP_END}', previousStatement: null, style: 'co' },

    { type: 'xrp_arith', message0: '%1 %2 %3', args0: [num('A'), { type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/']] }, num('B')], output: 'Number', inputsInline: true, style: 'op' },
    { type: 'xrp_compare', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, { type: 'field_dropdown', name: 'OP', options: [['<', '<'], ['=', '=='], ['>', '>']] }, { type: 'input_value', name: 'B' }], output: 'Boolean', inputsInline: true, style: 'op' },
    { type: 'xrp_and', message0: '%{BKY_XRP_AND}', args0: [bool('A'), bool('B')], output: 'Boolean', inputsInline: true, style: 'op' },
    { type: 'xrp_or', message0: '%{BKY_XRP_OR}', args0: [bool('A'), bool('B')], output: 'Boolean', inputsInline: true, style: 'op' },
    { type: 'xrp_not', message0: '%{BKY_XRP_NOT}', args0: [bool('A')], output: 'Boolean', inputsInline: true, style: 'op' },
    { type: 'xrp_random', message0: '%{BKY_XRP_RANDOM}', args0: [num('A'), num('B')], output: 'Number', inputsInline: true, style: 'op' },
    { type: 'xrp_round', message0: '%{BKY_XRP_ROUND}', args0: [num('A')], output: 'Number', inputsInline: true, style: 'op' }
  ]);
}

const sh = (n: number) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const blk = (type: string, inputs?: object) => (inputs ? { kind: 'block', type, inputs } : { kind: 'block', type });
const cat = (k: string, colour: string, contents: object[]) => ({ kind: 'category', name: '%{BKY_' + k + '}', colour, contents });

export function toolbox(): Blockly.utils.toolbox.ToolboxDefinition {
  return { kind: 'categoryToolbox', contents: [
    cat('XRP_CAT_EVENTS', COLORS.ev[0], [blk('xrp_when_start'), blk('xrp_when_button'), blk('xrp_when_near', { CM: sh(15) })]),
    cat('XRP_CAT_MOVE', COLORS.mv[0], [blk('xrp_move', { DIST: sh(20) }), blk('xrp_turn', { DEG: sh(90) }), blk('xrp_speed', { PCT: sh(50) }),
      blk('xrp_drive'), blk('xrp_drive_lr', { L: sh(50), R: sh(50) }), blk('xrp_stop')]),
    cat('XRP_CAT_MOTORS', COLORS.mo[0], [blk('xrp_motor', { PCT: sh(50) }), blk('xrp_motor_stop'), blk('xrp_servo', { DEG: sh(90) }), blk('xrp_reset_enc'), blk('xrp_motor_pos')]),
    cat('XRP_CAT_LIGHT', COLORS.li[0], [blk('xrp_led_on'), blk('xrp_led_off'), blk('xrp_led_blink', { HZ: sh(2) }), blk('xrp_led_color')]),
    cat('XRP_CAT_SOUND', COLORS.so[0], [blk('xrp_note'), blk('xrp_song')]),
    cat('XRP_CAT_SENSORS', COLORS.se[0], [blk('xrp_dist'), blk('xrp_line'), blk('xrp_button'), blk('xrp_imu'), blk('xrp_reset_yaw'), blk('xrp_volt'), blk('xrp_timer'), blk('xrp_reset_timer')]),
    cat('XRP_CAT_CONTROL', COLORS.co[0], [blk('xrp_wait', { S: sh(1) }), blk('xrp_repeat', { N: sh(10) }), blk('xrp_forever'), blk('xrp_if'), blk('xrp_ifelse'),
      blk('xrp_wait_until'), blk('xrp_repeat_until'), blk('xrp_print', { V: { shadow: { type: 'text', fields: { TEXT: Blockly.Msg.XRP_HELLO } } } }), blk('xrp_end')]),
    cat('XRP_CAT_OPS', COLORS.op[0], [blk('xrp_arith', { A: sh(1), B: sh(1) }), blk('xrp_compare', { A: sh(0), B: sh(50) }), blk('xrp_and'), blk('xrp_or'), blk('xrp_not'),
      blk('xrp_random', { A: sh(1), B: sh(10) }), blk('xrp_round', { A: sh(3.6) })]),
    { kind: 'category', name: '%{BKY_XRP_CAT_VARS}', colour: COLORS.va[0], custom: 'VARIABLE' }
  ] } as Blockly.utils.toolbox.ToolboxDefinition;
}

/** Scratch-style category rows: a coloured dot above the label. */
class XrpCategory extends Blockly.ToolboxCategory {
  protected override addColourBorder_(colour: string) {
    this.rowDiv_?.style.setProperty('--cat', colour);
  }
  protected override createIconDom_(): Element {
    const d = document.createElement('span');
    d.className = 'catDot';
    return d;
  }
  override setSelected(sel: boolean) {
    super.setSelected(sel);
    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = '';
      this.rowDiv_.classList.toggle('isSel', sel);
    }
  }
}

export function registerCategory(): void {
  Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, Blockly.ToolboxCategory.registrationName, XrpCategory, true);
}

const N = (n: number) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

/** First-run example program. */
export const SAMPLE = { blocks: { languageVersion: 0, blocks: [
  { type: 'xrp_when_start', x: 30, y: 30, next: { block: {
    type: 'xrp_speed', inputs: { PCT: N(60) }, next: { block: {
      type: 'xrp_repeat', inputs: { N: N(4), DO: { block: {
        type: 'xrp_move', fields: { DIR: 'FWD' }, inputs: { DIST: N(30) }, next: { block: {
          type: 'xrp_turn', fields: { DIR: 'RIGHT' }, inputs: { DEG: N(90) } } } } } },
      next: { block: { type: 'xrp_led_color', fields: { C: '0,255,0' } } } } } } } },
  { type: 'xrp_when_near', x: 470, y: 30, inputs: { CM: N(15) }, next: { block: {
    type: 'xrp_stop', next: { block: { type: 'xrp_led_color', fields: { C: '255,0,0' } } } } } }
] } };
