// HTML templates for the 20 sample slides of the style quiz (10 pairs, 1600 x 900).
// Every pair shows the same maths content (M.1 statistics: our class's favourite fruit) and differs in ONE
// dimension only. Rendered by render.mjs. No dark neon, no gradient text (the owner rejects the "AI look").
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM = resolve(HERE, '../..');
const u = (p) => pathToFileURL(p).href;
const F = (f) => u(resolve(PLATFORM, '../../teacher-slides/unit4/fonts', f));
const FS = (pkg, f) => u(resolve(PLATFORM, 'node_modules/@fontsource', pkg, 'files', f));
const PHOTO = (f) => u(resolve(HERE, 'photos', f));

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+25CB-25CF,U+FEFF,U+FFFD';
const THAI = 'U+0E00-0E7F';
const FONTS = `
@font-face{font-family:KS;src:url(${F('Inter-Regular.woff2')});font-weight:400}
@font-face{font-family:KS;src:url(${F('Inter-Medium.woff2')});font-weight:500}
@font-face{font-family:KS;src:url(${F('Inter-SemiBold.woff2')});font-weight:600}
@font-face{font-family:KS;src:url(${F('Inter-Bold.woff2')});font-weight:700}
@font-face{font-family:KS;src:url(${F('Inter-ExtraBold.woff2')});font-weight:800}
@font-face{font-family:KS;src:url(${F('Anuphan-Thai-400.woff2')});font-weight:400;unicode-range:${THAI}}
@font-face{font-family:KS;src:url(${F('Anuphan-Thai-400.woff2')});font-weight:500;unicode-range:${THAI}}
@font-face{font-family:KS;src:url(${F('Anuphan-Thai-600.woff2')});font-weight:600;unicode-range:${THAI}}
@font-face{font-family:KS;src:url(${F('Anuphan-Thai-700.woff2')});font-weight:700;unicode-range:${THAI}}
@font-face{font-family:KS;src:url(${F('Anuphan-Thai-700.woff2')});font-weight:800;unicode-range:${THAI}}
@font-face{font-family:KSD;src:url(${F('InterDisplay-SemiBold.woff2')});font-weight:600}
@font-face{font-family:KSD;src:url(${F('InterDisplay-Bold.woff2')});font-weight:700}
@font-face{font-family:KSD;src:url(${F('InterDisplay-ExtraBold.woff2')});font-weight:800}
@font-face{font-family:KSD;src:url(${F('Anuphan-Thai-600.woff2')});font-weight:600;unicode-range:${THAI}}
@font-face{font-family:KSD;src:url(${F('Anuphan-Thai-700.woff2')});font-weight:700;unicode-range:${THAI}}
@font-face{font-family:KSD;src:url(${F('Anuphan-Thai-700.woff2')});font-weight:800;unicode-range:${THAI}}
${[400, 600, 700].map((w) => `@font-face{font-family:RD;src:url(${FS('mali', `mali-latin-${w}-normal.woff2`)});font-weight:${w};unicode-range:${LATIN}}
@font-face{font-family:RD;src:url(${FS('mali', `mali-thai-${w}-normal.woff2`)});font-weight:${w};unicode-range:${THAI}}`).join('\n')}
@font-face{font-family:RD;src:url(${FS('mali', 'mali-latin-700-normal.woff2')});font-weight:800;unicode-range:${LATIN}}
@font-face{font-family:RD;src:url(${FS('mali', 'mali-thai-700-normal.woff2')});font-weight:800;unicode-range:${THAI}}
@font-face{font-family:HW;src:url(${FS('sriracha', 'sriracha-latin-400-normal.woff2')});unicode-range:${LATIN}}
@font-face{font-family:HW;src:url(${FS('sriracha', 'sriracha-thai-400-normal.woff2')});unicode-range:${THAI}}
`;

// ---------- content ----------
export const DATA = [
  { k: 'mango', th: 'มะม่วง', en: 'Mango', n: 12 },
  { k: 'banana', th: 'กล้วย', en: 'Banana', n: 8 },
  { k: 'orange', th: 'ส้ม', en: 'Orange', n: 6 },
  { k: 'mangosteen', th: 'มังคุด', en: 'Mangosteen', n: 9 },
];
const T = {
  th: {
    kicker: 'คณิตศาสตร์ ม.1 · บทที่ 4 สถิติ', title: 'ผลไม้ที่ห้อง ม.1/2 ชอบที่สุด', sub: 'สำรวจนักเรียนทั้งห้อง 35 คน',
    ctitle: 'จำนวนนักเรียน (คน)', q: 'คำถาม', qt: 'ผลไม้ชนิดใดที่มีคนชอบมากที่สุด?', reveal: 'มะม่วง 12 คน มากที่สุด',
    introK: 'บทที่ 4 · เริ่มต้นสำรวจ', introT: 'ห้องเราชอบผลไม้อะไร?', introL: 'ลองทายก่อน แล้วออกไปเก็บข้อมูลจากเพื่อนทั้งห้อง 35 คน',
    steps: ['ตั้งคำถาม', 'เก็บข้อมูล', 'สร้างแผนภูมิ', 'อ่านผล'], guess: 'ทายเลย! ผลไม้ไหนชนะ', photoCap: 'แผงผลไม้ริมทาง พัทยา',
  },
  en: {
    kicker: 'Maths · Grade 7 · Unit 4 Statistics', title: 'Our class’s favourite fruit', sub: 'A survey of all 35 students',
    ctitle: 'Number of students', q: 'Question', qt: 'Which fruit is the most popular?', reveal: 'Mango: 12 students, the most',
    introK: 'Unit 4 · Let’s investigate', introT: 'What fruit does our class love?', introL: 'Make a guess first, then survey all 35 of your classmates.',
    steps: ['Ask', 'Collect', 'Chart', 'Read'], guess: 'Guess! Which fruit wins?', photoCap: 'A street fruit stall, Pattaya',
  },
};
const name = (d, lang) => (lang === 'en' ? d.en : d.th);

// ---------- fruit illustrations (drawn for these samples) ----------
const SYMBOLS = `<svg width="0" height="0" style="position:absolute"><defs>
<symbol id="f-mango" viewBox="0 0 100 100">
 <path d="M26 20C42 6 72 12 84 40c10 24 4 50-20 52-16 1-24-10-31-22C25 56 10 34 26 20z" fill="#FFB52E"/>
 <path d="M84 40c10 24 4 50-20 52-12 1-20-5-26-13 24 4 44-12 46-39z" fill="#F28C1B"/>
 <path d="M30 22c10-8 24-8 34-2-14-1-26 4-32 12-3-3-4-7-2-10z" fill="#9CCB4A"/>
 <ellipse cx="52" cy="40" rx="7" ry="13" transform="rotate(-40 52 40)" fill="#FFDB8F"/>
 <path d="M27 21c-2-6-1-11 2-15" stroke="#7A5226" stroke-width="4" stroke-linecap="round" fill="none"/>
 <path d="M29 9c4-9 15-12 24-8-4 9-15 12-24 8z" fill="#3FA65A"/>
</symbol>
<symbol id="f-banana" viewBox="0 0 100 100">
 <path d="M20 20c-6 38 18 64 60 64 6 0 8 6 2 9-44 14-82-18-72-72 1-6 11-7 10-1z" fill="#F3BC1E"/>
 <path d="M30 16c-4 34 18 58 56 58 6 0 7 6 2 8-40 12-74-16-68-64 1-6 11-7 10-2z" fill="#FFD84A"/>
 <path d="M34 24c0 26 16 44 42 48" stroke="#FFE88C" stroke-width="5" stroke-linecap="round" fill="none"/>
 <path d="M18 18l1-10 9 1-1 10z" fill="#6E4B1F"/><path d="M24 12l2-8 8 2-2 8z" fill="#7E5A26"/>
 <circle cx="88" cy="88" r="3.5" fill="#4A3216"/>
</symbol>
<symbol id="f-orange" viewBox="0 0 100 100">
 <circle cx="50" cy="56" r="35" fill="#FF9A1F"/>
 <path d="M85 56a35 35 0 0 1-63 21 35 35 0 0 0 54-42 35 35 0 0 1 9 21z" fill="#F07F0C"/>
 <ellipse cx="37" cy="43" rx="10" ry="6.5" transform="rotate(-32 37 43)" fill="#FFC56E"/>
 <g fill="#E8790B" opacity=".55"><circle cx="58" cy="50" r="1.6"/><circle cx="66" cy="62" r="1.6"/><circle cx="48" cy="70" r="1.6"/><circle cx="36" cy="62" r="1.6"/><circle cx="62" cy="76" r="1.6"/></g>
 <circle cx="50" cy="22" r="3.2" fill="#5A3A14"/><path d="M51 21c6-10 18-12 27-8-7 10-19 12-27 8z" fill="#3FA65A"/>
</symbol>
<symbol id="f-mangosteen" viewBox="0 0 100 100">
 <circle cx="50" cy="60" r="33" fill="#6F2C62"/>
 <path d="M83 60a33 33 0 0 1-58 21 33 33 0 0 0 48-41 33 33 0 0 1 10 20z" fill="#56204C"/>
 <ellipse cx="37" cy="52" rx="9" ry="5.5" transform="rotate(-32 37 52)" fill="#A0619A"/>
 <ellipse cx="36" cy="31" rx="11" ry="7" transform="rotate(-24 36 31)" fill="#5DAE4B"/><ellipse cx="64" cy="31" rx="11" ry="7" transform="rotate(24 64 31)" fill="#5DAE4B"/>
 <ellipse cx="50" cy="28" rx="10" ry="7.5" fill="#4C9A3C"/><rect x="46.5" y="11" width="7" height="16" rx="3.5" fill="#3E7F31"/>
</symbol>
</defs></svg>`;
const FACE = { mango: [58, 60], banana: [46, 60], orange: [50, 58], mangosteen: [50, 64] };
function fruit(k, size, o = {}) {
  const [x, y] = FACE[k];
  const face = o.face ? `<g fill="#1C2A55"><circle cx="${x - 9}" cy="${y}" r="3.6"/><circle cx="${x + 9}" cy="${y}" r="3.6"/></g><path d="M${x - 7} ${y + 9}q7 6.5 14 0" stroke="#1C2A55" stroke-width="3.2" stroke-linecap="round" fill="none"/><g fill="#FF7A8A" opacity=".55"><circle cx="${x - 15}" cy="${y + 7}" r="3.6"/><circle cx="${x + 15}" cy="${y + 7}" r="3.6"/></g>` : '';
  return `<svg class="fr" viewBox="0 0 100 100" width="${size}" height="${size}"><use href="#f-${k}"/>${face}</svg>`;
}
const photoChip = (k, size) => `<img class="pfr" src="${PHOTO(`${k}.jpg`)}" width="${size}" height="${size}" alt="">`;
const icon = (o, k, size) => (o.visual === 'photo' ? photoChip(k, size) : fruit(k, size, { face: o.face }));
const check = (c = '#fff', s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- palettes ----------
const PAL = {
  base: { bg: '#F5F7FC', card: '#FFFFFF', ink: '#1C2A55', ink2: '#465069', mute: '#6A7390', line: '#E4E8F2', kick: '#2F66E8',
    bars: ['#3D7BFF', '#A9C1FF', '#A9C1FF', '#A9C1FF'], hot: '#F2553C', soft: '#E6EEFF', ok: '#18B07F', okBg: '#E2F6EE', okT: '#0B7050', chip: '#EEF2FA' },
  vivid: { bg: '#3D7BFF', card: '#FFFFFF', ink: '#1C2A55', ink2: '#2A3557', mute: '#4B5675', line: '#E4E8F2', kick: '#FFC83D',
    bars: ['#F2553C', '#FFC83D', '#18B07F', '#8B6CF6'], hot: '#F2553C', soft: '#FFF1C9', ok: '#18B07F', okBg: '#18B07F', okT: '#FFFFFF', chip: '#FFC83D' },
  calm: { bg: '#F3F1EC', card: '#FFFFFF', ink: '#36415A', ink2: '#56607A', mute: '#858C9C', line: '#E7E3DB', kick: '#7A8BA8',
    bars: ['#B9C7DD', '#CFDCD3', '#E9D9C6', '#DCD5E8'], hot: '#93A7C6', soft: '#EEF1F6', ok: '#7FA592', okBg: '#E6EFEA', okT: '#4F7563', chip: '#ECEAE4' },
};

function baseCss(o) {
  const p = PAL[o.palette || 'base'];
  const ff = o.font === 'round' ? 'RD,KS' : 'KS';
  const ffd = o.font === 'round' ? 'RD,KSD' : 'KSD,KS';
  return `${FONTS}
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}
body{position:relative;background:${o.bgColor || p.bg};color:${p.ink};font:500 24px/1.45 ${ff};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
:root{--card:${p.card};--ink:${p.ink};--ink2:${p.ink2};--mute:${p.mute};--line:${p.line};--kick:${p.kick};--hot:${p.hot};--soft:${p.soft};--ok:${p.ok};--okbg:${p.okBg};--okt:${p.okT};--chip:${p.chip};--ffd:${ffd}}
.stage{position:absolute;inset:0;padding:60px 84px}
.kick{font:700 23px/1.2 ${ff};color:var(--kick);letter-spacing:.02em;display:flex;align-items:center;gap:12px}
.kick::before{content:"";width:30px;height:9px;border-radius:5px;background:currentColor}
h1{margin:14px 0 6px;font:800 64px/1.15 var(--ffd);letter-spacing:-.015em;color:var(--ink)}
.sub{margin:0;font:500 26px/1.4 ${ff};color:var(--mute)}
.dots{position:absolute;right:84px;top:66px;display:flex;gap:8px;align-items:center}
.dots i{width:12px;height:12px;border-radius:50%;background:#CBD3E4}.dots i.on{width:34px;border-radius:6px;background:var(--hot)}
.dots b{font:700 20px ${ff};color:var(--mute);margin-left:10px}
.card{background:var(--card);border-radius:30px;border:1px solid var(--line);box-shadow:0 2px 6px rgba(28,42,85,.05),0 22px 46px rgba(28,42,85,.09)}
.row{display:flex;gap:34px;align-items:stretch}
/* chart */
.chart{position:relative;padding:28px 36px 22px;display:flex;flex-direction:column}
.ct{font:700 22px ${ff};color:var(--mute)}
.plot{position:relative;flex:1;display:flex;align-items:flex-end;justify-content:space-around;border-bottom:4px solid var(--ink);margin:10px 6px 0;padding:0 10px}
.col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:120px;position:relative}
.val{font:800 40px/1 var(--ffd);color:var(--ink);margin-bottom:12px}
.bar{width:104px;border-radius:16px 16px 0 0}
.xl{display:flex;justify-content:space-around;margin:14px 6px 0;padding:0 10px}
.xl div{width:120px;display:flex;flex-direction:column;align-items:center;gap:6px;font:700 24px/1.2 ${ff};color:var(--ink2);text-align:center}
.pfr{border-radius:50%;object-fit:cover;border:4px solid #fff;box-shadow:0 6px 14px rgba(28,42,85,.18)}
/* question */
.qcard{padding:34px 34px 30px;display:flex;flex-direction:column;gap:16px}
.qk{display:inline-flex;align-self:flex-start;font:800 19px/1 ${ff};letter-spacing:.06em;color:var(--hot);background:color-mix(in srgb,var(--hot) 12%,#fff);padding:9px 14px;border-radius:999px}
.qt{font:700 34px/1.3 var(--ffd);color:var(--ink)}
.chs{display:grid;gap:14px}
.ch{display:flex;align-items:center;gap:16px;height:74px;padding:0 20px;border-radius:20px;background:var(--card);border:2px solid var(--line);font:700 27px ${ff};color:var(--ink)}
.ch .l{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:var(--soft);color:${p.kick === '#FFC83D' ? '#1C2A55' : p.kick};font:800 20px var(--ffd);flex:none}
.ch .fr,.ch .pfr{margin-left:auto}
.ch.ok{background:var(--okbg);border-color:var(--ok);color:var(--okt)}
.ch.ok .l{background:var(--ok);color:#fff}
.reveal{display:flex;align-items:center;gap:14px;padding:18px 22px;border-radius:20px;background:${o.palette === 'calm' ? '#E9EDF3' : '#1C2A55'};color:${o.palette === 'calm' ? '#36415A' : '#fff'};font:700 25px ${ff}}
.reveal b{color:${o.palette === 'calm' ? '#4F7563' : '#FFC83D'}}
.pill{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;background:var(--card);border:2px solid var(--line);font:700 22px ${ff};color:var(--ink2)}
`;
}

// ---------- building blocks ----------
function header(o, t, k = t.kicker, h = t.title, s = t.sub) {
  return `<div class="kick">${k}</div><h1>${h}</h1>${s ? `<p class="sub">${s}</p>` : ''}
  <div class="dots"><i></i><i class="on"></i><i></i><i></i><i></i><b>5/12</b></div>`;
}

function barChart(o, w, h, opts = {}) {
  const p = PAL[o.palette || 'base'];
  const max = 12, H = opts.barMax ?? (h - 262);
  const lang = o.lang || 'th';
  const cols = DATA.map((d, i) => {
    const n = opts.values ? opts.values[i] : d.n;
    const bh = Math.round((n / max) * H);
    const color = opts.colors ? opts.colors[i] : (o.palette === 'vivid' ? p.bars[i] : i === 0 ? p.hot : p.bars[1]);
    const extra = opts.colExtra ? opts.colExtra(i, bh, H) : '';
    return `<div class="col"><span class="val">${opts.labels ? opts.labels[i] : d.n}</span><div class="bar" style="height:${bh}px;background:${color}"></div>${extra}</div>`;
  }).join('');
  const xl = DATA.map((d) => `<div>${opts.noIcons ? '' : icon(o, d.k, opts.icon ?? 58)}<span>${name(d, lang)}</span></div>`).join('');
  return `<div class="chart card" style="width:${w}px;height:${h}px"><div class="ct">${T[lang].ctitle}</div>
    <div class="plot">${cols}</div><div class="xl">${xl}</div>${opts.extra || ''}</div>`;
}

function question(o, w, opts = {}) {
  const lang = o.lang || 'th';
  const t = T[lang];
  const chs = DATA.map((d, i) => `<div class="ch${i === 0 ? ' ok' : ''}"><span class="l">${'ABCD'[i]}</span>${name(d, lang)}${i === 0 ? `<span style="margin-left:auto;display:flex">${check(o.palette === 'vivid' ? '#fff' : PAL[o.palette || 'base'].ok, 32)}</span>` : ''}</div>`).join('');
  return `<div class="qcard card${opts.cls ? ' ' + opts.cls : ''}" style="width:${w}px${opts.style ? ';' + opts.style : ''}"><span class="qk">${t.q}</span><div class="qt">${t.qt}</div>
    <div class="chs">${chs}</div>${opts.reveal === false ? '' : `<div class="reveal">${check('#FFC83D', 30)}<span>${t.reveal.replace(/(12[^,]*)/, '<b>$1</b>')}</span></div>`}</div>`;
}

const doc = (o, css, body) => `<!DOCTYPE html><html lang="${o.lang === 'en' ? 'en' : 'th'}"><head><meta charset="utf-8"><style>${baseCss(o)}${css}</style></head><body class="${o.cls || ''}">${SYMBOLS}${body}</body></html>`;

// ---------- layouts ----------
/** The chart + question slide (style and animation pairs). */
export function chartq(o) {
  const t = T[o.lang || 'th'];
  if (o.style === 'notebook') return notebook(o);
  const rich = o.anim === 'rich';
  const chartOpts = rich ? { colExtra: (i, bh) => `<span class="up" style="bottom:${bh - 50}px"></span>${i === 2 || i === 3 ? burst(i === 3 ? '#FFC83D' : '#F2553C', bh) : ''}${i === 0 ? '<span class="num" style="left:-30px;bottom:-6px">1</span>' : ''}${i === 1 ? `<span class="num" style="right:-8px;bottom:${bh + 30}px">2</span>` : ''}` } : {};
  const q = question(o, 540, o.anim ? { style: 'height:520px', cls: 'tight' } : {});
  const qWrap = rich ? `<div style="position:relative;flex:none"><div class="ghost g2"></div><div class="ghost g1"></div>${q.replace('<div class="ch ok">', '<div class="ch ok" style="position:relative">' + RIPPLE)}<span class="num" style="left:-18px;top:-18px">3</span><span class="num" style="left:-18px;bottom:64px">4</span>
    ${[0, 1, 2].map((i) => `<span class="whoosh" style="right:-${30 + i * 12}px;top:${160 + i * 150}px;width:${70 - i * 14}px"></span>`).join('')}</div>` : q;
  return doc(o, o.anim ? ANIM_CSS : '', `<div class="stage">${header(o, t)}
    <div class="row" style="margin-top:${o.anim ? 30 : 34}px">${barChart(o, 860, o.anim ? 520 : 560, chartOpts)}${qWrap}</div>${o.anim ? animStrip(o.anim) : ''}</div>`);
}

const RIPPLE = `<svg style="position:absolute;left:250px;top:-4px;z-index:4" width="110" height="110" viewBox="0 0 110 110"><circle cx="36" cy="40" r="20" fill="none" stroke="#18B07F" stroke-width="5" opacity=".75"/><circle cx="36" cy="40" r="34" fill="none" stroke="#18B07F" stroke-width="4" opacity=".35"/>
  <path d="M36 40l42 17-18 6-7 18z" fill="#1C2A55" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>`;
const burst = (c, bh) => `<svg class="burst" style="bottom:${bh - 26}px" viewBox="0 0 120 120">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
  `<line x1="60" y1="4" x2="60" y2="16" stroke="${c}" stroke-width="5" stroke-linecap="round" transform="rotate(${a} 60 60)"/>`).join('')}</svg>`;

const ANIM_CSS = `
.strip{position:absolute;left:84px;right:84px;bottom:34px;display:flex;align-items:center;gap:12px;font:700 21px KS;color:#465069}
.strip .lab{font:800 17px KS;letter-spacing:.08em;color:#6A7390;margin-right:4px}
.strip .st{display:flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border-radius:999px;background:#fff;border:2px solid #E4E8F2}
.strip .st b{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#F2553C;color:#fff;font:800 17px KSD}
.strip .ar{color:#A9B3C9;font-size:26px}
.num{position:absolute;width:44px;height:44px;border-radius:50%;background:#F2553C;color:#fff;display:grid;place-items:center;font:800 21px KSD;box-shadow:0 0 0 6px rgba(242,85,60,.2);z-index:6}
.up{position:absolute;left:50%;width:6px;height:46px;margin-left:66px;border-radius:3px;background:#3D7BFF;opacity:.45}
.up::before{content:"";position:absolute;left:-9px;top:-6px;width:12px;height:12px;border-left:6px solid #3D7BFF;border-top:6px solid #3D7BFF;transform:rotate(45deg);border-radius:2px}
.burst{position:absolute;left:50%;margin-left:-60px;width:120px;height:120px;z-index:3}
.qcard.tight{padding:28px 30px;gap:13px}.qcard.tight .ch{height:60px}.qcard.tight .chs{gap:10px}.qcard.tight .reveal{padding:13px 20px}
.ghost{position:absolute;top:0;bottom:0;width:540px;border-radius:30px;border:3px dashed #A9C1FF;background:#fff}
.ghost.g1{left:34px;opacity:.7}.ghost.g2{left:68px;opacity:.4}
.whoosh{position:absolute;height:6px;border-radius:3px;background:#3D7BFF;opacity:.45}
.qcard{position:relative;z-index:2}
`;
function animStrip(kind) {
  const steps = kind === 'rich'
    ? [['1', 'แท่งกราฟงอกขึ้นทีละแท่ง'], ['2', 'ตัวเลขเด้งขึ้น'], ['3', 'คำถามเลื่อนเข้ามา'], ['4', 'แตะแล้วเฉลยเปิด']]
    : [['1', 'ทั้งหน้าค่อย ๆ ปรากฏ (0.5 วินาที)']];
  return `<div class="strip"><span class="lab">ลำดับแอนิเมชัน</span>${steps.map(([n, s], i) => `${i ? '<span class="ar">→</span>' : ''}<span class="st"><b${kind === 'light' ? ' style="background:#A9B3C9"' : ''}>${n}</b>${s}</span>`).join('')}</div>`;
}

/** Style B: notebook. */
function notebook(o) {
  const lang = o.lang || 'th';
  const t = T[lang];
  const max = 12, H = 270;
  const cols = DATA.map((d, i) => `<div class="col"><span class="val">${d.n}</span><div class="bar hatch${i === 0 ? ' win' : ''}" style="height:${Math.round((d.n / max) * H)}px"></div>${i === 0 ? `<span class="hand" style="left:150px;bottom:${H + 6}px;transform:rotate(-4deg)">${lang === 'en' ? 'mango wins!' : 'มะม่วงชนะ!'}</span>
    <svg style="position:absolute;left:96px;bottom:${H + 12}px" width="56" height="34" viewBox="0 0 56 34"><path d="M52 22C40 26 22 24 8 14M8 14l14-8M8 14l10 12" fill="none" stroke="#178F6A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}</div>`).join('');
  const xl = DATA.map((d) => `<div>${fruit(d.k, 54)}<span>${name(d, lang)}</span></div>`).join('');
  const ring = '<svg class="ring" width="210" height="76" viewBox="0 0 210 76"><path d="M24 40C26 14 120 6 172 14c34 6 32 40-10 50C116 74 34 72 16 52 6 40 22 26 52 22" fill="none" stroke="#E0533B" stroke-width="5" stroke-linecap="round"/></svg>';
  const chs = DATA.map((d, i) => `<div class="nch"><span class="cl">${'ABCD'[i]}</span>${name(d, lang)}${i === 0 ? ring : ''}</div>`).join('');
  const css = `
body{background-color:#FFFBF1;background-image:radial-gradient(circle at 1px 1px,rgba(28,42,85,.16) 1.3px,transparent 1.7px);background-size:30px 30px}
.margin{position:absolute;left:132px;top:0;bottom:0;width:3px;background:#F4A9A0}
.hole{position:absolute;left:44px;width:34px;height:34px;border-radius:50%;background:#E9E2D2;box-shadow:inset 0 3px 5px rgba(0,0,0,.12)}
.stage{padding-left:176px}
.kick{font:400 34px/1.2 HW,KS;color:#E0533B;letter-spacing:0;transform:rotate(-1.5deg);transform-origin:left}
.kick::before{display:none}
h1{font-family:KS;font-weight:800}
h1 mark{background:none;background-image:linear-gradient(transparent 58%,#FFD84D 58%,#FFD84D 90%,transparent 90%);color:inherit;padding:0 4px}
.sub{font:400 30px HW,KS;color:#178F6A}
.chart{background:none;border:0;box-shadow:none;padding:10px 10px 0}
.ct{font:400 26px HW,KS;color:#465069}
.plot{border-bottom:4px solid #1C2A55;border-left:4px solid #1C2A55;border-radius:0 0 0 4px}
.bar{border:4px solid #1C2A55;border-bottom:0;border-radius:8px 8px 0 0;background:repeating-linear-gradient(-45deg,#1C2A55 0 3px,transparent 3px 13px)}
.bar.win{background-color:#FFD84D}
.val{font:400 40px HW,KS;color:#1C2A55}
.xl div{font:600 24px KS}
.note{position:absolute;left:1046px;top:300px;width:470px;padding:42px 36px 34px;background:#FFF0A1;transform:rotate(1.6deg);box-shadow:0 14px 26px rgba(80,60,0,.14),0 2px 0 rgba(0,0,0,.04)}
.tape{position:absolute;left:150px;top:-22px;width:170px;height:44px;transform:rotate(-4deg);background:repeating-linear-gradient(45deg,rgba(242,85,60,.55) 0 12px,rgba(255,255,255,.55) 12px 24px)}
.note .qt{font:700 34px/1.3 KS;color:#1C2A55;margin-bottom:20px}
.nch{position:relative;display:flex;align-items:center;gap:16px;font:600 30px KS;color:#1C2A55;padding:10px 4px}
.ring{position:absolute;left:-10px;top:-6px}
.cl{width:44px;height:44px;border-radius:50%;border:3px solid #1C2A55;display:grid;place-items:center;font:700 20px KS}
.hand{position:absolute;font:400 34px HW,KS;color:#178F6A;white-space:nowrap;z-index:3}
.foot{position:absolute;left:1060px;top:770px;width:470px;font:400 28px/1.35 HW,KS;color:#465069;transform:rotate(-1.5deg)}
.foot b{font-weight:400;color:#E0533B}`;
  return doc(o, css, `<div class="margin"></div>${[90, 300, 510, 720].map((y) => `<span class="hole" style="top:${y}px"></span>`).join('')}
  <div class="stage"><div class="kick">${lang === 'en' ? 'maths · unit 4 · statistics' : 'คณิตศาสตร์ ม.1 · บทที่ 4 สถิติ'}</div>
  <h1>${lang === 'en' ? 'Our class’s <mark>favourite</mark> fruit' : 'ผลไม้ที่ห้อง ม.1/2 <mark>ชอบที่สุด</mark>'}</h1>
  <p class="sub">${lang === 'en' ? 'we asked all 35 students!' : 'ถามเพื่อนทั้งห้อง 35 คน!'}</p>
  <div style="margin-top:22px">${`<div class="chart" style="width:800px;height:500px"><div class="ct">${lang === 'en' ? 'number of students' : 'จำนวนนักเรียน (คน)'}</div><div class="plot">${cols}</div><div class="xl">${xl}</div></div>`}</div></div>
  <div class="note"><div class="tape"></div><div class="qt">${t.qt}</div>${chs}</div>
  <div class="foot">${lang === 'en' ? 'mango <b>12</b> &gt; mangosteen 9 &gt; banana 8 &gt; orange 6' : 'มะม่วง <b>12</b> &gt; มังคุด 9 &gt; กล้วย 8 &gt; ส้ม 6'}</div>`);
}

/** Chapter opener (colour pair). */
export function title(o) {
  const vivid = o.palette === 'vivid';
  const p = PAL[o.palette];
  const topics = ['คำถามทางสถิติ', 'การเก็บข้อมูล', 'แผนภูมิแท่ง', 'ฐานนิยม'];
  const numC = vivid ? ['#F2553C', '#18B07F', '#8B6CF6', '#FFC83D'] : ['#9AA8BF', '#A9BEB2', '#C9B79F', '#B3A9C8'];
  const donut = vivid ? ['#F2553C', '#FFC83D', '#18B07F', '#8B6CF6'] : ['#B9C7DD', '#CFDCD3', '#E9D9C6', '#DCD5E8'];
  // donut segments (12, 8, 6, 9 of 35)
  let acc = 0;
  const segs = DATA.map((d, i) => {
    const a0 = (acc / 35) * 2 * Math.PI; acc += d.n; const a1 = (acc / 35) * 2 * Math.PI;
    const r = 70, cx = 100, cy = 100;
    const x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0), x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1);
    return `<path d="M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}" fill="none" stroke="${donut[i]}" stroke-width="38"/>`;
  }).join('');
  const css = `
.blob{position:absolute;border-radius:50%}
.chap{display:inline-flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;font:800 26px KS;background:${vivid ? '#FFC83D' : '#E3E7EE'};color:${vivid ? '#1C2A55' : '#56607A'}}
.big{margin:26px 0 12px;font:800 150px/1 KSD,KS;letter-spacing:-.03em;color:${vivid ? '#fff' : '#36415A'}}
.lead{font:500 30px/1.5 KS;color:${vivid ? '#E6EEFF' : '#7D8596'};max-width:640px;margin:0}
.tops{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:44px;width:720px}
.top{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:22px;background:#fff;font:700 25px KS;color:${p.ink};${vivid ? '' : 'border:1px solid #E7E3DB;'}box-shadow:${vivid ? '0 10px 24px rgba(16,40,120,.25)' : 'none'}}
.top b{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#fff;font:800 21px KSD}
.mini{position:absolute;padding:26px 28px}
.mini .ct{font:700 21px KS;color:${p.mute};margin-bottom:14px}
.mb{display:flex;align-items:flex-end;gap:22px;height:190px;border-bottom:4px solid ${p.ink};padding:0 10px}
.mb i{width:64px;border-radius:12px 12px 0 0}`;
  const cardShadow = vivid ? 'box-shadow:0 24px 50px rgba(16,40,120,.35)' : 'box-shadow:0 2px 4px rgba(54,65,90,.04)';
  return doc({ ...o }, css, `
  ${vivid ? '<div class="blob" style="right:-160px;top:-200px;width:760px;height:760px;background:#FFC83D"></div><div class="blob" style="left:-120px;bottom:-200px;width:420px;height:420px;background:#F2553C"></div>'
    : '<div class="blob" style="right:-160px;top:-200px;width:760px;height:760px;background:#E9E6DF"></div>'}
  <div class="stage" style="padding-top:110px">
    <span class="chap">บทที่ 4 · คณิตศาสตร์ ม.1</span>
    <div class="big">สถิติ (1)</div>
    <p class="lead">เก็บข้อมูล นำเสนอด้วยแผนภูมิ และอ่านความหมายจากข้อมูลรอบตัว</p>
    <div class="tops">${topics.map((s, i) => `<div class="top"><b style="background:${numC[i]}">${i + 1}</b>${s}</div>`).join('')}</div>
  </div>
  <div class="mini card" style="left:930px;top:150px;width:470px;transform:rotate(-3deg);${cardShadow}"><div class="ct">ผลไม้ที่ห้องเราชอบ (คน)</div>
    <div class="mb">${DATA.map((d, i) => `<i style="height:${Math.round(d.n / 12 * 170)}px;background:${vivid ? donut[i] : (i === 0 ? '#93A7C6' : '#C9D3E3')}"></i>`).join('')}</div>
    <div style="display:flex;gap:22px;padding:10px 10px 0">${DATA.map((d) => `<div style="width:64px;display:flex;justify-content:center">${fruit(d.k, 50)}</div>`).join('')}</div></div>
  <div class="mini card" style="left:1170px;top:520px;width:300px;transform:rotate(4deg);${cardShadow}"><div class="ct">สัดส่วน</div>
    <svg width="200" height="200" viewBox="0 0 200 200" style="display:block;margin:0 auto">${segs}</svg></div>
  <div class="mini card" style="left:900px;top:600px;width:250px;padding:20px 24px;transform:rotate(-2deg);${cardShadow}">
    <div style="font:800 54px/1 KSD;color:${vivid ? '#F2553C' : '#7A8BA8'}">35</div><div style="font:700 21px KS;color:${p.mute}">คนตอบแบบสำรวจ</div></div>`);
}

/** Intro slide with a photo or an illustration (visuals and language pairs). */
export function intro(o) {
  const lang = o.lang || 'th';
  const t = T[lang];
  const css = `
.lead{font:500 30px/1.55 KS;color:var(--ink2);margin:18px 0 0;max-width:640px}
.steps{display:flex;gap:10px;margin-top:34px;width:720px}
.steps span{display:inline-flex;align-items:center;gap:9px;padding:9px 15px 9px 9px;white-space:nowrap;border-radius:999px;background:#fff;border:2px solid var(--line);font:700 23px KS;color:var(--ink)}
.steps b{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#1C2A55;color:#fff;font:800 18px KSD}
.guess{margin-top:44px;width:720px;padding:24px 26px;border-radius:28px;background:#fff;border:1px solid var(--line);box-shadow:0 18px 40px rgba(28,42,85,.08)}
.guess .gt{font:800 24px KS;color:#F2553C;margin-bottom:16px}
.gs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.g{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px;border-radius:20px;background:#F5F7FC;font:700 22px KS;color:var(--ink)}
.pane{position:absolute;right:84px;top:64px;width:680px;height:772px;border-radius:40px;overflow:hidden}
.pane img.ph{width:100%;height:100%;object-fit:cover;object-position:30% 50%;display:block}
.cap{position:absolute;left:24px;bottom:24px;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;background:rgba(255,255,255,.94);font:700 21px KS;color:#1C2A55}
.credit{position:absolute;right:22px;bottom:30px;font:500 14px KS;color:rgba(255,255,255,.9);text-shadow:0 1px 3px rgba(0,0,0,.6)}
.scene{background:#E6EEFF}`;
  const pane = o.visual === 'photo'
    ? `<div class="pane"><img class="ph" src="${PHOTO('stall.jpg')}" alt=""><span class="cap"><svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="10" r="3" fill="none" stroke="#F2553C" stroke-width="2.4"/><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" fill="none" stroke="#F2553C" stroke-width="2.4"/></svg>${t.photoCap}</span><span class="credit">Photo: PattayaPatrol · CC BY-SA 4.0</span></div>`
    : `<div class="pane scene">${stallIllustration(lang)}</div>`;
  return doc(o, css, `<div class="stage">
    <div class="kick">${t.introK}</div><h1 style="font-size:70px;max-width:700px">${t.introT}</h1>
    <p class="lead">${t.introL}</p>
    <div class="steps">${t.steps.map((s, i) => `<span><b>${i + 1}</b>${s}</span>`).join('')}</div>
    <div class="guess"><div class="gt">${t.guess}</div><div class="gs">${DATA.map((d) => `<div class="g">${icon(o, d.k, 96)}${name(d, lang)}</div>`).join('')}</div></div>
  </div>${pane}`);
}

function stallIllustration(lang = 'th') {
  // A flat fruit stall: striped awning, counter, baskets of fruit, a price sign. 680 x 772.
  const stripes = Array.from({ length: 8 }, (_, i) => `<path d="M${i * 85} 120h85v60a42.5 42.5 0 0 1-85 0z" fill="${i % 2 ? '#fff' : '#F2553C'}"/>`).join('');
  const pile = (cx, cy, k, n, s) => Array.from({ length: n }, (_, i) => {
    const row = i < Math.ceil(n / 2) ? 0 : 1;
    const idx = row ? i - Math.ceil(n / 2) : i;
    const per = row ? Math.floor(n / 2) : Math.ceil(n / 2);
    const x = cx + (idx - (per - 1) / 2) * s * 0.78;
    const y = cy - row * s * 0.5;
    return `<use href="#f-${k}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}"/>`;
  }).join('');
  const basket = (cx, cy, w) => `<path d="M${cx - w / 2} ${cy}h${w}l-${w * 0.08} ${w * 0.42}a14 14 0 0 1-14 12H${cx - w / 2 + w * 0.08 + 14}a14 14 0 0 1-14-12z" fill="#C98A4B"/>
    <path d="M${cx - w / 2 + 8} ${cy + w * 0.14}h${w - 16}M${cx - w / 2 + 14} ${cy + w * 0.28}h${w - 28}" stroke="#A86C33" stroke-width="5" stroke-linecap="round"/>`;
  return `<svg width="680" height="772" viewBox="0 0 680 772">
    <rect width="680" height="772" fill="#E6EEFF"/>
    <circle cx="560" cy="70" r="140" fill="#FFF1C9"/><circle cx="560" cy="70" r="70" fill="#FFC83D"/>
    <path d="M0 520h680v252H0z" fill="#CFE0FF"/>
    <rect x="60" y="150" width="16" height="420" rx="8" fill="#1C2A55"/><rect x="604" y="150" width="16" height="420" rx="8" fill="#1C2A55"/>
    <rect x="0" y="96" width="680" height="34" rx="10" fill="#1C2A55"/>
    ${stripes}
    <rect x="200" y="232" width="280" height="92" rx="18" fill="#fff"/><text x="340" y="292" text-anchor="middle" font-family="KS" font-weight="800" font-size="40" fill="#1C2A55">${lang === 'en' ? 'Fresh fruit' : 'ผลไม้สด'}</text>
    <rect x="30" y="560" width="620" height="200" rx="26" fill="#1C2A55"/><rect x="30" y="560" width="620" height="26" rx="13" fill="#33467F"/>
    ${basket(170, 470, 220)}${basket(480, 470, 220)}
    ${pile(170, 452, 'mango', 5, 92)}${pile(480, 452, 'orange', 5, 86)}
    ${basket(170, 640, 200)}${basket(480, 640, 200)}
    <use href="#f-banana" x="70" y="520" width="150" height="150"/><use href="#f-banana" x="140" y="530" width="140" height="140"/>
    ${pile(480, 624, 'mangosteen', 5, 82)}
    <g transform="rotate(-8 600 420)"><rect x="548" y="376" width="104" height="70" rx="12" fill="#FFC83D"/><text x="600" y="423" text-anchor="middle" font-family="KS" font-weight="800" font-size="30" fill="#1C2A55">฿20</text></g>
  </svg>`;
}

/** Density pair. */
export function one(o) {
  const css = `
.hero{position:absolute;left:84px;right:84px;top:250px;bottom:80px;display:flex;align-items:center;gap:70px}
.num{font:800 330px/0.9 KSD;letter-spacing:-.04em;color:#F2553C}
.num small{font:800 64px KSD;color:#1C2A55;letter-spacing:-.01em;margin-left:14px}
.say{font:700 44px/1.35 KSD,KS;color:#1C2A55;margin-top:22px;max-width:760px}
.say span{color:#6A7390;font-weight:600}`;
  return doc(o, css, `<div class="stage">${header(o, T.th, 'คณิตศาสตร์ ม.1 · บทที่ 4 สถิติ', 'ห้องเราชอบมะม่วงที่สุด', '')}</div>
  <div class="hero"><div style="flex:none;width:430px;height:430px;border-radius:50%;background:#FFF1C9;display:grid;place-items:center">${fruit('mango', 330)}</div>
  <div><div class="num">12<small>คน</small></div><div class="say">จากนักเรียน 35 คน <span>มากกว่าผลไม้ชนิดอื่นทั้งหมด</span></div></div></div>`);
}

export function dense(o) {
  const tally = (n) => {
    const groups = Math.floor(n / 5), rest = n % 5;
    const g = '<svg width="44" height="34" viewBox="0 0 44 34" style="margin-right:6px">' + [6, 14, 22, 30].map((x) => `<line x1="${x}" y1="4" x2="${x}" y2="30" stroke="#1C2A55" stroke-width="3" stroke-linecap="round"/>`).join('') + '<line x1="2" y1="26" x2="36" y2="8" stroke="#F2553C" stroke-width="3" stroke-linecap="round"/></svg>';
    const r = rest ? `<svg width="${rest * 8 + 6}" height="34" viewBox="0 0 ${rest * 8 + 6} 34">${Array.from({ length: rest }, (_, i) => `<line x1="${6 + i * 8}" y1="4" x2="${6 + i * 8}" y2="30" stroke="#1C2A55" stroke-width="3" stroke-linecap="round"/>`).join('')}</svg>` : '';
    return g.repeat(groups) + r;
  };
  const css = `
.grid3{display:grid;grid-template-columns:560px 470px 1fr;gap:26px;margin-top:26px}
.tbl{padding:22px 24px}
.tbl table{width:100%;border-collapse:collapse;font:600 21px KS}
.tbl th{font:700 16px KS;color:#6A7390;text-align:left;padding:8px 6px;border-bottom:2px solid #E4E8F2;letter-spacing:.04em}
.tbl td{padding:9px 6px;border-bottom:1px solid #EEF1F7;vertical-align:middle}
.tbl td.n{font:800 24px KSD;text-align:right}
.tbl tr.top td{background:#FFF4F1}
.tbl tfoot td{font:800 21px KS;border-bottom:0}
.pts{padding:22px 24px;display:flex;flex-direction:column;gap:12px}
.pts h3,.tbl h3{margin:0 0 6px;font:800 22px KS;color:#1C2A55}
.pt{display:flex;gap:12px;font:600 20px/1.4 KS;color:#465069}
.pt b{flex:none;width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#E6EEFF;color:#2F66E8;font:800 16px KSD}
.q2{margin-top:6px;padding:16px 18px;border-radius:18px;background:#1C2A55;color:#fff;font:700 21px/1.4 KS}
.q2 span{display:block;font:800 15px KS;letter-spacing:.08em;color:#FFC83D;margin-bottom:4px}
.warn{position:absolute;left:84px;right:84px;bottom:40px;display:flex;align-items:center;gap:14px;padding:14px 20px;border-radius:18px;background:#FFF1C9;color:#5E3D00;font:600 20px KS}
.warn b{font-weight:800}
.chart .val{font-size:30px;margin-bottom:8px}.chart .bar{width:74px}.chart .col{width:90px}.chart .xl div{width:90px;font-size:19px}`;
  return doc(o, css, `<div class="stage">${header(o, T.th, 'คณิตศาสตร์ ม.1 · บทที่ 4 สถิติ', 'ผลไม้ที่ห้อง ม.1/2 ชอบ: สรุปข้อมูล', 'สำรวจนักเรียน 35 คน · ข้อมูลเชิงคุณภาพ')}
  <div class="grid3">${barChart(o, 560, 520, { icon: 42, barMax: 290 })}
  <div class="tbl card"><h3>ตารางแจกแจงความถี่</h3><table><thead><tr><th>ผลไม้</th><th>รอยขีด</th><th style="text-align:right">คน</th><th style="text-align:right">%</th></tr></thead><tbody>
  ${DATA.map((d, i) => `<tr class="${i === 0 ? 'top' : ''}"><td>${d.th}</td><td style="white-space:nowrap">${tally(d.n)}</td><td class="n">${d.n}</td><td class="n" style="font-size:20px;color:#6A7390">${Math.round(d.n / 35 * 100)}</td></tr>`).join('')}
  </tbody><tfoot><tr><td>รวม</td><td></td><td class="n">35</td><td class="n" style="font-size:20px">100</td></tr></tfoot></table></div>
  <div class="pts card"><h3>ข้อสังเกต</h3>
   <div class="pt"><b>1</b><span>มะม่วงมีคนชอบมากที่สุด 12 คน (34%) จึงเป็นฐานนิยม</span></div>
   <div class="pt"><b>2</b><span>ส้มมีคนชอบน้อยที่สุด 6 คน</span></div>
   <div class="pt"><b>3</b><span>มะม่วงมากกว่ากล้วย 12 − 8 = 4 คน</span></div>
   <div class="q2"><span>ลองคิด</span>ถ้านักเรียนเพิ่มอีก 5 คนชอบมังคุดทั้งหมด ฐานนิยมจะเปลี่ยนไหม?</div></div></div></div>
  <div class="warn">⚠ <span><b>ระวัง:</b> ข้อมูลผลไม้เป็นข้อมูลเชิงคุณภาพ หาค่าเฉลี่ยไม่ได้ ใช้ฐานนิยมแทน</span></div>`);
}

/** Interaction pair. */
export function practice(o) {
  const many = o.interact === 'many';
  const css = `
.right{display:flex;flex-direction:column;gap:16px;width:640px}
.task{padding:20px 22px;border-radius:24px}
.task .h{display:flex;align-items:center;gap:12px;font:800 23px/1.3 KS;color:#1C2A55;margin-bottom:12px}
.task .h b{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:#F2553C;color:#fff;font:800 18px KSD}
.task .h em{font-style:normal;margin-left:auto;font:800 15px KS;letter-spacing:.06em;color:#2F66E8;background:#E6EEFF;padding:6px 10px;border-radius:999px}
.opts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.opt{height:58px;border-radius:16px;border:2px solid #E4E8F2;display:grid;place-items:center;font:700 22px KS;color:#1C2A55;background:#fff}
.opt.ok{background:#18B07F;border-color:#18B07F;color:#fff}
.inp{display:flex;gap:10px;align-items:center}
.box{flex:1;height:60px;border-radius:16px;border:3px solid #3D7BFF;display:flex;align-items:center;padding:0 18px;font:800 30px KSD;color:#1C2A55;box-shadow:0 0 0 5px #E6EEFF}
.box i{width:3px;height:34px;background:#1C2A55;margin-left:4px}
.btn{height:60px;padding:0 24px;border-radius:999px;background:#1C2A55;color:#fff;display:flex;align-items:center;gap:8px;font:800 22px KS}
.okp{display:inline-flex;align-items:center;gap:6px;color:#0B7050;font:800 20px KS;margin-top:10px}
.pens{display:flex;gap:10px;align-items:center}
.pens span{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#F5F7FC}
.pens span.on{background:#1C2A55}
.sw{width:26px!important;height:26px!important;border-radius:50%!important}
.foot{position:absolute;left:84px;right:84px;bottom:34px;display:flex;gap:14px;align-items:center}
.foot .pill b{color:#18B07F}
.turn{margin-left:auto;padding:12px 22px;border-radius:999px;background:#FFC83D;font:800 24px KS;color:#1C2A55}
.drag{position:absolute;z-index:3}
.target{position:absolute;left:8px;right:8px;bottom:0;border:4px dashed #F2553C;border-bottom:0;border-radius:16px 16px 0 0;background:rgba(242,85,60,.06)}
.handle{position:absolute;left:50%;margin-left:-26px;width:52px;height:52px;border-radius:50%;background:#fff;border:5px solid #1C2A55;display:grid;place-items:center;z-index:4;box-shadow:0 6px 14px rgba(28,42,85,.25)}
.tip{position:absolute;left:50%;transform:translateX(-50%);padding:9px 16px;border-radius:14px;background:#1C2A55;color:#fff;font:700 20px KS;white-space:nowrap;z-index:4}
.tip::after{content:"";position:absolute;left:50%;bottom:-10px;margin-left:-9px;border:9px solid transparent;border-top-color:#1C2A55;border-bottom:0}
.penring{position:absolute;left:-26px;z-index:3;pointer-events:none}
.how{padding:28px 30px;border-radius:24px}
.how h3{margin:0 0 16px;font:800 28px KS;color:#1C2A55}
.how .s{display:flex;gap:14px;align-items:flex-start;font:600 24px/1.45 KS;color:#465069;margin-bottom:14px}
.how .s b{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#E6EEFF;color:#2F66E8;font:800 18px KSD}
.fact{padding:24px 28px;border-radius:24px;background:#1C2A55;color:#fff;font:700 26px/1.45 KS}
.fact span{color:#FFC83D}
.small{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-radius:20px;background:#fff;border:1px solid #E4E8F2;font:600 21px KS;color:#6A7390}
.small .b2{padding:10px 18px;border-radius:999px;border:2px solid #D6DCEA;font:800 19px KS;color:#1C2A55}`;
 const colExtra = many ? (i, bh, H) => i === 2
    ? `<span class="target" style="height:${Math.round(6 / 12 * H)}px"></span><span class="handle" style="bottom:${bh - 24}px"><svg width="26" height="30" viewBox="0 0 26 30"><path d="M13 3v24M5 10l8-8 8 8M5 20l8 8 8-8" fill="none" stroke="#1C2A55" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
       <span class="tip" style="bottom:${Math.round(6 / 12 * H) + 70}px">ลากแท่งส้มให้เท่ากับ 6</span>`
    : i === 0 ? (() => { const h = bh + 84; return `<svg class="penring" style="bottom:-22px" width="172" height="${h + 16}" viewBox="0 0 172 ${h + 16}"><path d="M92 10C150 12 162 ${h * 0.45} 152 ${h * 0.82}C142 ${h + 8} 34 ${h + 12} 20 ${h * 0.8}C8 ${h * 0.5} 22 10 102 18" fill="none" stroke="#F2553C" stroke-width="5" stroke-linecap="round"/></svg>`; })() : '' : undefined;
  const chartExtra = many ? `
    <div class="drag pens" style="right:26px;top:22px;padding:8px;border-radius:18px;background:#fff;box-shadow:0 8px 20px rgba(28,42,85,.14)">
      <span class="on"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
      <span><i class="sw" style="display:block;background:#F2553C"></i></span><span><i class="sw" style="display:block;background:#3D7BFF"></i></span></div>` : '';
  const right = many ? `<div class="right">
    <div class="task card"><div class="h"><b>1</b>แตะเลือก: ผลไม้ใดมีคนชอบน้อยที่สุด?<em>แตะ</em></div>
      <div class="opts">${DATA.map((d, i) => `<div class="opt${i === 2 ? ' ok' : ''}">${d.th}</div>`).join('')}</div></div>
    <div class="task card"><div class="h"><b>2</b>มะม่วงมากกว่ากล้วยกี่คน?<em>พิมพ์</em></div>
      <div class="inp"><div class="box">4<i></i></div><div class="btn">${check('#fff', 24)}ตรวจคำตอบ</div></div><div class="okp">${check('#0B7050', 22)}ถูกต้อง! 12 − 8 = 4</div></div>
    <div class="task card"><div class="h"><b>3</b>วงกลมแท่งที่สูงที่สุดบนจอ<em>เขียน</em></div>
      <div style="font:600 20px KS;color:#6A7390">ใช้ปากกาบนแผนภูมิด้านซ้าย เส้นโค้งจะกลายเป็นวงกลมเอง</div></div></div>`
    : `<div class="right">
    <div class="how card"><h3>วิธีอ่านแผนภูมิแท่ง</h3>
      <div class="s"><b>1</b><span>ดูชื่อแผนภูมิและหน่วยบนแกน (คน)</span></div>
      <div class="s"><b>2</b><span>เทียบความสูงของแท่ง แท่งสูงกว่ามีจำนวนมากกว่า</span></div>
      <div class="s" style="margin-bottom:0"><b>3</b><span>อ่านตัวเลขบนแท่งเพื่อหาค่าที่แน่นอน</span></div></div>
    <div class="fact">มะม่วงมากที่สุด <span>12 คน</span> · ส้มน้อยที่สุด <span>6 คน</span></div>
    <div class="small"><span>คำถามท้ายเรื่อง: แบบฝึกหัด 4.2 ข้อ 1–3</span><span class="b2">ดูเฉลย</span></div></div>`;
  return doc(o, css, `<div class="stage">${header(o, T.th, 'ฝึกอ่านแผนภูมิแท่ง', many ? 'ลองทำ! อ่านแผนภูมิผลไม้' : 'อ่านแผนภูมิผลไม้ที่ห้องเราชอบ', '')}
    <div class="row" style="margin-top:30px">${barChart(o, 760, many ? 560 : 600, { extra: chartExtra, colExtra, values: many ? [12, 8, 4, 9] : undefined, labels: many ? [12, 8, '', 9] : undefined })}${right}</div></div>
    ${many ? `<div class="foot"><span class="pill">${check('#18B07F', 24)}ตอบแล้ว <b>28/35</b> คน</span><span class="pill">⏱ 00:45</span><span class="turn">ตาคุณ!</span></div>` : ''}`);
}

/** Chart pair. */
export function chart(o) {
  const playful = o.chart === 'playful';
  const max = 12;
  let body;
  if (playful) {
    const colors = ['#FFC83D', '#FFE27A', '#FFB27A', '#C6B6FF'];
    const pat = ['radial-gradient(circle at 10px 10px,rgba(255,255,255,.55) 5px,transparent 6px) 0 0/28px 28px', 'repeating-linear-gradient(-45deg,rgba(255,255,255,.5) 0 10px,transparent 10px 22px)', 'radial-gradient(circle at 10px 10px,rgba(255,255,255,.5) 5px,transparent 6px) 0 0/28px 28px', 'repeating-linear-gradient(-45deg,rgba(255,255,255,.45) 0 10px,transparent 10px 22px)'];
    const H = 280;
    body = `<div class="pf card"><div class="pl">${DATA.map((d, i) => {
      const h = Math.round(d.n / max * H);
      return `<div class="pc"><div class="bub">${d.n} คน</div>
        <div class="sit">${fruit(d.k, 120, { face: true })}${i === 0 ? '<svg class="crown" width="62" height="46" viewBox="0 0 70 50"><path d="M6 44L2 10l18 14L35 2l15 22 18-14-4 34z" fill="#FFC83D" stroke="#1C2A55" stroke-width="4" stroke-linejoin="round"/><circle cx="35" cy="30" r="5" fill="#F2553C"/></svg>' : ''}</div><div class="pb" style="height:${h}px;background:${pat[i]},${colors[i]}"></div><div class="pn">${d.th}</div></div>`;
    }).join('')}</div>
      <svg class="ground" width="1380" height="40" viewBox="0 0 1380 40"><path d="M0 20c40-16 80-16 120 0s80 16 120 0 80-16 120 0 80 16 120 0 80-16 120 0 80 16 120 0 80-16 120 0 80 16 120 0 80-16 120 0 80 16 120 0 80-16 120 0 80 16 120 0" fill="none" stroke="#1C2A55" stroke-width="5" stroke-linecap="round"/></svg>
      <svg style="position:absolute;right:70px;top:46px" width="120" height="90" viewBox="0 0 120 90"><path d="M20 10l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#F2553C"/><path d="M90 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#18B07F"/><circle cx="60" cy="70" r="6" fill="#3D7BFF"/></svg></div>`;
  } else {
    const H = 400, ticks = [0, 2, 4, 6, 8, 10, 12, 14];
    body = `<div class="fm card"><div class="cap">แผนภูมิแท่งที่ 4.1 จำนวนนักเรียนห้อง ม.1/2 จำแนกตามผลไม้ที่ชอบ (n = 35)</div>
      <div class="area"><div class="yt">จำนวนนักเรียน (คน)</div>
        <div class="ax">${ticks.map((v) => `<div class="tk" style="bottom:${v / 14 * H}px"><span>${v}</span></div>`).join('')}
          <div class="bars">${DATA.map((d) => `<div class="fb"><span>${d.n}</span><i style="height:${d.n / 14 * H}px"></i></div>`).join('')}</div></div></div>
      <div class="xs">${DATA.map((d) => `<span>${d.th}</span>`).join('')}</div>
      <div class="xt">ชนิดของผลไม้</div>
      <div class="src">ที่มา: แบบสำรวจนักเรียนห้อง ม.1/2 ภาคเรียนที่ 1</div></div>`;
  }
  const css = `
.pf{position:relative;margin-top:30px;height:640px;padding:30px 60px 0;overflow:hidden;background:#FFFDF6}
.pl{display:flex;justify-content:space-around;align-items:flex-end;height:520px;padding:0 40px}
.pc{position:relative;display:flex;flex-direction:column;align-items:center;width:200px}
.pb{width:170px;border-radius:40px 40px 18px 18px;border:5px solid #1C2A55}
.sit{margin-bottom:-26px;position:relative;z-index:2}
.bub{position:relative;margin-bottom:18px;padding:8px 18px;border-radius:18px;background:#1C2A55;color:#fff;font:800 28px KS}
.bub::after{content:"";position:absolute;left:50%;bottom:-12px;margin-left:-10px;border:10px solid transparent;border-top-color:#1C2A55;border-bottom:0}
.crown{position:absolute;top:-14px;left:-6px;transform:rotate(-24deg)}
.pn{margin-top:26px;font:800 30px KS;color:#1C2A55}
.ground{position:absolute;left:60px;bottom:132px}
.pb{position:relative;z-index:1}
.fm{position:relative;margin-top:30px;height:640px;padding:28px 60px 20px 40px;border-radius:12px;box-shadow:none;border:1px solid #D8DEEA}
.fm .cap{font:700 25px KS;color:#1C2A55;margin-left:110px}
.area{position:relative;display:flex;margin-top:30px;height:400px}
.yt{width:40px;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font:600 21px KS;color:#465069}
.ax{position:relative;flex:1;margin-left:70px;border-left:2px solid #1C2A55;border-bottom:2px solid #1C2A55}
.tk{position:absolute;left:0;right:0;height:0;border-top:1px solid #E3E7EF}
.tk span{position:absolute;left:-46px;top:-13px;width:34px;text-align:right;font:500 19px KS;color:#465069}
.tk::before{content:"";position:absolute;left:-8px;top:-1px;width:8px;border-top:2px solid #1C2A55}
.bars{position:absolute;inset:0;display:flex;justify-content:space-around;align-items:flex-end}
.fb{display:flex;flex-direction:column;align-items:center;width:150px}
.fb span{font:600 23px KS;color:#1C2A55;margin-bottom:6px}
.fb i{display:block;width:120px;background:#2F4A8A}
.xs{display:flex;justify-content:space-around;margin-left:150px;margin-top:12px;font:600 23px KS;color:#1C2A55}
.xs span{width:150px;text-align:center}
.xt{text-align:center;margin-left:150px;margin-top:6px;font:600 19px KS;color:#465069}
.src{position:absolute;left:40px;bottom:18px;font:italic 400 17px KS;color:#6A7390}`;
  return doc(o, css, `<div class="stage">${header(o, T.th, 'คณิตศาสตร์ ม.1 · บทที่ 4 สถิติ', 'ผลไม้ที่ห้อง ม.1/2 ชอบ', '')}${body}</div>`);
}

/** Font pair: a text-led definition slide. */
export function definition(o) {
  const ff = o.font === 'round' ? 'RD,KS' : 'KS';
  const ffd = o.font === 'round' ? 'RD,KSD' : 'KSD,KS';
  const css = `
.def{margin-top:30px;font:700 56px/1.38 ${ffd};color:#1C2A55;max-width:1380px}
.def mark{background:none;background-image:linear-gradient(transparent 62%,#FFD84D 62%,#FFD84D 92%,transparent 92%);color:inherit;padding:0 4px}
.ex{margin-top:36px;display:flex;align-items:center;gap:26px;padding:30px 34px}
.ex .lab{font:700 22px ${ff};color:#6A7390;margin-bottom:12px}
.chipsx{display:flex;gap:12px}
.cx{display:flex;align-items:center;gap:10px;padding:10px 18px 10px 10px;border-radius:999px;background:#F5F7FC;font:700 26px ${ff};color:#1C2A55}
.cx b{font:800 26px ${ffd};color:#2F66E8}
.cx.win{background:#FFF1C9}
.cx.win b{color:#F2553C}
.arrow{font:800 50px ${ff};color:#A9B3C9}
.ans{padding:20px 28px;border-radius:24px;background:#1C2A55;color:#fff;font:800 34px/1.3 ${ffd};white-space:nowrap}
.ans span{color:#FFC83D}
.tip{margin-top:30px;display:flex;align-items:center;gap:14px;font:600 27px/1.45 ${ff};color:#465069}
.try{position:absolute;left:84px;right:84px;bottom:56px;display:flex;align-items:center;gap:20px;padding:22px 28px;border-radius:24px;background:#FFF1C9;font:700 30px ${ff};color:#1C2A55}
.try .k{font:800 20px ${ff};letter-spacing:.06em;color:#8A5A00;background:#FFC83D;padding:8px 14px;border-radius:999px}
.try .nums{display:flex;gap:10px}
.try .nums b{width:54px;height:54px;border-radius:14px;background:#fff;display:grid;place-items:center;font:800 28px ${ffd}}
.try .q{margin-left:auto;padding:10px 22px;border-radius:16px;background:#fff;border:3px dashed #E0A800;font:800 30px ${ffd};color:#8A5A00}
.tip b{flex:none;width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#E2F6EE;color:#0B7050;font:800 24px ${ffd}}`;
  return doc(o, css, `<div class="stage">${header(o, T.th, 'บทที่ 4 · ค่ากลางของข้อมูล', 'ฐานนิยม (Mode)', '')}
    <div class="def">ฐานนิยม คือ ข้อมูลที่<mark>ซ้ำกันมากที่สุด</mark> หรือข้อมูลที่มีความถี่สูงที่สุดในชุดข้อมูล</div>
    <div class="ex card"><div><div class="lab">ตัวอย่าง: ผลไม้ที่ห้อง ม.1/2 ชอบ</div>
      <div class="chipsx">${DATA.map((d, i) => `<span class="cx${i === 0 ? ' win' : ''}">${fruit(d.k, 46)}${d.th} <b>${d.n}</b></span>`).join('')}</div></div>
      <span class="arrow">→</span><div class="ans">ฐานนิยม = <span>มะม่วง</span></div></div>
    <div class="tip"><b>!</b><span>ข้อมูลหนึ่งชุดอาจมีฐานนิยมมากกว่า 1 ค่า หรือไม่มีฐานนิยมเลยก็ได้</span></div></div>
    <div class="try"><span class="k">ลองตอบ</span><span>คะแนนสอบย่อย</span><span class="nums">${[7, 9, 8, 9, 6, 9, 8].map((n) => `<b>${n}</b>`).join('')}</span><span class="q">ฐานนิยม = ?</span></div>`);
}

/** Background pair: a review question. */
export function quizq(o) {
  const deco = o.bg === 'decorated';
  const css = `
.data{display:flex;gap:12px;margin-top:22px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:44px;width:1432px}
.tile{display:flex;align-items:center;gap:24px;height:250px;padding:0 40px;border-radius:32px;background:#fff;border:2px solid #E4E8F2;font:800 46px KSD,KS;color:#1C2A55;box-shadow:0 14px 30px rgba(28,42,85,.07)}
.tile .l{width:74px;height:74px;border-radius:22px;display:grid;place-items:center;font:800 36px KSD;color:#fff}
.tile .fr{margin-left:auto}
.timer{position:absolute;right:84px;top:118px;width:150px;height:150px;border-radius:50%;background:#fff;border:10px solid #FFC83D;display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 50px/1 KSD;color:#1C2A55;box-shadow:0 14px 30px rgba(28,42,85,.1)}
.timer small{display:block;font:700 18px/1.2 KS;color:#6A7390;margin-top:4px}
.deco{position:absolute;pointer-events:none}`;
  const decoLayer = deco ? `
    <div class="deco" style="inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(28,42,85,.14) 1.4px,transparent 1.8px);background-size:28px 28px"></div>
    <div class="deco" style="right:-150px;top:-180px;width:520px;height:520px;border-radius:50%;background:#FFE7A3"></div>
    <div class="deco" style="left:-110px;bottom:-140px;width:360px;height:360px;border-radius:90px;transform:rotate(24deg);background:#CDEFE2"></div>
    <div class="deco" style="right:280px;bottom:-90px;width:220px;height:220px;border-radius:50%;background:#E3DBFF"></div>
    <svg class="deco" style="left:0;top:0" width="1600" height="900" viewBox="0 0 1600 900">
      <path d="M1180 92l16 30 30 16-30 16-16 30-16-30-30-16 30-16z" fill="#F2553C"/>
      <path d="M560 40l10 18 18 10-18 10-10 18-10-18-18-10 18-10z" fill="#3D7BFF"/>
      <circle cx="1490" cy="420" r="16" fill="none" stroke="#8B6CF6" stroke-width="7"/>
      <circle cx="46" cy="300" r="12" fill="#FFC83D"/>
      <path d="M40 520q20-24 40 0t40 0 40 0" fill="none" stroke="#F2553C" stroke-width="7" stroke-linecap="round"/>
      <path d="M1440 760q20-24 40 0t40 0 40 0" fill="none" stroke="#3D7BFF" stroke-width="7" stroke-linecap="round"/>
      <path d="M1320 640l22 38h-44z" fill="#18B07F"/>
      <rect x="930" y="40" width="26" height="26" rx="6" transform="rotate(20 943 53)" fill="#8B6CF6"/>
      <circle cx="760" cy="860" r="10" fill="#3D7BFF"/>
    </svg>
    <div class="deco" style="left:1440px;top:250px;transform:rotate(14deg);filter:drop-shadow(0 6px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(0 8px 14px rgba(28,42,85,.2))">${fruit('mangosteen', 120)}</div>
    <div class="deco" style="left:-6px;top:752px;transform:rotate(-16deg);filter:drop-shadow(0 6px 0 #fff) drop-shadow(0 8px 14px rgba(28,42,85,.2))">${fruit('banana', 120)}</div>` : '';
  const lc = ['#3D7BFF', '#F2553C', '#18B07F', '#8B6CF6'];
  return doc({ ...o, bgColor: deco ? '#FFF8EC' : '#FFFFFF' }, css, `${decoLayer}<div class="stage">
    ${header(o, T.th, 'ทบทวน · ข้อ 3 จาก 5', 'จากข้อมูล ผลไม้ชนิดใดคือฐานนิยม?', '')}
    <div class="data">${DATA.map((d) => `<span class="pill">${d.th} ${d.n} คน</span>`).join('')}</div>
    <div class="tiles">${DATA.map((d, i) => `<div class="tile"><span class="l" style="background:${lc[i]}">${'ABCD'[i]}</span>${d.th}${fruit(d.k, 132)}</div>`).join('')}</div>
    <div class="timer">20<small>วินาที</small></div></div>`);
}

// ---------- the 10 pairs: a = left sample, b = right sample (keys match src/lib/quiz.ts) ----------
export const PAIRS = [
  { key: 'style', a: () => chartq({ style: 'modern' }), b: () => chartq({ style: 'notebook' }) },
  { key: 'colour', a: () => title({ palette: 'vivid' }), b: () => title({ palette: 'calm' }) },
  { key: 'visuals', a: () => intro({ visual: 'photo' }), b: () => intro({ visual: 'illus' }) },
  { key: 'density', a: () => one({}), b: () => dense({}) },
  { key: 'interaction', a: () => practice({ interact: 'many' }), b: () => practice({ interact: 'few' }) },
  { key: 'animation', a: () => chartq({ anim: 'rich' }), b: () => chartq({ anim: 'light' }) },
  { key: 'charts', a: () => chart({ chart: 'playful' }), b: () => chart({ chart: 'formal' }) },
  { key: 'font', a: () => definition({ font: 'round' }), b: () => definition({ font: 'sharp' }) },
  { key: 'background', a: () => quizq({ bg: 'plain' }), b: () => quizq({ bg: 'decorated' }) },
  { key: 'language', a: () => intro({ visual: 'illus', lang: 'th' }), b: () => intro({ visual: 'illus', lang: 'en' }) },
];
