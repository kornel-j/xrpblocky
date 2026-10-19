import * as Blockly from 'blockly/core';
import { t } from '../i18n/ui';

const layer = () => document.getElementById('layer')!;

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Shows a modal; `onMount` wires up its buttons. Clicking outside or Escape closes it. */
export function dialog(html: string, onMount?: (root: HTMLElement) => void, dismissable = true): void {
  layer().innerHTML = `<div class="scrim" id="scrim"><div class="dlg" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim = document.getElementById('scrim')!;
  if (dismissable) scrim.addEventListener('click', (e) => { if (e.target === scrim) closeDialog(); });
  onMount?.(scrim);
  const first = scrim.querySelector<HTMLElement>('input, button.primary, button');
  first?.focus();
}

export function closeDialog(): void {
  layer().innerHTML = '';
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el!.hidden = true; }, 2600);
}

/** Blockly uses window.prompt/confirm for variables; replace them with in-page dialogs. */
export function installBlocklyDialogs(): void {
  Blockly.dialog.setPrompt((message, def, cb) => {
    dialog(`<h2>${esc(message || t('newVar'))}</h2><div class="field"><input id="pIn" value="${esc(def || '')}"></div>
      <div class="actions"><button class="btn" id="pNo" type="button">${t('cancel')}</button><button class="btn primary" id="pOk" type="button">${t('ok')}</button></div>`, () => {
      const inp = document.getElementById('pIn') as HTMLInputElement;
      inp.focus();
      inp.select();
      const ok = () => { const v = inp.value; closeDialog(); cb(v); };
      document.getElementById('pOk')!.onclick = ok;
      inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
      document.getElementById('pNo')!.onclick = () => { closeDialog(); cb(null); };
    });
  });
  Blockly.dialog.setConfirm((message, cb) => {
    dialog(`<p style="color:var(--fg)">${esc(message)}</p><div class="actions"><button class="btn" id="cNo" type="button">${t('cancel')}</button><button class="btn primary" id="cOk" type="button">${t('ok')}</button></div>`, () => {
      document.getElementById('cOk')!.onclick = () => { closeDialog(); cb(true); };
      document.getElementById('cNo')!.onclick = () => { closeDialog(); cb(false); };
    });
  });
  Blockly.dialog.setAlert((message, cb) => { toast(message); cb?.(); });
}
