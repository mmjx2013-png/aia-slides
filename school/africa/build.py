#!/usr/bin/env python3
"""Build build/film.html: the whole Africa film as one page (globe intro, persistent map, left panel, captions).
   ?shot=N   -> scene N at its final state (for QA screenshots)
   ?rec      -> waits for window.FILM.start() (for recording)"""
import json, shutil
from pathlib import Path
import script
HERE = Path(__file__).parent; B = HERE / 'build'; B.mkdir(exist_ok=True)
FONTS = HERE.parent.parent / 'teacher-slides' / 'unit4' / 'fonts'
(B / 'fonts').mkdir(exist_ok=True)
for f in ['Anuphan-Thai-400', 'Anuphan-Thai-600', 'Anuphan-Thai-700', 'Inter-Regular', 'Inter-SemiBold', 'Inter-Bold', 'Inter-ExtraBold']:
    shutil.copy(FONTS / (f + '.woff2'), B / 'fonts')
timing = json.load(open(B / 'timing.json'))
data = {'topics': script.TOPICS, 'scenes': script.S, 'timing': timing, 'group': {'title': 'ภูมิศาสตร์ทวีปแอฟริกา', 'line': 'งานกลุ่ม วิชาสังคมศึกษา · ชั้น ม.2/13'}}

CSS = r"""
@font-face{font-family:Anuphan;src:url(fonts/Anuphan-Thai-400.woff2);font-weight:400;unicode-range:U+0E00-0E7F}
@font-face{font-family:Anuphan;src:url(fonts/Anuphan-Thai-600.woff2);font-weight:600;unicode-range:U+0E00-0E7F}
@font-face{font-family:Anuphan;src:url(fonts/Anuphan-Thai-700.woff2);font-weight:700 800;unicode-range:U+0E00-0E7F}
@font-face{font-family:Inter;src:url(fonts/Inter-Regular.woff2);font-weight:400}
@font-face{font-family:Inter;src:url(fonts/Inter-SemiBold.woff2);font-weight:600}
@font-face{font-family:Inter;src:url(fonts/Inter-Bold.woff2);font-weight:700}
@font-face{font-family:Inter;src:url(fonts/Inter-ExtraBold.woff2);font-weight:800}
@property --k{syntax:'<number>';inherits:true;initial-value:1}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#0B1320;overflow:hidden}
#st{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;font-family:Inter,Anuphan,'Noto Color Emoji',sans-serif;color:#13233A;
 background:radial-gradient(1400px 900px at 75% 45%,#E6F1F6,#CFE2EC 70%,#BFD6E3)}
#map{position:absolute;left:860px;top:0;width:1000px;height:1080px;overflow:visible;transition:opacity 1.2s}.g #map,.g #leg{opacity:0}
#world{transition:transform 1.6s cubic-bezier(.45,0,.2,1),--k 1.6s cubic-bezier(.45,0,.2,1)}
.ctx{fill:#E4E0D6;stroke:#fff;stroke-width:calc(.7px / var(--k))}
.cty{fill:#EADFC9;stroke:#fff;stroke-width:calc(.9px / var(--k));transition:fill .9s}
.lake{fill:#7FB4E0;stroke:#5E9BD0;stroke-width:calc(.6px / var(--k));opacity:0;transition:opacity .8s}.lake.on{opacity:1}
.riv{fill:none;stroke:#3B7DD8;stroke-width:calc(2.6px / var(--k));stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset 3s ease-in-out}.riv.on{stroke-dashoffset:0}
.lat{fill:none;stroke:#C0392B;stroke-width:calc(2px / var(--k));stroke-dasharray:calc(8px / var(--k)) calc(6px / var(--k));opacity:0;transition:opacity .8s}.lat.on{opacity:.85}
.latl{font:700 22px Anuphan,Inter;fill:#A93226;paint-order:stroke;stroke:#fff;stroke-width:5px;opacity:0;transition:opacity .8s}.latl.on{opacity:1}
.rt{fill:none;stroke-width:calc(5px / var(--k));stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset 2.6s ease-in-out}.rt.on{stroke-dashoffset:0}
.band{opacity:0;transition:opacity 1s}.bands.on .band{opacity:.92}
.mk,.lab{transition:transform 1.6s cubic-bezier(.45,0,.2,1)}
.mk .in{transform:scale(0);transition:transform .55s cubic-bezier(.3,1.6,.5,1)}.mk.on .in{transform:scale(1)}
.mk circle{fill:#fff;stroke:#13233A;stroke-width:2.5}.mk .e{font:28px 'Noto Color Emoji';text-anchor:middle;dominant-baseline:central}
.mk .t{font:700 23px Anuphan,Inter;fill:#13233A;paint-order:stroke;stroke:#fff;stroke-width:6px;stroke-linejoin:round}
.lab text{font:800 40px Anuphan,Inter;fill:#7A4A12;fill-opacity:.85;paint-order:stroke;stroke:#fff;stroke-opacity:.8;stroke-width:6px;text-anchor:middle;letter-spacing:.02em}
.lab .in{opacity:0;transition:opacity 1s}.lab.on .in{opacity:1}
#leg{position:absolute;right:40px;bottom:150px;background:#fffd;border-radius:14px;padding:12px 16px;font:600 20px Anuphan,Inter;opacity:0;transition:opacity .8s}#leg.on{opacity:1}
#leg i{display:inline-block;width:22px;height:16px;border-radius:4px;margin-right:8px;vertical-align:-2px}
#panel{position:absolute;left:64px;top:64px;width:780px;max-height:790px;background:#fff;border-radius:34px;box-shadow:0 24px 60px rgba(19,35,58,.16);padding:44px 48px;overflow:hidden;transition:opacity .6s,transform .6s}
#panel.off{opacity:0;transform:translateX(-40px)}
.chip{display:inline-block;font:700 25px Anuphan,Inter;letter-spacing:.04em;color:#B5532F;background:#FCEBDF;border-radius:999px;padding:7px 18px}
#panel h2{font:800 58px/1.12 Anuphan,Inter;margin:22px 0 26px;letter-spacing:-.01em}
.it{opacity:0;transform:translateY(22px);transition:opacity .6s,transform .6s}.it.on{opacity:1;transform:none}
.bl{display:flex;gap:18px;align-items:flex-start;font:600 38px/1.4 Anuphan,Inter;margin:0 0 26px}.bl b{flex:none;width:44px;height:44px;border-radius:14px;background:#E8F4EE;color:#2D6A4F;display:grid;place-items:center;font:800 26px Inter;margin-top:2px}
.bar{display:grid;grid-template-columns:230px 1fr 120px;align-items:center;gap:14px;margin:0 0 18px;font:600 28px Anuphan,Inter}
.bar .tr{height:34px;background:#F1ECE3;border-radius:10px;overflow:hidden}.bar .fl{height:100%;border-radius:10px;width:0;transition:width 1.4s cubic-bezier(.3,.7,.2,1)}
.bar .v{font:800 30px Inter;text-align:right}
.note{margin-top:22px;font:700 30px Anuphan,Inter;color:#B5532F}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:20px}.stat{background:#FAF6EF;border-radius:24px;padding:24px 26px}
.stat .e{font:44px 'Noto Color Emoji'}.stat .n{font:800 56px/1.1 Inter,Anuphan;margin:8px 0 6px;color:#13233A}.stat .l{font:600 28px/1.35 Anuphan,Inter;color:#3E4C63}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{background:#FAF6EF;border-radius:24px;padding:22px 24px;display:flex;gap:16px;align-items:flex-start}
.card .e{flex:none;width:68px;height:68px;border-radius:20px;background:#fff;display:grid;place-items:center;font:40px 'Noto Color Emoji'}
.card .tt{font:800 32px/1.2 Anuphan,Inter}.card .tx{font:600 26px/1.35 Anuphan,Inter;color:#3E4C63;margin-top:6px}
.menu{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px}.mi{display:flex;gap:14px;align-items:center;font:700 27px/1.25 Anuphan,Inter}.mi b{flex:none;width:48px;height:48px;border-radius:15px;background:#13233A;color:#fff;display:grid;place-items:center;font:800 24px Inter}
.leg2{display:grid;gap:16px}.lg{display:flex;gap:16px;align-items:center;font:700 32px Anuphan,Inter}.lg i{width:56px;height:36px;border-radius:10px;flex:none}
.src{font:600 29px/1.45 Anuphan,Inter;color:#3E4C63;margin:0 0 12px}
#tcard{position:absolute;left:64px;top:64px;width:780px;height:830px;border-radius:34px;background:linear-gradient(150deg,#13233A,#1F3A5C);color:#fff;padding:60px 56px;opacity:0;transition:opacity .6s;pointer-events:none;overflow:hidden}
#tcard.on{opacity:1}#tcard .n{font:800 300px/1 Inter;color:#F2A541;letter-spacing:-.04em}#tcard .k{font:700 28px Anuphan,Inter;color:#9FB7D6;margin-top:30px}#tcard .h{font:800 72px/1.15 Anuphan,Inter;margin-top:12px}
#cap{position:absolute;left:64px;bottom:40px;max-width:1180px;background:rgba(11,19,32,.84);color:#fff;font:600 38px/1.42 Anuphan,Inter;padding:14px 32px;border-radius:20px;text-align:left;transition:opacity .25s}
#cap:empty{opacity:0}
#gl{position:absolute;inset:0;transition:opacity 1.2s}#gl.off{opacity:0}
#gt{position:absolute;left:110px;top:120px;color:#fff;transition:opacity 1s}#gt .a{font:800 92px/1.1 Anuphan,Inter;text-shadow:0 4px 30px #0008}#gt .b{font:700 36px Inter;color:#F2A541;margin-top:14px;letter-spacing:.06em}#gt .c{font:600 30px Anuphan,Inter;color:#CFE0F2;margin-top:24px}
#prog{position:absolute;left:0;bottom:0;height:6px;background:#F2A541;width:0}
.still *{transition:none!important}
"""

JS = r"""
const D = window.DATA, G = window.GEO, PAD = 1.2, NS = 'http://www.w3.org/2000/svg';
const COL = {sand:'#EADFC9',sand2:'#F2C879',terra:'#E07A5F',green:'#81B29A',forest:'#2D6A4F',teal:'#2A9D8F',blue:'#5B8DEF',violet:'#8E7CC3',gold:'#E9B949',red:'#D62828',gray:'#9AA5B1',all:'#F0D29A'};
const $ = s => document.querySelector(s), el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const sv = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const P = G.proj, r = Math.PI / 180;
function prj(lon, lat) { const l = lon * r, p = lat * r, l0 = P.lon0 * r, p0 = P.lat0 * r;
  const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0)));
  return [P.cx + P.s * k * Math.cos(p) * Math.sin(l - l0), P.cy - P.s * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))]; }
const line = pts => 'M' + pts.map(q => prj(q[0], q[1]).map(v => v.toFixed(1)).join(' ')).join(' L');
// ---------- static map ----------
const svg = $('#map'), world = sv('g', {id: 'world'}, svg);
const gctx = sv('g', {}, world); G.context.forEach(d => sv('path', {d, class: 'ctx'}, gctx));
const gcty = sv('g', {}, world), CT = {};
for (const k in G.countries) CT[k] = sv('path', {d: G.countries[k].d, class: 'cty'}, gcty);
const clip = sv('clipPath', {id: 'af'}, sv('defs', {}, svg)); for (const k in G.countries) sv('path', {d: G.countries[k].d}, clip);
const gb = sv('g', {class: 'bands', 'clip-path': 'url(#af)'}, world);
const band = (a, b, c, lo1 = -25, lo2 = 60) => { const pts = []; for (let x = lo1; x <= lo2; x += 2.5) pts.push([x, a]); for (let x = lo2; x >= lo1; x -= 2.5) pts.push([x, b]); sv('path', {d: line(pts) + ' Z', fill: c, class: 'band'}, gb); };
[[31, 40, '#A8C5E8'], [18, 31, '#F4A261'], [13, 18, '#E9C46A'], [6, 13, '#95D5B2'], [-5, 6, '#2D6A4F'], [-17, -5, '#95D5B2'], [-30, -17, '#F4A261'], [-40, -30, '#A8C5E8']].forEach(b => band(b[0], b[1], b[2]));
sv('path', {d: line([[36, 15], [40.5, 14], [42.5, 9], [40, 4], [38, -1], [36.5, -4.5], [34, -3], [34.5, 2], [35, 8], [36, 15]]) + ' Z', fill: '#9B8EC4', class: 'band'}, gb);
const glk = sv('g', {}, world), LK = {}; for (const k in G.lakes) LK[k] = sv('path', {d: G.lakes[k], class: 'lake'}, glk);
const grv = sv('g', {}, world), RV = {}; for (const k in G.rivers) RV[k] = sv('path', {d: G.rivers[k], class: 'riv', pathLength: 1}, grv);
const glat = sv('g', {}, world), LAT = {};
const latd = {eq: [0, 'เส้นศูนย์สูตร'], tc: [23.44, 'ทรอปิกออฟแคนเซอร์'], tcap: [-23.44, 'ทรอปิกออฟแคปริคอร์น']};
for (const k in latd) { const pts = []; for (let x = -30; x <= 62; x += 2) pts.push([x, latd[k][0]]); const q = prj(44, latd[k][0] + 1.2);
  LAT[k] = [sv('path', {d: line(pts), class: 'lat'}, glat), Object.assign(sv('text', {x: q[0], y: q[1], class: 'latl'}, glat), {textContent: latd[k][1]})]; }
{ const pts = []; for (let y = -42; y <= 44; y += 2) pts.push([0, y]); const q = prj(1.2, 36.5); LAT.pm = [sv('path', {d: line(pts), class: 'lat'}, glat), Object.assign(sv('text', {x: q[0], y: q[1], class: 'latl'}, glat), {textContent: 'เมริเดียนแรก 0°'})]; }
const grt = sv('g', {}, world), gov = sv('g', {}, world);
// ---------- globe ----------
const cv = $('#gl'), cx = cv.getContext('2d');
function globe(lon0, lat0, R, thai) {
  const W = 1920, H = 1080, X = W * .62, Y = H / 2; cx.clearRect(0, 0, W, H);
  const bg = cx.createRadialGradient(X, Y, R * .2, X, Y, R * 2.4); bg.addColorStop(0, '#16304F'); bg.addColorStop(1, '#070D18'); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
  cx.save(); cx.shadowColor = '#5FA8D3'; cx.shadowBlur = 60; const oc = cx.createRadialGradient(X - R * .35, Y - R * .35, R * .1, X, Y, R);
  oc.addColorStop(0, '#5FA8D3'); oc.addColorStop(1, '#1B4F8A'); cx.fillStyle = oc; cx.beginPath(); cx.arc(X, Y, R, 0, 7); cx.fill(); cx.restore();
  const l0 = lon0 * r, p0 = lat0 * r;
  const pt = (lon, lat) => { const l = lon * r, p = lat * r, c = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0);
    let x = Math.cos(p) * Math.sin(l - l0), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0);
    if (c < 0) { const m = Math.hypot(x, y) || 1; x /= m; y /= m; } return [X + R * x, Y - R * y, c]; };
  cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.lineWidth = 1;
  for (let la = -60; la <= 60; la += 30) { cx.beginPath(); let f = 1; for (let lo = -180; lo <= 180; lo += 4) { const q = pt(lo, la); if (q[2] < 0) { f = 1; continue; } f ? cx.moveTo(q[0], q[1]) : cx.lineTo(q[0], q[1]); f = 0; } cx.stroke(); }
  for (let lo = -180; lo < 180; lo += 30) { cx.beginPath(); let f = 1; for (let la = -90; la <= 90; la += 4) { const q = pt(lo, la); if (q[2] < 0) { f = 1; continue; } f ? cx.moveTo(q[0], q[1]) : cx.lineTo(q[0], q[1]); f = 0; } cx.stroke(); }
  for (const g of G.globe) { let vis = 0; cx.beginPath(); g.p.forEach((q, i) => { const s = pt(q[0], q[1]); if (s[2] > 0) vis = 1; i ? cx.lineTo(s[0], s[1]) : cx.moveTo(s[0], s[1]); });
    if (!vis) continue; cx.closePath(); cx.fillStyle = g.a ? '#F2A541' : '#D8E6CF'; cx.fill(); cx.strokeStyle = g.a ? '#FFE2B0' : 'rgba(255,255,255,.5)'; cx.lineWidth = 1; cx.stroke(); }
  const sh = cx.createRadialGradient(X - R * .4, Y - R * .4, R * .2, X, Y, R * 1.02); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,20,.45)');
  cx.fillStyle = sh; cx.beginPath(); cx.arc(X, Y, R, 0, 7); cx.fill();
  if (thai > 0) { const q = pt(100.5, 13.7); if (q[2] > 0) { cx.globalAlpha = thai; cx.fillStyle = '#E63946'; cx.beginPath(); cx.arc(q[0], q[1], 11, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 3; cx.stroke();
    cx.font = '700 34px Anuphan, Inter'; cx.fillStyle = '#fff'; cx.fillText('ประเทศไทย', q[0] + 20, q[1] - 14); cx.globalAlpha = 1; } }
}
// ---------- scenes ----------
const S = D.scenes; let T = 0; S.forEach((s, i) => { s.ad = D.timing[i].d; s.dur = s.ad + PAD + (i === 0 ? 3 : 0) + (i === S.length - 1 ? 4 : 0); s.t0 = T; T += s.dur; });
D.total = T;
const firstOfTopic = i => i > 0 && S[i].t >= 1 && S[i].t <= 10 && S[i - 1].t !== S[i].t;
let still = false, cur = -1, curK = 1;
function setZoom(z) { const k = z ? z[2] : 1, c = z ? prj(z[0], z[1]) : [500, 540]; curK = k;
  world.style.setProperty('--k', k); world.style.transform = `translate(500px,540px) scale(${k}) translate(${-c[0]}px,${-c[1]}px)`;
  gov.querySelectorAll('.mk,.lab').forEach(g => { g.style.transform = `translate(${g._x}px,${g._y}px) scale(${1 / k})`; }); }
function popCol(p) { return p > 1e8 ? '#A4301C' : p > 5e7 ? '#D9573B' : p > 2e7 ? '#EE8A5B' : p > 5e6 ? '#F6B98A' : '#FBE3C9'; }
function apply(i) {
  const s = S[i], m = s.m, p = s.p, dly = f => still ? 0 : f * s.ad; cur = i;
  // globe vs map
  $('#gl').classList.toggle('off', p.type !== 'globe'); $('#st').classList.toggle('g', p.type === 'globe'); $('#gt').style.opacity = p.type === 'globe' ? 1 : 0;
  // countries
  for (const k in CT) { let c = COL.sand; if (m.choro === 'pop') c = popCol(G.countries[k].pop);
    else if (m.hl === 'all') c = COL.all; else if (m.hl && !Array.isArray(m.hl) && m.hl[k]) c = COL[m.hl[k]] || m.hl[k];
    CT[k].style.fill = c; }
  $('#leg').classList.toggle('on', m.choro === 'pop');
  gb.classList.toggle('on', !!m.bands);
  const riv = m.riv === 'all' ? Object.keys(RV) : (m.riv || []), lak = m.lak === 'all' ? Object.keys(LK) : (m.lak || []);
  for (const k in RV) { const on = riv.includes(k); RV[k].style.transitionDelay = on ? dly(.12) + 's' : '0s'; RV[k].classList.toggle('on', on); }
  for (const k in LK) LK[k].classList.toggle('on', lak.includes(k));
  for (const k in LAT) { const on = (m.ln || []).includes(k); LAT[k].forEach(e => { e.style.transitionDelay = on ? dly(.1 + .1 * Object.keys(LAT).indexOf(k)) + 's' : '0s'; e.classList.toggle('on', on); }); }
  grt.innerHTML = ''; (m.rt || []).forEach((rt, j) => { const e = sv('path', {d: line(rt[0]), class: 'rt', pathLength: 1, stroke: COL[rt[1]] || rt[1]}, grt);
    e.style.transitionDelay = dly(.15 + .12 * j) + 's'; requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('on'))); if (still) e.classList.add('on'); });
  gov.innerHTML = '';
  (m.lab || []).forEach((L, j) => { const q = prj(L[0], L[1]); const g = sv('g', {class: 'lab'}, gov); g._x = q[0]; g._y = q[1];
    const t = sv('text', {class: 'in'}, g); t.textContent = L[2]; t.style.transitionDelay = dly(.1 + .1 * j) + 's'; });
  const mks = m.mk || []; mks.forEach((M, j) => { const q = prj(M[0], M[1]); const g = sv('g', {class: 'mk'}, gov); g._x = q[0]; g._y = q[1];
    const inn = sv('g', {class: 'in'}, g); inn.style.transitionDelay = dly(.12 + .6 * j / Math.max(1, mks.length)) + 's';
    sv('circle', {r: 23}, inn); const e = sv('text', {class: 'e'}, inn); e.textContent = M[3];
    const left = q[0] > 760; const t = sv('text', {class: 't', x: left ? -32 : 32, y: 8, 'text-anchor': left ? 'end' : 'start'}, inn); t.textContent = M[2]; });
  setZoom(m.zoom);
  requestAnimationFrame(() => requestAnimationFrame(() => gov.querySelectorAll('.mk,.lab').forEach(g => g.classList.add('on'))));
  if (still) gov.querySelectorAll('.mk,.lab').forEach(g => g.classList.add('on'));
  // panel
  const pn = $('#panel'); pn.innerHTML = ''; pn.classList.toggle('off', p.type === 'globe');
  const tn = s.t, chip = tn >= 1 && tn <= 10 ? `หัวข้อ ${tn}/10 · ${D.topics[tn - 1]}` : (tn === 0 ? 'บทนำ' : 'สรุป');
  pn.appendChild(el('span', 'chip', p.k || chip)); if (p.h) pn.appendChild(el('h2', '', p.h));
  const items = [], add = e => { e.classList.add('it'); items.push(e); return e; };
  if (p.type === 'list' || p.type === 'sources') (p.b || []).forEach((b, j) => pn.appendChild(add(el('div', p.type === 'list' ? 'bl' : 'src', (p.type === 'list' ? '<b>✓</b>' : '• ') + '<span>' + b + '</span>'))));
  if (p.type === 'bars') { const mx = Math.max(...p.items.map(x => x[1]));
    p.items.forEach(x => { const row = add(el('div', 'bar', `<span>${x[0]}</span><div class=tr><div class=fl style="background:${COL[x[2]] || x[2]}"></div></div><span class=v>${x[1].toLocaleString('en-US')}</span>`)); row._w = 100 * x[1] / mx; pn.appendChild(row); });
    if (p.note) pn.appendChild(add(el('div', 'note', p.note))); }
  if (p.type === 'stats') { const g = el('div', 'stats'); pn.appendChild(g); p.items.forEach(x => g.appendChild(add(el('div', 'stat', `<div class=e>${x[2]}</div><div class=n>${x[0]}</div><div class=l>${x[1]}</div>`)))); }
  if (p.type === 'cards') { const g = el('div', 'cards'); pn.appendChild(g); p.items.forEach(x => g.appendChild(add(el('div', 'card', `<div class=e>${x[0]}</div><div><div class=tt>${x[1]}</div>${x[2] ? `<div class=tx>${x[2]}</div>` : ''}</div>`)))); }
  if (p.type === 'menu') { const g = el('div', 'menu'); pn.appendChild(g); D.topics.forEach((t, j) => g.appendChild(add(el('div', 'mi', `<b>${j + 1}</b><span>${t}</span>`)))); }
  if (p.type === 'legend') { const g = el('div', 'leg2'); pn.appendChild(g); p.items.forEach(x => g.appendChild(add(el('div', 'lg', `<i style="background:${x[0]}"></i>${x[1]}`)))); }
  const intro = firstOfTopic(i) && !still, base = intro ? 2.4 : 0;
  items.forEach((e, j) => { e.style.transitionDelay = (still ? 0 : base + .3 + dly(.55) * j / Math.max(1, items.length)) + 's';
    const go = () => { e.classList.add('on'); const f = e.querySelector('.fl'); if (f) { f.style.transitionDelay = e.style.transitionDelay; f.style.width = e._w + '%'; } };
    still ? go() : requestAnimationFrame(() => requestAnimationFrame(go)); });
  const tc = $('#tcard'); if (intro) { tc.innerHTML = `<div class=n>${tn}</div><div class=k>หัวข้อที่ ${tn} จาก 10</div><div class=h>${D.topics[tn - 1]}</div>`; tc.classList.add('on'); setTimeout(() => tc.classList.remove('on'), 2300); } else tc.classList.remove('on');
}
// captions
const CH = S.map(s => { const parts = s.say.split('|').map(x => x.trim()).filter(Boolean), n = parts.reduce((a, b) => a + b.length, 0); let acc = 0;
  return parts.map(x => { const a = acc; acc += x.length; return [a / n, x]; }); });
function caption(i, tt) { const s = S[i], f = (tt - (i === 0 ? 3 : 0)) / s.ad; let txt = '';
  if (f >= 0 && f <= 1.02) CH[i].forEach(c => { if (f >= c[0]) txt = c[1]; }); $('#cap').textContent = txt; }
function frame(t) {   // t = seconds since start
  let i = S.findIndex(s => t < s.t0 + s.dur); if (i < 0) i = S.length - 1;
  if (i !== cur) apply(i);
  const s = S[i], tt = t - s.t0; caption(i, tt); $('#prog').style.width = (100 * t / D.total) + '%';
  if (S[i].p.type === 'globe') { const u = Math.min(1, tt / (s.dur * .8)), e = u * u * (3 - 2 * u); globe(100.5 + (17 - 100.5) * e, 12 + (4 - 12) * e, 400 + 40 * e, 1 - Math.max(0, (u - .55) / .3)); }
}
function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); $('#st').style.transform = `scale(${k})`; }
addEventListener('resize', fit); fit();
const qs = new URLSearchParams(location.search);
window.FILM = { total: () => D.total, scenes: S.length, start() { const t0 = performance.now(); const loop = () => { const t = (performance.now() - t0) / 1000; frame(t); if (t < D.total + 1) requestAnimationFrame(loop); else window.FILM.done = true; }; loop(); },
  shot(i) { still = true; document.body.classList.add('still'); cur = -1; apply(i); caption(i, S[i].ad * .55 + (i === 0 ? 3 : 0)); if (S[i].p.type === 'globe') globe(30, 6, 430, 0); } };
document.fonts.ready.then(() => { if (qs.has('shot')) window.FILM.shot(+qs.get('shot')); else if (!qs.has('rec')) window.FILM.start(); window.FILM.ready = true; });
"""

html = f"""<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>ภูมิศาสตร์ทวีปแอฟริกา</title><style>{CSS}</style></head>
<body><div id="st"><canvas id="gl" width="1920" height="1080"></canvas>
<div id="gt"><div class="a">{data['group']['title']}</div><div class="b">GEOGRAPHY OF AFRICA</div><div class="c">{data['group']['line']}</div></div>
<svg id="map" viewBox="0 0 1000 1080"></svg>
<div id="leg"><div style="margin-bottom:6px">ประชากร (ล้านคน, ประมาณการ)</div><div><i style="background:#FBE3C9"></i>&lt; 5</div><div><i style="background:#F6B98A"></i>5–20</div><div><i style="background:#EE8A5B"></i>20–50</div><div><i style="background:#D9573B"></i>50–100</div><div><i style="background:#A4301C"></i>&gt; 100</div></div>
<div id="panel" class="off"></div><div id="tcard"></div><div id="cap"></div><div id="prog"></div></div>
<script src="geo.js"></script><script>window.DATA={json.dumps(data, ensure_ascii=False)};</script><script>{JS}</script></body></html>"""
(B / 'film.html').write_text(html, encoding='utf-8')
tot = sum(t['d'] for t in timing) + 1.2 * len(timing) + 7
print('wrote build/film.html; film length', round(tot / 60, 2), 'min')
