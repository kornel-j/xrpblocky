import type { Lang } from './ui';

/** Block and toolbox texts, used as %{BKY_...} references. */
export const BLOCK_MSG: Record<Lang, Record<string, string>> = {
  hu: {
    XRP_CAT_EVENTS: 'Események', XRP_CAT_MOVE: 'Mozgás', XRP_CAT_MOTORS: 'Motorok', XRP_CAT_LIGHT: 'Fény', XRP_CAT_SOUND: 'Hang',
    XRP_CAT_SENSORS: 'Érzékelők', XRP_CAT_CONTROL: 'Vezérlés', XRP_CAT_OPS: 'Műveletek', XRP_CAT_VARS: 'Változók',
    XRP_WHEN_START: '%1 amikor a program elindul', XRP_WHEN_BUTTON: '%1 amikor megnyomják a gombot', XRP_WHEN_NEAR: '%1 amikor a távolság < %2 cm',
    XRP_MOVE: 'menj %1 %2 cm-t', XRP_TURN: 'fordulj %1 %2 fokot', XRP_SPEED: 'sebesség legyen %1 %', XRP_DRIVE: 'indulj el %1',
    XRP_DRIVE_LR: 'vezess: bal %1 % jobb %2 %', XRP_STOP: 'állj meg',
    XRP_MOTOR: '%1 motor ereje %2 %', XRP_MOTOR_STOP: '%1 motor álljon meg', XRP_SERVO: '%1 szervó %2 fokra', XRP_RESET_ENC: 'kerékszámlálók nullázása',
    XRP_MOTOR_POS: '%1 motor helyzete (fok)',
    XRP_LED_ON: 'LED bekapcsolása', XRP_LED_OFF: 'LED kikapcsolása', XRP_LED_BLINK: 'LED villogjon %1 Hz-cel', XRP_LED_COLOR: 'LED színe %1',
    XRP_NOTE: 'szólaltasd meg: %1 %2', XRP_SONG: 'játszd le: %1',
    XRP_DIST: 'távolság (cm)', XRP_LINE: '%1 vonalérzékelő', XRP_BUTTON: 'gomb lenyomva?', XRP_IMU: '%1 (fok)', XRP_RESET_YAW: 'irány nullázása',
    XRP_VOLT: 'akkufeszültség (V)', XRP_TIMER: 'időzítő (mp)', XRP_RESET_TIMER: 'időzítő nullázása',
    XRP_WAIT: 'várj %1 mp-et', XRP_REPEAT: 'ismételd %1 -szer', XRP_FOREVER: 'ismételd mindig', XRP_IF: 'ha %1 akkor', XRP_ELSE: 'különben',
    XRP_WAIT_UNTIL: 'várj, amíg %1', XRP_REPEAT_UNTIL: 'ismételd, amíg nem %1', XRP_PRINT: 'írd ki: %1', XRP_END: 'program vége',
    XRP_RANDOM: 'véletlen szám %1 és %2 között', XRP_AND: '%1 és %2', XRP_OR: '%1 vagy %2', XRP_NOT: 'nem %1', XRP_ROUND: '%1 kerekítve',
    XRP_O_FWD: 'előre', XRP_O_BACK: 'hátra', XRP_O_RIGHT: 'jobbra', XRP_O_LEFT: 'balra', XRP_O_L: 'bal', XRP_O_R: 'jobb', XRP_O_M3: '3.', XRP_O_M4: '4.',
    XRP_O_S1: '1.', XRP_O_S2: '2.', XRP_O_YAW: 'irány', XRP_O_PITCH: 'bólintás', XRP_O_ROLL: 'dőlés',
    XRP_O_RED: 'piros', XRP_O_GREEN: 'zöld', XRP_O_BLUE: 'kék', XRP_O_YELLOW: 'sárga', XRP_O_PURPLE: 'lila', XRP_O_WHITE: 'fehér',
    XRP_O_WHOLE: 'egész', XRP_O_HALF: 'fél', XRP_O_QUARTER: 'negyed', XRP_O_EIGHTH: 'nyolcad',
    XRP_O_BDAY: 'Boldog szülinapot', XRP_O_TWINKLE: 'Twinkle Twinkle', XRP_O_MOVEIT: 'Move it',
    XRP_HELLO: 'Szia!', XRP_EVENT_LOOP: 'eseményfigyelés'
  },
  en: {
    XRP_CAT_EVENTS: 'Events', XRP_CAT_MOVE: 'Movement', XRP_CAT_MOTORS: 'Motors', XRP_CAT_LIGHT: 'Light', XRP_CAT_SOUND: 'Sound',
    XRP_CAT_SENSORS: 'Sensors', XRP_CAT_CONTROL: 'Control', XRP_CAT_OPS: 'Operators', XRP_CAT_VARS: 'Variables',
    XRP_WHEN_START: '%1 when program starts', XRP_WHEN_BUTTON: '%1 when button is pressed', XRP_WHEN_NEAR: '%1 when distance < %2 cm',
    XRP_MOVE: 'move %1 %2 cm', XRP_TURN: 'turn %1 %2 degrees', XRP_SPEED: 'set speed to %1 %', XRP_DRIVE: 'start moving %1',
    XRP_DRIVE_LR: 'drive: left %1 % right %2 %', XRP_STOP: 'stop moving',
    XRP_MOTOR: '%1 motor power %2 %', XRP_MOTOR_STOP: 'stop %1 motor', XRP_SERVO: 'servo %1 to %2 degrees', XRP_RESET_ENC: 'reset wheel counters',
    XRP_MOTOR_POS: '%1 motor position (deg)',
    XRP_LED_ON: 'turn LED on', XRP_LED_OFF: 'turn LED off', XRP_LED_BLINK: 'blink LED at %1 Hz', XRP_LED_COLOR: 'set LED colour %1',
    XRP_NOTE: 'play note %1 %2', XRP_SONG: 'play song %1',
    XRP_DIST: 'distance (cm)', XRP_LINE: '%1 line sensor', XRP_BUTTON: 'button pressed?', XRP_IMU: '%1 (deg)', XRP_RESET_YAW: 'reset heading',
    XRP_VOLT: 'battery voltage (V)', XRP_TIMER: 'timer (s)', XRP_RESET_TIMER: 'reset timer',
    XRP_WAIT: 'wait %1 seconds', XRP_REPEAT: 'repeat %1 times', XRP_FOREVER: 'forever', XRP_IF: 'if %1 then', XRP_ELSE: 'else',
    XRP_WAIT_UNTIL: 'wait until %1', XRP_REPEAT_UNTIL: 'repeat until %1', XRP_PRINT: 'print %1', XRP_END: 'end program',
    XRP_RANDOM: 'pick random %1 to %2', XRP_AND: '%1 and %2', XRP_OR: '%1 or %2', XRP_NOT: 'not %1', XRP_ROUND: 'round %1',
    XRP_O_FWD: 'forward', XRP_O_BACK: 'backward', XRP_O_RIGHT: 'right', XRP_O_LEFT: 'left', XRP_O_L: 'left', XRP_O_R: 'right', XRP_O_M3: '3rd', XRP_O_M4: '4th',
    XRP_O_S1: '1', XRP_O_S2: '2', XRP_O_YAW: 'yaw', XRP_O_PITCH: 'pitch', XRP_O_ROLL: 'roll',
    XRP_O_RED: 'red', XRP_O_GREEN: 'green', XRP_O_BLUE: 'blue', XRP_O_YELLOW: 'yellow', XRP_O_PURPLE: 'purple', XRP_O_WHITE: 'white',
    XRP_O_WHOLE: 'whole', XRP_O_HALF: 'half', XRP_O_QUARTER: 'quarter', XRP_O_EIGHTH: 'eighth',
    XRP_O_BDAY: 'Happy Birthday', XRP_O_TWINKLE: 'Twinkle Twinkle', XRP_O_MOVEIT: 'Move it',
    XRP_HELLO: 'Hello!', XRP_EVENT_LOOP: 'event loop'
  }
};
