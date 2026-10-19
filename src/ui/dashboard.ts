import { batteryLevel, batteryPercent, type BatteryType } from '../robot/battery';
import type { Robot, Telemetry } from '../robot/robot';
import { fmt, t } from '../i18n/ui';
import { ICON } from './icons';

let batType: BatteryType = 'alk';
try {
  const b = localStorage.getItem('xrpb.bat');
  if (b === 'alk' || b === 'nimh') batType = b;
} catch { /* ignore */ }

export const getBatteryType = () => batType;

const hist: number[] = [];
const $ = (id: string) => document.getElementById(id);
const dash = () => $('paneDash')!;

/** Rebuilds the dashboard for the current robot (or the offline state). */
export function buildDashboard(robot: Robot | null, onConnect: () => void, onBatteryType: () => void): void {
  const el = dash();
  hist.length = 0;
  if (!robot || robot.state === 'disconnected') {
    el.innerHTML = `<div class="offline">${ICON.robot}<p>${t('offline')}</p><button class="btn primary" type="button" id="dashConn">${ICON.bt}${t('connect')}</button></div>`;
    $('dashConn')!.onclick = onConnect;
    return;
  }
  const full = robot.info?.hasDashboard ?? false;
  el.innerHTML = `
  <div class="card">
    <h3>${t('battery')} <span class="pill" id="batPill"></span></h3>
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><b class="big" id="batPct">—</b><span class="num" id="batV" style="font-size:14px;color:var(--muted)"></span></div>
    <div class="batbar" id="batBar">${'<i></i>'.repeat(10)}</div>
    <div class="batmeta"><span>4 × AA</span><span class="seg" role="group"><button type="button" data-b="alk">${t('alk')}</button><button type="button" data-b="nimh">${t('nimh')}</button></span></div>
  </div>
  ${full ? `
  <div class="card"><h3>${t('distance')} <span class="pill" id="liveTag"></span></h3><b class="big" id="dDist">—</b><svg class="spark" id="spark" viewBox="0 0 120 34" preserveAspectRatio="none"></svg></div>
  <div class="card"><h3>${t('line')}</h3><div class="linepair">
    <div class="linecell"><span class="swatch" id="swL"></span><div>${t('left')}<b id="dLL">—</b></div></div>
    <div class="linecell"><span class="swatch" id="swR"></span><div>${t('right')}<b id="dLR">—</b></div></div>
  </div></div>
  <div class="card"><h3>${t('imu')}</h3><div class="imu">
    <svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38" fill="var(--surface-2)" stroke="var(--line)" stroke-width="2"/>
      <g stroke="var(--muted)" stroke-width="2">${[0, 90, 180, 270].map((a) => `<line x1="42" y1="7" x2="42" y2="13" transform="rotate(${a} 42 42)"/>`).join('')}</g>
      <g id="needle"><path d="M42 12 L48 44 L42 40 L36 44 Z" fill="var(--accent)"/></g><circle cx="42" cy="42" r="4" fill="var(--fg)"/></svg>
    <div class="kv"><span>${t('yaw')}</span><b id="dYaw">—</b><span>${t('pitch')}</span><b id="dPitch">—</b><span>${t('roll')}</span><b id="dRoll">—</b></div>
  </div></div>
  <div class="card"><h3>${t('motors')}</h3><table class="mot"><thead><tr><th>${t('motor')}</th><th class="n">${t('pos')}</th></tr></thead><tbody>
    <tr><td>${t('left')}</td><td class="n" id="eL">—</td></tr>
    <tr><td>${t('right')}</td><td class="n" id="eR">—</td></tr>
    <tr><td>${t('m3')}</td><td class="n" id="e3">—</td></tr>
    <tr><td>${t('m4')}</td><td class="n" id="e4">—</td></tr>
  </tbody></table></div>` : `<p class="warnbox">${t('noDash')}</p>`}`;
  el.querySelectorAll<HTMLButtonElement>('[data-b]').forEach((b) => {
    b.onclick = () => {
      batType = b.dataset.b as BatteryType;
      try { localStorage.setItem('xrpb.bat', batType); } catch { /* ignore */ }
      updateDashboard(robot.telemetry);
      onBatteryType();
    };
  });
  updateDashboard(robot.telemetry);
}

export function batteryOf(tel: Telemetry): number | null {
  return tel.voltage !== undefined && tel.voltage > 0 ? batteryPercent(tel.voltage, batType) : null;
}

export function updateDashboard(tel: Telemetry): void {
  if (dash().hidden || !$('batPct')) return;
  const p = batteryOf(tel);
  const lvl = p === null ? null : batteryLevel(p);
  const color = lvl === 'ok' ? 'var(--ok)' : lvl === 'low' ? 'var(--warn)' : 'var(--bad)';
  $('batPct')!.innerHTML = p === null ? '—' : `${p}<small>%</small>`;
  $('batV')!.textContent = tel.voltage ? fmt(tel.voltage, 2) + ' V' : '';
  const pill = $('batPill')!;
  pill.className = 'pill ' + (lvl === 'ok' ? 'ok' : lvl === 'low' ? 'warn' : lvl ? 'bad' : '');
  pill.textContent = lvl === 'ok' ? t('batOk') : lvl === 'low' ? t('batLow') : lvl ? t('batBad') : '';
  $('batBar')!.querySelectorAll('i').forEach((el, i) => {
    const on = p !== null && i < Math.round(p / 10);
    el.className = on ? 'on' : '';
    (el as HTMLElement).style.background = on ? color : '';
  });
  dash().querySelectorAll('[data-b]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.b === batType)));

  if (!$('dDist')) return;
  const fresh = tel.at !== undefined && performance.now() - tel.at < 2500;
  const tag = $('liveTag')!;
  tag.className = 'pill ' + (fresh ? 'ok' : 'warn');
  tag.textContent = fresh ? t('live') : t('stale');
  if (tel.distance !== undefined) {
    $('dDist')!.innerHTML = fmt(tel.distance, 1) + '<small>cm</small>';
    hist.push(tel.distance);
    if (hist.length > 60) hist.shift();
  }
  if (hist.length > 1) {
    const max = 80;
    const pts = hist.map((d, i) => `${((i / 59) * 120).toFixed(1)},${(32 - (Math.min(d, max) / max) * 30).toFixed(1)}`);
    const lastX = pts[pts.length - 1].split(',')[0];
    $('spark')!.innerHTML = `<polygon points="0,34 ${pts.join(' ')} ${lastX},34" fill="var(--accent)" opacity=".14"/><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
  }
  const grey = (x: number) => { const c = Math.round(245 - Math.min(1, Math.max(0, x)) * 215); return `rgb(${c},${c},${c})`; };
  if (tel.lineL !== undefined) { $('swL')!.style.background = grey(tel.lineL); $('dLL')!.textContent = fmt(tel.lineL, 2); }
  if (tel.lineR !== undefined) { $('swR')!.style.background = grey(tel.lineR); $('dLR')!.textContent = fmt(tel.lineR, 2); }
  if (tel.yaw !== undefined) { $('needle')!.setAttribute('transform', `rotate(${-tel.yaw} 42 42)`); $('dYaw')!.textContent = fmt(tel.yaw, 0) + '°'; }
  if (tel.pitch !== undefined) $('dPitch')!.textContent = fmt(tel.pitch, 1) + '°';
  if (tel.roll !== undefined) $('dRoll')!.textContent = fmt(tel.roll, 1) + '°';
  const deg = (id: string, v?: number) => { if (v !== undefined) $(id)!.textContent = fmt(v, 0) + '°'; };
  deg('eL', tel.encL); deg('eR', tel.encR); deg('e3', tel.enc3); deg('e4', tel.enc4);
}
