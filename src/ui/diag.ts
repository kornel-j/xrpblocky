/** Rolling diagnostic log the user can copy into a bug report. */

const MAX = 400;
const lines: string[] = [];
const started = Date.now();

export function diag(msg: string): void {
  const s = ((Date.now() - started) / 1000).toFixed(1).padStart(7);
  for (const l of msg.replace(/\r/g, '').split('\n')) if (l.trim()) lines.push(`${s}s ${l}`);
  while (lines.length > MAX) lines.shift();
}

export function diagReport(extra: Record<string, string>): string {
  const head = [
    `XRP Blocky ${__APP_VERSION__}`,
    `time: ${new Date().toISOString()}`,
    `browser: ${navigator.userAgent}`,
    `bluetooth: ${'bluetooth' in navigator ? 'yes' : 'no'}`,
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`)
  ];
  return head.join('\n') + '\n---\n' + lines.join('\n');
}
