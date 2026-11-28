import { esc } from './html';

/**
 * The licence mark injected into every deck: a small label in the top-right corner and a very faint diagonal
 * repeat across the screen, both "Licensed to <name> · <school>". It is HTML + CSS only (no script), so the deck's
 * own script hash in its CSP stays valid. pointer-events:none keeps every slide control usable.
 */
export const WATERMARK_CSS = `
#ks-wm,#ks-wm-tile{position:fixed;pointer-events:none;user-select:none;-webkit-user-select:none;z-index:2147483000;font-family:Inter,"Anuphan",system-ui,sans-serif}
#ks-wm{top:10px;right:12px;max-width:min(70vw,560px);padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.72);color:rgba(15,27,51,.62);font-size:12px;font-weight:600;line-height:1.3;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(15,27,51,.12)}
#ks-wm-tile{inset:0;overflow:hidden;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:34vh;align-items:center;justify-items:center}
#ks-wm-tile span{transform:rotate(-24deg);color:rgba(15,27,51,.045);font-size:clamp(12px,1.6vw,22px);font-weight:700;white-space:nowrap}
@media print{#ks-wm{background:#fff;color:#555}#ks-wm-tile span{color:rgba(0,0,0,.08)}}
`.trim();

export function watermarkText(name: string, school: string): string {
  return `Licensed to ${name}${school ? ' · ' + school : ''}`;
}

export function watermarkMarkup(text: string): string {
  const t = esc(text);
  const tiles = Array.from({ length: 9 }, () => `<span>${t}</span>`).join('');
  return `<div id="ks-wm" aria-hidden="true" data-ks-licence>${t}</div><div id="ks-wm-tile" aria-hidden="true">${tiles}</div>`;
}

/** Stream the deck through HTMLRewriter: add the style to <head> and the mark at the end of <body>. */
export function injectWatermark(res: Response, text: string): Response {
  let headDone = false, bodyDone = false;
  const markup = watermarkMarkup(text);
  return new HTMLRewriter()
    .on('head', { element(el) { if (!headDone) { headDone = true; el.append(`<style id="ks-wm-style">${WATERMARK_CSS}</style>`, { html: true }); } } })
    .on('body', { element(el) { if (!bodyDone) { bodyDone = true; el.append(markup, { html: true }); } } })
    .transform(res);
}
