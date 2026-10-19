export type Lang = 'hu' | 'en';

const hu = {
  projectName: 'Projekt neve', saved: 'Mentve ezen az eszközön', slot: 'Hely', run: 'Indítás', stop: 'Leállítás',
  connect: 'Csatlakozás', dash: 'Műszerfal', py: 'Python', drive: 'Vezetés', panel: 'Panel',
  zoomIn: 'Nagyítás', zoomOut: 'Kicsinyítés', undo: 'Visszavonás', redo: 'Újra',
  demoChip: 'Demó robot · a szenzorértékek szimuláltak',
  battery: 'Akkumulátor', alk: 'Alkáli', nimh: 'NiMH', batOk: 'Jó', batLow: 'Cseréld hamarosan', batBad: 'Lemerült',
  distance: 'Távolság', line: 'Vonalérzékelők', left: 'Bal', right: 'Jobb',
  imu: 'Helyzet (IMU)', yaw: 'Irány', pitch: 'Bólintás', roll: 'Dőlés', motors: 'Kerekek és motorok', motor: 'Motor', pos: 'Helyzet',
  m3: '3.', m4: '4.', live: 'Élő adat · XPP', stale: 'Nincs friss adat', noDash: 'Ez a robot csak az akkut jelenti. Frissítsd az XRPLib-et az XRPCode-dal, és minden szenzor megjelenik.',
  offline: 'Csatlakoztasd a robotot, és itt látod élőben az érzékelőket és az akkut.',
  console: 'Konzol', clear: 'Törlés', copy: 'Másolás', copied: 'Kimásolva', lines: 'sor MicroPython · XRPLib',
  pyNote: 'Ez a kód kerül fel a robotra. A blokkokból készül, és mindig frissül, ahogy építesz.',
  driveNote: 'A Vezetés indítása gomb egy kis vezetőprogramot indít a roboton. Utána húzd a kart.',
  driveStart: 'Vezetés indítása', driveStop: 'Vezetés vége',
  leftWheel: 'Bal kerék', rightWheel: 'Jobb kerék', horn: 'Duda', light: 'Lámpa',
  cTitle: 'Robot csatlakoztatása', cStep1: 'Kapcsold be a robotot.',
  cStep2: 'Nyomd meg a <b>Robot keresése</b> gombot. A böngésző saját ablakában válaszd ki a robotod nevét, és nyomd meg a <b>Párosítás</b> gombot.',
  cStep3: 'A robot neve XRP- kezdetű, például <b>XRP-7A3F</b>.',
  cSupport: '<b>Működik:</b> Chrome és Edge Macen, Windowson, Chromebookon és Androidon. <b>iPaden</b> egyelőre a Bluefy böngészővel.',
  noBt: 'Ez a böngésző nem tud Bluetooth-ot. Nyisd meg Chrome-ban vagy Edge-ben, iPaden a Bluefy böngészőben. Addig a demó robottal próbálhatod ki.',
  search: 'Robot keresése', demo: 'Demó robot', cancel: 'Mégse',
  connecting: 'Csatlakozás…', connectingSub: 'Kapcsolat felépítése és a robot adatainak beolvasása',
  connectFail: 'Nem sikerült csatlakozni: {e}. Kapcsold ki-be a robotot, és próbáld újra.',
  nameTitle: 'Melyik a te robotod?', nameSub: 'A robot LED-je most ebben a színben villog. Adj neki nevet és színt, így az osztályban könnyű megtalálni.',
  robotName: 'Robot neve', color: 'Szín', done: 'Kész', identify: 'Villogtasd meg',
  board: 'Kártya', fw: 'XRPLib', link: 'Kapcsolat', disconnect: 'Leválasztás',
  slotTitle: 'Programhely kiválasztása', slotSub: 'Az Indítás ide menti a programot. Bekapcsolás után a robot gombjával is elindíthatod a legutóbb feltöltöttet.',
  empty: 'üres', running: 'Fut a(z) {n}. helyen', stopped: 'Program leállítva', uploading: 'Feltöltés a(z) {n}. helyre…',
  needRobot: 'Előbb csatlakoztass egy robotot.', connectedTo: 'Csatlakozva: {n}', disconnectedT: 'A robot kapcsolata megszakadt',
  reconnecting: 'Újracsatlakozás…', busy: 'A robot dolgozik…',
  linkLost: 'A Bluetooth-kapcsolat megszakadt, újracsatlakozás…', linkBack: 'Újra csatlakozva', linkGone: 'Nem sikerült újracsatlakozni',
  reconnectTo: 'Újracsatlakozás: {n}', needNewLib: 'A vezetéshez újabb XRPLib kell. Frissítsd az XRPCode-dal.',
  ok: 'OK', newVar: 'Új változó neve'
};

export type UiKey = keyof typeof hu;

const en: Record<UiKey, string> = {
  projectName: 'Project name', saved: 'Saved on this device', slot: 'Slot', run: 'Run', stop: 'Stop',
  connect: 'Connect', dash: 'Dashboard', py: 'Python', drive: 'Drive', panel: 'Panel',
  zoomIn: 'Zoom in', zoomOut: 'Zoom out', undo: 'Undo', redo: 'Redo',
  demoChip: 'Demo robot · sensor values are simulated',
  battery: 'Battery', alk: 'Alkaline', nimh: 'NiMH', batOk: 'Good', batLow: 'Replace soon', batBad: 'Empty',
  distance: 'Distance', line: 'Line sensors', left: 'Left', right: 'Right',
  imu: 'Orientation (IMU)', yaw: 'Yaw', pitch: 'Pitch', roll: 'Roll', motors: 'Wheels and motors', motor: 'Motor', pos: 'Position',
  m3: '3rd', m4: '4th', live: 'Live · XPP', stale: 'No fresh data', noDash: 'This robot only reports its battery. Update XRPLib with XRPCode to see every sensor.',
  offline: 'Connect your robot to see its sensors and battery live here.',
  console: 'Console', clear: 'Clear', copy: 'Copy', copied: 'Copied', lines: 'lines of MicroPython · XRPLib',
  pyNote: 'This is the code that goes to the robot. It is built from your blocks and updates as you work.',
  driveNote: 'Start driving runs a small drive program on the robot. Then drag the stick.',
  driveStart: 'Start driving', driveStop: 'Stop driving',
  leftWheel: 'Left wheel', rightWheel: 'Right wheel', horn: 'Horn', light: 'Light',
  cTitle: 'Connect your robot', cStep1: 'Switch the robot on.',
  cStep2: 'Press <b>Find robot</b>. In the browser’s own window pick your robot’s name and press <b>Pair</b>.',
  cStep3: 'Robot names start with XRP-, for example <b>XRP-7A3F</b>.',
  cSupport: '<b>Works in:</b> Chrome and Edge on Mac, Windows, Chromebook and Android. <b>On iPad</b> use the Bluefy browser for now.',
  noBt: 'This browser has no Bluetooth. Open the app in Chrome or Edge, or in Bluefy on iPad. Meanwhile you can try the demo robot.',
  search: 'Find robot', demo: 'Demo robot', cancel: 'Cancel',
  connecting: 'Connecting…', connectingSub: 'Opening the link and reading the robot’s details',
  connectFail: 'Could not connect: {e}. Switch the robot off and on, then try again.',
  nameTitle: 'Which robot is yours?', nameSub: 'Your robot’s LED is blinking in this colour now. Give it a name and a colour so it is easy to spot in class.',
  robotName: 'Robot name', color: 'Colour', done: 'Done', identify: 'Blink it',
  board: 'Board', fw: 'XRPLib', link: 'Link', disconnect: 'Disconnect',
  slotTitle: 'Choose a program slot', slotSub: 'Run saves the program here. After power-on, the robot’s button also starts the last uploaded one.',
  empty: 'empty', running: 'Running in slot {n}', stopped: 'Program stopped', uploading: 'Uploading to slot {n}…',
  needRobot: 'Connect a robot first.', connectedTo: 'Connected: {n}', disconnectedT: 'Lost the connection to the robot',
  reconnecting: 'Reconnecting…', busy: 'The robot is busy…',
  linkLost: 'Bluetooth connection lost, reconnecting…', linkBack: 'Reconnected', linkGone: 'Could not reconnect',
  reconnectTo: 'Reconnect: {n}', needNewLib: 'Driving needs a newer XRPLib. Update it with XRPCode.',
  ok: 'OK', newVar: 'New variable name'
};

const DICT: Record<Lang, Record<UiKey, string>> = { hu, en };

let current: Lang = 'hu';
try {
  const l = localStorage.getItem('xrpb.lang');
  if (l === 'hu' || l === 'en') current = l;
  else if (!navigator.language.startsWith('hu')) current = 'en';
} catch {
  // storage blocked: keep Hungarian
}

export const lang = () => current;
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem('xrpb.lang', l); } catch { /* ignore */ }
}

export function t(k: UiKey, vars?: Record<string, string | number>): string {
  let s = DICT[current][k];
  if (vars) for (const v in vars) s = s.replace(`{${v}}`, String(vars[v]));
  return s;
}

export function fmt(n: number, digits = 1): string {
  return n.toLocaleString(current === 'hu' ? 'hu-HU' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
