import * as Blockly from 'blockly/core';
import './styles.css';
import { applyBlockMessages, createTheme, defineBlocks, registerCategory, SAMPLE, toolbox } from './blocks/blocks';
import { toPython } from './codegen/python';
import { lang, setLang, t, type Lang, type UiKey } from './i18n/ui';
import { bluetoothAvailable, BleLink } from './robot/ble';
import { BleRobot, type Robot } from './robot/robot';
import { SimRobot } from './robot/sim';
import { batteryLevel } from './robot/battery';
import { batteryOf, buildDashboard, updateDashboard } from './ui/dashboard';
import { closeDialog, dialog, esc, installBlocklyDialogs, toast } from './ui/dialogs';
import { ICON } from './ui/icons';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const store = {
  get(k: string): string | null { try { return localStorage.getItem('xrpb.' + k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem('xrpb.' + k, v); } catch { /* storage blocked */ } }
};

/* ---------------- Workspace ---------------- */
defineBlocks();
registerCategory();
installBlocklyDialogs();
applyBlockMessages(lang());

const ws = Blockly.inject('ws', {
  toolbox: toolbox(),
  renderer: 'zelos',
  theme: createTheme(),
  trashcan: false,
  sounds: false,
  zoom: { controls: false, wheel: true, startScale: 0.74, maxScale: 2, minScale: 0.4, scaleSpeed: 1.15 },
  move: { scrollbars: true, drag: true, wheel: false },
  grid: { spacing: 28, length: 2, colour: '#D3DBE7', snap: false }
});

const projName = $<HTMLInputElement>('projName');
projName.value = store.get('name') ?? (lang() === 'hu' ? 'Első robotom' : 'My first robot');
try {
  const saved = store.get('ws');
  Blockly.serialization.workspaces.load(saved ? JSON.parse(saved) : SAMPLE, ws);
} catch {
  Blockly.serialization.workspaces.load(SAMPLE, ws);
}

let python = '';
const pyEl = $('pyCode');
function highlight(src: string): string {
  const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(def|class|from|import|while|for|in|if|else|not|and|or|global|True|False|None|pass|raise|range|try|except|return|lambda)\b|\b(\d+(?:\.\d+)?)\b|\b([a-z_][a-z0-9_]*)(?=\()/gi;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : 'f';
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
function refreshPython() {
  try {
    python = toPython(ws, projName.value, Blockly.Msg.XRP_EVENT_LOOP);
  } catch (e) {
    python = '# ' + (e as Error).message;
  }
  if (!$('panePy').hidden) {
    pyEl.innerHTML = highlight(python);
    $('pyInfo').textContent = python.trim().split('\n').length + ' ' + t('lines');
  }
}
let saveTimer: ReturnType<typeof setTimeout> | undefined;
ws.addChangeListener((e) => {
  if (e.isUiEvent) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    refreshPython();
    store.set('ws', JSON.stringify(Blockly.serialization.workspaces.save(ws)));
  }, 150);
});
projName.addEventListener('input', () => { store.set('name', projName.value); refreshPython(); });
new ResizeObserver(() => Blockly.svgResize(ws)).observe($('wsWrap'));
$('zoomIn').onclick = () => ws.zoomCenter(1);
$('zoomOut').onclick = () => ws.zoomCenter(-1);
$('undoBtn').onclick = () => ws.undo(false);

/* ---------------- Robot ---------------- */
let robot: Robot | null = null;
let unsubscribe: (() => void) | null = null;
let slot = Number(store.get('slot') ?? 1);
let robotLabel = { name: '', color: '#2F5BEA' };
const ROBOT_COLORS: [string, [number, number, number]][] = [
  ['#2F5BEA', [0, 0, 255]], ['#D7373F', [255, 0, 0]], ['#1E9E5A', [0, 255, 0]],
  ['#E8A400', [255, 180, 0]], ['#9A4DFF', [160, 0, 255]], ['#E2559B', [255, 0, 120]]
];

function labelsFor(id: string) {
  try { return JSON.parse(store.get('robots') ?? '{}')[id] as { name: string; color: string } | undefined; } catch { return undefined; }
}
function saveLabel(id: string, v: { name: string; color: string }) {
  let all: Record<string, unknown> = {};
  try { all = JSON.parse(store.get('robots') ?? '{}'); } catch { /* reset */ }
  all[id] = v;
  store.set('robots', JSON.stringify(all));
}

function attach(r: Robot) {
  unsubscribe?.();
  robot = r;
  const remembered = labelsFor(r.name);
  robotLabel = remembered ?? { name: r.name, color: ROBOT_COLORS[0][0] };
  unsubscribe = r.on({
    state: (s) => {
      renderTop();
      if (s === 'disconnected') {
        toast(t('disconnectedT'));
        setDriving(false);
        buildDash();
      }
      if (s === 'reconnecting') toast(t('reconnecting'));
      if (s === 'ready') { setDriving(driving && r.state === 'running'); buildDash(); }
    },
    telemetry: (tel) => {
      updateDashboard(tel);
      updateTopBattery();
    },
    output: (text, kind) => log(text, kind)
  });
  $('demoChip').hidden = !r.simulated;
  renderTop();
  buildDash();
}

function buildDash() {
  buildDashboard(robot, openConnect, updateTopBattery);
}

/* ---------------- Top bar ---------------- */
const runBtn = $<HTMLButtonElement>('runBtn');
const connBtn = $('connBtn');

function renderTop() {
  const running = robot?.state === 'running';
  runBtn.innerHTML = running ? ICON.stop : ICON.play;
  runBtn.classList.toggle('running', running);
  runBtn.disabled = robot?.state === 'busy' || robot?.state === 'connecting' || robot?.state === 'reconnecting';
  runBtn.setAttribute('aria-label', running ? t('stop') : t('run'));
  runBtn.title = running ? t('stop') : t('run');
  $('slotNum').textContent = String(slot);
  const online = robot && robot.state !== 'disconnected';
  connBtn.classList.toggle('off', !online);
  if (!online) {
    connBtn.innerHTML = `${ICON.bt.replace('<svg', '<svg width="20" height="20"')}<span class="label">${t('connect')}</span>`;
    connBtn.setAttribute('aria-label', t('connect'));
    return;
  }
  const status = robot!.state === 'reconnecting' ? t('reconnecting') : robot!.state === 'busy' || robot!.state === 'connecting' ? t('busy') : '';
  connBtn.innerHTML = `<span class="dot" style="background:${robotLabel.color}"></span><span class="label">${esc(robotLabel.name)}</span>` +
    (status ? `<span class="state">${status}</span>` : '<span class="bat" id="topBat"></span>');
  connBtn.setAttribute('aria-label', robotLabel.name);
  updateTopBattery();
}

function updateTopBattery() {
  const el = document.getElementById('topBat');
  if (!el || !robot) return;
  const p = batteryOf(robot.telemetry);
  if (p === null) { el.textContent = ''; return; }
  const lvl = batteryLevel(p);
  const col = lvl === 'ok' ? 'var(--ok)' : lvl === 'low' ? 'var(--warn)' : 'var(--bad)';
  el.innerHTML = `<span class="batico"><i style="width:${p}%;background:${col}"></i></span>${p}%`;
}

runBtn.onclick = async () => {
  if (!robot || robot.state === 'disconnected') {
    toast(t('needRobot'));
    openConnect();
    return;
  }
  if (robot.state === 'running') {
    await robot.stop();
    toast(t('stopped'));
    return;
  }
  refreshPython();
  setDriving(false);
  toast(t('uploading', { n: slot }));
  await robot.run(python, slot);
};

connBtn.onclick = () => {
  if (!robot || robot.state === 'disconnected') openConnect();
  else toggleRobotMenu();
};

/* ---------------- Connect flow ---------------- */
function openConnect() {
  closeMenu();
  const bt = bluetoothAvailable();
  dialog(`<h2>${t('cTitle')}</h2>
    <ol class="steps"><li><span>${t('cStep1')}</span></li><li><span>${t('cStep2')}</span></li><li><span>${t('cStep3')}</span></li></ol>
    ${bt ? `<div class="support">${t('cSupport')}</div>` : `<p class="warnbox">${t('noBt')}</p>`}
    <div class="actions">
      <button class="btn" type="button" id="cDemo">${t('demo')}</button>
      ${bt && lastDevice ? `<button class="btn" type="button" id="cAgain">${esc(t('reconnectTo', { n: lastDevice.name ?? 'XRP' }))}</button>` : ''}
      ${bt ? `<button class="btn primary" type="button" id="cGo">${ICON.bt}${t('search')}</button>` : ''}
    </div>`, () => {
    $('cDemo').onclick = () => { closeDialog(); robot?.disconnect(); attach(new SimRobot()); toast(t('connectedTo', { n: 'XRP-DEMO' })); };
    if (bt) $('cGo').onclick = () => void connectBle();
    if (bt && lastDevice) $('cAgain').onclick = () => void connectBle(lastDevice!);
  });
}

/** The robot picked earlier in this page session; it reconnects without the chooser. */
let lastDevice: BluetoothDevice | null = null;

async function connectBle(known?: BluetoothDevice) {
  let device: BluetoothDevice;
  try {
    device = known ?? (await BleLink.choose()); // the chooser needs the click's user activation, so it comes first
  } catch {
    return; // chooser cancelled
  }
  lastDevice = device;
  dialog(`<div class="spinner"></div><h2 style="text-align:center">${t('connecting')}</h2><p style="text-align:center">${t('connectingSub')}</p>`, undefined, false);
  robot?.disconnect();
  const r = new BleRobot(device);
  try {
    attach(r);
    await r.connect();
  } catch (e) {
    r.disconnect();
    dialog(`<p class="warnbox">${esc(t('connectFail', { e: (e as Error).message ?? String(e) }))}</p><div class="actions"><button class="btn primary" type="button" id="fOk">${t('ok')}</button></div>`,
      () => { $('fOk').onclick = closeDialog; });
    return;
  }
  if (labelsFor(r.name)) {
    closeDialog();
    toast(t('connectedTo', { n: robotLabel.name }));
    return;
  }
  nameRobot(r);
}

function nameRobot(r: Robot) {
  let chosen = ROBOT_COLORS[0];
  void r.identify(chosen[1]);
  dialog(`<h2>${t('nameTitle')}</h2><p>${t('nameSub')}</p>
    <div style="display:flex;align-items:center;gap:12px"><span class="blink" id="ledPrev" style="width:28px;height:28px;border-radius:50%;background:${chosen[0]}"></span><b class="num">${esc(r.name)}</b></div>
    <div class="field"><label for="rName">${t('robotName')}</label><input id="rName" value="${esc(robotLabel.name)}"></div>
    <div class="field"><span>${t('color')}</span><div class="colors" role="group">${ROBOT_COLORS.map(([c], i) => `<button type="button" data-i="${i}" style="background:${c}" aria-label="${c}" aria-pressed="${i === 0}"></button>`).join('')}</div></div>
    <div class="actions"><button class="btn primary" type="button" id="nDone">${t('done')}</button></div>`, (root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-i]').forEach((b) => {
      b.onclick = () => {
        chosen = ROBOT_COLORS[Number(b.dataset.i)];
        root.querySelectorAll('[data-i]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        $('ledPrev').style.background = chosen[0];
        void r.identify(chosen[1]);
      };
    });
    $('nDone').onclick = () => {
      robotLabel = { name: ($<HTMLInputElement>('rName').value.trim() || r.name), color: chosen[0] };
      saveLabel(r.name, robotLabel);
      closeDialog();
      renderTop();
      toast(t('connectedTo', { n: robotLabel.name }));
    };
  });
}

/* ---------------- Robot menu ---------------- */
function closeMenu() {
  document.getElementById('rmenu')?.remove();
}
function toggleRobotMenu() {
  if (document.getElementById('rmenu')) { closeMenu(); return; }
  if (!robot) return;
  const r = robot;
  const m = document.createElement('div');
  m.className = 'menu';
  m.id = 'rmenu';
  m.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="width:14px;height:14px;border-radius:50%;background:${robotLabel.color}"></span><b>${esc(robotLabel.name)}</b><span class="num" style="color:var(--muted);font-size:12px">${esc(r.name)}</span></div>
    <div class="kv"><span>${t('board')}</span><b>${esc(r.info?.machine ?? '—')}</b><span>${t('fw')}</span><b>${esc(r.info?.xrplib ?? '—')}</b><span>${t('link')}</span><b>${r.simulated ? 'Demo' : 'Bluetooth LE'}</b></div>
    <button class="btn" type="button" id="mId">${ICON.bulb}${t('identify')}</button>
    <button class="btn" type="button" id="mDis">${t('disconnect')}</button>`;
  document.querySelector('.top')!.appendChild(m);
  $('mId').onclick = () => {
    const c = ROBOT_COLORS.find(([hex]) => hex === robotLabel.color) ?? ROBOT_COLORS[0];
    void r.identify(c[1]);
    closeMenu();
  };
  $('mDis').onclick = () => { closeMenu(); r.disconnect(); };
}
document.addEventListener('pointerdown', (e) => {
  const m = document.getElementById('rmenu');
  if (m && !m.contains(e.target as Node) && !connBtn.contains(e.target as Node)) closeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDialog(); closeMenu(); } });

/* ---------------- Slots ---------------- */
$('slotBtn').onclick = () => {
  const names = robot?.info?.slots ?? {};
  dialog(`<h2>${t('slotTitle')}</h2><p>${t('slotSub')}</p>
    <div class="slots">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-s="${i}" aria-pressed="${i === slot}"><b>${i}</b><span>${names[i] ? esc(names[i]) : t('empty')}</span></button>`).join('')}</div>
    <div class="actions"><button class="btn" type="button" id="sNo">${t('cancel')}</button></div>`, (root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-s]').forEach((b) => {
      b.onclick = () => { slot = Number(b.dataset.s); store.set('slot', String(slot)); closeDialog(); renderTop(); };
    });
    $('sNo').onclick = closeDialog;
  });
};

/* ---------------- Console ---------------- */
const con = $('console');
function log(text: string, kind: 'out' | 'err' | 'sys') {
  if (kind === 'out') {
    const last = con.lastElementChild as HTMLElement | null;
    // Program output arrives in pieces; keep appending to the current line.
    if (last && last.dataset.open === '1') {
      last.textContent += text;
    } else {
      const d = document.createElement('div');
      d.dataset.open = '1';
      d.textContent = text;
      con.appendChild(d);
    }
  } else {
    const d = document.createElement('div');
    d.className = kind === 'err' ? 'err' : 'sys';
    d.textContent = kind === 'sys' ? '> ' + text : text;
    con.appendChild(d);
  }
  const cur = con.lastElementChild as HTMLElement | null;
  if (cur && kind === 'out' && /\n$/.test(cur.textContent ?? '')) cur.dataset.open = '0';
  while (con.childElementCount > 300) con.firstElementChild?.remove();
  con.scrollTop = con.scrollHeight;
}
$('clearCon').onclick = () => { con.innerHTML = ''; };
$('copyPy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(python);
    toast(t('copied'));
  } catch {
    const range = document.createRange();
    range.selectNodeContents(pyEl);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
};

/* ---------------- Tabs ---------------- */
const tabs: Record<string, string> = { tabDash: 'paneDash', tabPy: 'panePy', tabDrive: 'paneDrive' };
function selectTab(id: string) {
  for (const k in tabs) {
    $(k).setAttribute('aria-selected', String(k === id));
    $(tabs[k]).hidden = k !== id;
  }
  if (id === 'tabDash') buildDash();
  if (id === 'tabPy') refreshPython();
  store.set('tab', id);
}
for (const k in tabs) $(k).onclick = () => selectTab(k);
$('panelToggle').onclick = () => $('side').classList.toggle('open');

/* ---------------- Drive ---------------- */
const joyEl = $('joy');
const knob = $('knob');
let driving = false;
const joy = { x: 0, y: 0, active: false };
let horn = false;
let light = false;
let padTimer: ReturnType<typeof setInterval> | undefined;

function setDriving(on: boolean) {
  driving = on;
  $('driveBtn').innerHTML = (on ? ICON.stop : ICON.stick) + (on ? t('driveStop') : t('driveStart'));
  clearInterval(padTimer);
  if (on) padTimer = setInterval(() => robot?.sendGamepad(joy.x, joy.y, horn, light), 50);
}
$('driveBtn').onclick = async () => {
  if (!robot || robot.state === 'disconnected') { toast(t('needRobot')); openConnect(); return; }
  if (driving) { setDriving(false); await robot.stop(); return; }
  if (robot.info && !robot.info.hasDashboard) { toast(t('needNewLib')); return; }
  setDriving(true);
  await robot.drive();
};

function setKnob(x: number, y: number) {
  joy.x = x;
  joy.y = y;
  const r = joyEl.clientWidth / 2;
  const k = knob.clientWidth / 2;
  knob.style.left = `${r - k + x * (r - k)}px`;
  knob.style.top = `${r - k + y * (r - k)}px`;
  const fwd = -y;
  let l = fwd + x;
  let rr = fwd - x;
  const m = Math.max(1, Math.abs(l), Math.abs(rr));
  l /= m;
  rr /= m;
  const show = (id: string, bar: string, v: number) => {
    $(id).innerHTML = Math.round(v * 100) + '<small>%</small>';
    const b = $(bar);
    b.style.left = v < 0 ? `${50 + v * 50}%` : '50%';
    b.style.width = `${Math.abs(v * 50)}%`;
  };
  show('effL', 'ebL', l);
  show('effR', 'ebR', rr);
}
function joyMove(e: PointerEvent) {
  const r = joyEl.getBoundingClientRect();
  const k = knob.clientWidth / 2;
  let x = (e.clientX - r.left - r.width / 2) / (r.width / 2 - k);
  let y = (e.clientY - r.top - r.height / 2) / (r.height / 2 - k);
  const d = Math.hypot(x, y);
  if (d > 1) { x /= d; y /= d; }
  setKnob(x, y);
}
joyEl.addEventListener('pointerdown', (e) => { joy.active = true; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
joyEl.addEventListener('pointermove', (e) => { if (joy.active) joyMove(e); });
const joyEnd = () => { joy.active = false; setKnob(0, 0); };
joyEl.addEventListener('pointerup', joyEnd);
joyEl.addEventListener('pointercancel', joyEnd);
const hornBtn = $('hornBtn');
hornBtn.addEventListener('pointerdown', () => { horn = true; });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hornBtn.addEventListener(ev, () => { horn = false; }));
$('lightBtn').onclick = () => { light = !light; $('lightBtn').setAttribute('aria-pressed', String(light)); };

/* ---------------- Language ---------------- */
function renderStatic() {
  document.documentElement.lang = lang();
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n as UiKey); });
  $('saved').textContent = t('saved');
  $('demoChip').textContent = t('demoChip');
  $('tabDash').innerHTML = ICON.gauge + t('dash');
  $('tabPy').innerHTML = ICON.code + t('py');
  $('tabDrive').innerHTML = ICON.stick + t('drive');
  const icon = (id: string, svg: string, label: UiKey) => { $(id).innerHTML = svg; $(id).setAttribute('aria-label', t(label)); $(id).title = t(label); };
  icon('panelToggle', ICON.panel, 'panel');
  icon('zoomIn', ICON.plus, 'zoomIn');
  icon('zoomOut', ICON.minus, 'zoomOut');
  icon('undoBtn', ICON.undo, 'undo');
  $('copyPy').textContent = t('copy');
  $('hornBtn').innerHTML = ICON.horn + t('horn');
  $('lightBtn').innerHTML = ICON.bulb + t('light');
  $('langHu').setAttribute('aria-pressed', String(lang() === 'hu'));
  $('langEn').setAttribute('aria-pressed', String(lang() === 'en'));
  setDriving(driving);
}
function switchLang(l: Lang) {
  if (l === lang()) return;
  setLang(l);
  applyBlockMessages(l);
  const state = Blockly.serialization.workspaces.save(ws);
  ws.clear();
  ws.updateToolbox(toolbox());
  Blockly.serialization.workspaces.load(state, ws);
  renderStatic();
  renderTop();
  const sel = Object.keys(tabs).find((k) => $(k).getAttribute('aria-selected') === 'true');
  selectTab(sel ?? 'tabDash');
}
$('langHu').onclick = () => switchLang('hu');
$('langEn').onclick = () => switchLang('en');

/* ---------------- Boot ---------------- */
$('demoChip').hidden = true;
renderStatic();
renderTop();
setKnob(0, 0);
const startTab = store.get('tab');
selectTab(startTab && tabs[startTab] ? startTab : 'tabDash');
refreshPython();
// Re-check "live" freshness on the dashboard even when no packets arrive.
setInterval(() => { if (robot && robot.state !== 'disconnected') updateDashboard(robot.telemetry); }, 1000);

