// Drives every interactive tool on the demo preview and checks that it really works.
//   cd teacher-slides/unit4 && python3 build.py --only _tools-demo && node tests/tools.test.cjs
// Runs four times: 1920x1080 mouse, 1280x720 mouse, 1280x720 touch, 1024x768 touch. Prints PASS/FAIL per check; exit code 1 on any failure.
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'preview-_tools-demo.html');
const ONLY = process.argv[2] || '';   // optional filter, e.g. node tests/tools.test.cjs touch
const CONFIGS = [
  { name: '1920x1080 mouse', w: 1920, h: 1080, touch: false },
  { name: '1280x720 mouse', w: 1280, h: 720, touch: false },
  { name: '1280x720 touch', w: 1280, h: 720, touch: true },
  { name: '1024x768 touch', w: 1024, h: 768, touch: true }
].filter(c => c.name.includes(ONLY));
let failed = 0, total = 0;

/* ---- hand-drawn test strokes, in the drawing surface's own pixels ---- */
const wob = (i, a) => Math.sin(i * 1.7) * a + Math.sin(i * 0.6 + 1) * a * 0.6;
function wobblyLine(x0, y0, x1, y1) { const p = []; for (let i = 0; i <= 30; i++) { const t = i / 30; p.push([x0 + (x1 - x0) * t + wob(i, 2), y0 + (y1 - y0) * t + wob(i + 3, 3)]); } return p; }
function handCircle(cx, cy, r) { const p = []; for (let i = 0; i <= 44; i++) { const a = -1.2 + i / 44 * (Math.PI * 2 - 0.12), rr = r * (1 + wob(i, 0.022)); p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return p; }
function handRect(x, y, w, h) {
  const c = [[x, y], [x + w, y + 3], [x + w - 4, y + h], [x + 3, y + h - 3], [x + 2, y + 8]], p = [];
  for (let s = 0; s < 4; s++) for (let i = 0; i < 12; i++) { const t = i / 12; p.push([c[s][0] + (c[s + 1][0] - c[s][0]) * t + wob(i + s, 1.5), c[s][1] + (c[s + 1][1] - c[s][1]) * t + wob(i + s + 5, 1.5)]); }
  p.push(c[4]); return p;
}
function handTri(x, y, w, h) {
  const c = [[x + w / 2, y], [x + w, y + h], [x, y + h - 3], [x + w / 2 - 6, y + 5]], p = [];
  for (let s = 0; s < 3; s++) for (let i = 0; i < 12; i++) { const t = i / 12; p.push([c[s][0] + (c[s + 1][0] - c[s][0]) * t + wob(i + s, 1.2), c[s][1] + (c[s + 1][1] - c[s][1]) * t + wob(i + s + 5, 1.2)]); }
  p.push(c[3]); return p;
}
function digit2(x, y, w, h) {   /* a written "2": arc, diagonal, foot */
  const p = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (1.05 - i / 14 * 1.25); p.push([x + w / 2 - Math.cos(a) * w / 2 * -1, y + h * 0.28 - Math.sin(a) * h * 0.28]); }
  for (let i = 1; i <= 10; i++) { const t = i / 10, s = p[14]; p.push([s[0] + (x - s[0]) * t, s[1] + (y + h - s[1]) * t]); }
  for (let i = 1; i <= 8; i++) p.push([x + w * i / 8, y + h + wob(i, 1)]);
  return p;
}
function letterS(x, y, w, h) { const p = []; for (let i = 0; i <= 40; i++) { const t = i / 40; p.push([x + w / 2 + Math.cos(t * Math.PI * 2 * 0.95 + 0.4) * w / 2 * (t < 0.5 ? 1 : -1) * (t < 0.5 ? 1 : 1), y + h * t]); } return p; }
function digit0(x, y, w, h) { const p = []; for (let i = 0; i <= 30; i++) { const a = -1.5 + i / 30 * 6.2; p.push([x + w / 2 + Math.cos(a) * w / 2, y + h / 2 + Math.sin(a) * h / 2]); } return p; }

async function run(cfg) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, hasTouch: cfg.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || /cancel/i.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) errors.push('external request: ' + r.url()); });
  const cdp = cfg.touch ? await ctx.newCDPSession(page) : null;
  const ok = (name, cond, extra) => { total++; if (!cond) failed++; console.log((cond ? 'PASS' : 'FAIL') + '  [' + cfg.name + '] ' + name + (cond || extra === undefined ? '' : '  -> ' + JSON.stringify(extra))); };
  const sleep = ms => page.waitForTimeout(ms);

  /* ---- input helpers: mouse or real touch points ---- */
  async function tap(x, y) { if (cfg.touch) { await page.touchscreen.tap(x, y); await sleep(130); } else await page.mouse.click(x, y); }   // 130 ms: lets the tap guard act when Chrome swallows the click of a tap right after a flick
  async function drag(pts) {
    if (cfg.touch) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
      for (let i = 1; i < pts.length; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts[i][0], y: pts[i][1] }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
      for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i][0], pts[i][1]);
      await page.mouse.up();
    }
  }
  const dragLine = (a, b, n = 8) => { const p = []; for (let i = 0; i <= n; i++) p.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return drag(p); };
  async function centre(sel) { return page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); }
  async function tapEl(sel) { const c = await centre(sel); await tap(c[0], c[1]); }
  const act = (id, a) => tapEl('#' + id + ' [data-act="' + a + '"]');
  const fb = id => page.evaluate(id => { const f = document.querySelector('#' + id + ' .tw-fb'); return { cls: f.className, text: f.textContent }; }, id);
  const W = (id, expr) => page.evaluate(([id, expr]) => { const w = document.getElementById(id).__w; return new Function('w', 'return ' + expr)(w); }, [id, expr]);
  const deck = () => page.evaluate(() => __deck.state());
  async function go(k) { await page.evaluate(k => __deck.jump(k, 0), k); await sleep(1500); }
  async function stay(k, what) { const s = await deck(); ok(what + ': the slide did not change', s.i === k && s.st === 0, s); }

  await page.goto(FILE);
  await page.evaluate(() => document.fonts.ready);
  ok('no answer is shown on load', await page.evaluate(() => !document.querySelector('.w-shown, .c.picked')));
  ok('every widget is rendered', await page.evaluate(() => __tools.widgets.length === 17 && [...document.querySelectorAll('[class^="w-"]')].every(w => w.children.length > 0)), await page.evaluate(() => __tools.widgets.length));

  /* ---------- MCQ ---------- */
  await go(0);
  await tapEl('#td-mcq-ch .c:nth-child(1)');
  ok('mcq: a wrong choice turns coral', await page.evaluate(() => document.querySelector('#td-mcq-ch .c:nth-child(1)').classList.contains('wrong')));
  await sleep(1100);
  ok('mcq: the wrong mark clears after 0.8 s', await page.evaluate(() => !document.querySelector('#td-mcq-ch .c.wrong')));
  ok('mcq: the right choice is not marked yet', await page.evaluate(() => !document.querySelector('#td-mcq-ch .c.picked')));
  await tapEl('#td-mcq-ch .c.ok');
  ok('mcq: the right choice turns mint', await page.evaluate(() => document.querySelector('#td-mcq-ch .c.ok').classList.contains('picked')));
  await page.evaluate(() => document.querySelector('#td-mcq-ch .c:nth-child(2)').focus()); await page.keyboard.press('Enter');
  ok('mcq: Enter on a focused choice works', await page.evaluate(() => document.querySelector('#td-mcq-ch .c:nth-child(2)').classList.contains('wrong')));
  await stay(0, 'mcq');
  await page.evaluate(() => __deck.next()); await sleep(300);
  ok('mcq: the beat still reveals the answer', await page.evaluate(() => document.querySelector('#td-mcq').classList.contains('b1') && getComputedStyle(document.querySelector('#td-mcq .ans')).opacity > 0.5));

  /* ---------- typed answers ---------- */
  await go(1);
  const type = async (id, text) => { await tapEl('#' + id + ' .tw-in'); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.type(text); };
  ok('input: numeric answers ask for the number keyboard', await page.evaluate(() => document.querySelector('#td-in-num .tw-in').inputMode === 'decimal' && document.querySelector('#td-in-text .tw-in').inputMode !== 'decimal'));
  await type('td-in-num', '100'); await page.keyboard.press('Enter');
  let f = await fb('td-in-num');
  ok('input: wrong answer + Enter says try again', / no/.test(f.cls) && /Try again/.test(f.text), f);
  await type('td-in-num', '105'); await act('td-in-num', 'check');
  f = await fb('td-in-num');
  ok('input: after 2 wrong tries the hint is "Check your working"', /Check your working/.test(f.text), f);
  ok('input: Show answer is offered after 2 tries', await page.evaluate(() => { const b = document.querySelector('#td-in-num [data-act="show"]'); return !b.disabled && b.classList.contains('nudge'); }));
  await type('td-in-num', ' 110 Cups '); await act('td-in-num', 'check');
  f = await fb('td-in-num');
  ok('input: "110 Cups" with spaces is accepted', / ok/.test(f.cls), f);
  await type('td-in-num', '1,10'); await page.keyboard.press('Enter');
  ok('input: thousands commas and spaces are ignored', / ok/.test((await fb('td-in-num')).cls));
  await type('td-in-text', '  thursday'); await page.keyboard.press('Enter');
  ok('input: text answers ignore case and spaces', / ok/.test((await fb('td-in-text')).cls));
  await type('td-in-text', 'Friday'); await act('td-in-text', 'check');
  await act('td-in-text', 'show');
  ok('answer tab: a typed-answer box shows no tab and no frame', await page.evaluate(() => { const w = document.getElementById('td-in-text'); return getComputedStyle(w, '::after').display === 'none' && !getComputedStyle(w).boxShadow.includes('31, 191, 159'); }));
  ok('input: Show answer gives a clear answer state', await page.evaluate(() => document.getElementById('td-in-text').classList.contains('w-shown') && document.querySelector('#td-in-text .tw-in').value === 'Thursday'));
  await act('td-in-text', 'show');
  ok('input: Hide answer brings back the student\'s text', await page.evaluate(() => !document.getElementById('td-in-text').classList.contains('w-shown') && document.querySelector('#td-in-text .tw-in').value === 'Friday'));
  await act('td-in-text', 'reset');
  ok('input: Reset clears', await page.evaluate(() => document.querySelector('#td-in-text .tw-in').value === ''));
  await page.evaluate(() => document.activeElement.blur());
  await stay(1, 'input');

  /* ---------- handwriting + auto shapes ---------- */
  const padPts = (id, pts) => page.evaluate(([id, pts]) => pts.map(p => { const c = document.getElementById(id).__w.at(p[0], p[1]); return [c.x, c.y]; }), [id, pts]);
  const pad = await W('td-write', '({W:w.W,H:w.H})');
  const ink = (expr) => W('td-write', expr);
  await drag(await padPts('td-write', digit2(90, 20, 70, 110)));
  await sleep(250);
  ok('write: a stroke is drawn', await ink('w.ink.count()') === 1);
  ok('write: a written "2" stays freehand', (await ink('w.ink.shapes()'))[0] === 'free', await ink('w.ink.shapes()'));
  await drag(await padPts('td-write', letterS(200, 20, 70, 120)));
  await sleep(250);
  ok('write: a written "S" stays freehand', (await ink('w.ink.shapes()'))[1] === 'free', await ink('w.ink.shapes()'));
  await drag(await padPts('td-write', digit0(300, 40, 44, 70)));
  await sleep(250);
  ok('write: a small written "0" stays freehand', (await ink('w.ink.shapes()'))[2] === 'free', await ink('w.ink.shapes()'));
  await drag(await padPts('td-write', wobblyLine(80, pad.H - 14, pad.W - 60, pad.H - 22)));
  await sleep(250);
  ok('write: a wobbly line becomes a straight line', (await ink('w.ink.shapes()'))[3] === 'line' && await ink('w.ink.st.strokes[3].pts.length') === 2, await ink('w.ink.shapes()'));
  await drag(await padPts('td-write', handCircle(pad.W - 110, pad.H / 2, Math.min(64, pad.H / 2 - 8))));
  await sleep(250);
  ok('write: a hand circle becomes a clean circle', (await ink('w.ink.shapes()'))[4] === 'circle', await ink('w.ink.shapes()'));
  await act('td-write', 'undo');
  ok('write: Undo first restores the hand-drawn stroke', await ink('w.ink.count()') === 5 && (await ink('w.ink.shapes()'))[4] === 'free');
  await act('td-write', 'undo');
  ok('write: Undo again removes the stroke', await ink('w.ink.count()') === 4);
  await act('td-write', 'auto');
  await drag(await padPts('td-write', handCircle(pad.W - 110, pad.H / 2, Math.min(64, pad.H / 2 - 8))));
  await sleep(250);
  ok('write: with Auto shapes off the circle stays freehand', (await ink('w.ink.shapes()'))[4] === 'free' && await ink('!w.ink.auto'));
  await act('td-write', 'auto');
  ok('write: the ink is really on the canvas', await page.evaluate(() => { const c = document.querySelector('#td-write canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n > 200; }));
  await act('td-write', 'clear');
  ok('write: Clear empties the box', await ink('w.ink.count()') === 0 && await page.evaluate(() => { const c = document.querySelector('#td-write canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; }));
  await stay(1, 'write');

  /* ---------- sorting ---------- */
  await go(2);
  const itemC = k => page.evaluate(k => { const r = document.getElementById('td-sort-w').__w.items[k].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, k);
  const binC = b => page.evaluate(b => { const r = document.getElementById('td-sort-w').__w.bins[b].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.75]; }, b);
  await dragLine(await itemC(0), await binC(1), 10);             // wrong box on purpose
  await sleep(350);
  ok('sort: dragging moves a card into a box', (await W('td-sort-w', 'w.state()'))[0] === 1, await W('td-sort-w', 'w.state()'));
  await act('td-sort-w', 'check');
  ok('sort: Check marks a wrong card with a cross', await page.evaluate(() => document.getElementById('td-sort-w').__w.items[0].classList.contains('no')));
  await dragLine(await itemC(0), await binC(0), 10); await sleep(350);
  { const c = await itemC(1); await tap(c[0], c[1]); const b = await binC(1); await tap(b[0], b[1]); await sleep(350); }
  await act('td-sort-w', 'check');
  f = await fb('td-sort-w');
  ok('sort: partial feedback counts what is placed and what is left', f.text === '2 placed, both right \u00B7 4 to go', f);
  ok('focus: tapping a card leaves no keyboard focus', await page.evaluate(() => document.activeElement === document.body));
  ok('sort: tap a card, then tap a box', (await W('td-sort-w', 'w.state()'))[1] === 1, await W('td-sort-w', 'w.state()'));
  await page.evaluate(() => document.getElementById('td-sort-w').__w.items[2].focus()); await page.keyboard.press('Enter');
  await page.evaluate(() => document.getElementById('td-sort-w').__w.bins[0].focus()); await page.keyboard.press(' ');
  await sleep(350);
  ok('sort: keyboard (Enter on a card, Space on a box)', (await W('td-sort-w', 'w.state()'))[2] === 0, await W('td-sort-w', 'w.state()'));
  for (const [k, b] of [[3, 1], [4, 0], [5, 1]]) { const c = await itemC(k); await tap(c[0], c[1]); const t = await binC(b); await tap(t[0], t[1]); await sleep(320); }
  await act('td-sort-w', 'check');
  f = await fb('td-sort-w');
  ok('sort: all cards sorted, Check says correct', / ok/.test(f.cls) && await page.evaluate(() => document.querySelectorAll('#td-sort-w .item.ok').length === 6), f);
  await act('td-sort-w', 'reset'); await sleep(100);
  ok('sort: Reset puts every card back', (await W('td-sort-w', 'w.state()')).every(v => v === -1));
  await act('td-sort-w', 'show'); await sleep(350);
  ok('sort: Show answer moves all cards', JSON.stringify(await W('td-sort-w', 'w.state()')) === '[0,1,0,1,0,1]' && await page.evaluate(() => document.getElementById('td-sort-w').classList.contains('w-shown')));
  await act('td-sort-w', 'show'); await sleep(100);
  ok('sort: Hide answer returns to the student\'s work', (await W('td-sort-w', 'w.state()')).every(v => v === -1));
  await stay(2, 'sort');

  /* ---------- bar chart ---------- */
  await go(3);
  const barsAns = [15, 20, 35, 25, 30];
  let v = await W('td-bars-w', 'w.values()');
  ok('bars: the graph starts ready at the middle, not at zero', v.every(x => x === 20), v);
  for (let i = 0; i < 5; i++) {
    const a = await W('td-bars-w', 'w.at(' + i + ',' + v[i] + ')'), b = await W('td-bars-w', 'w.at(' + i + ',' + barsAns[i] + ')');
    if (i === 1) continue;                                           // already right
    if (i === 2) { await dragLine([a.x, a.y], [b.x + 4, Math.max(4, b.y - 300)], 6); ok('bars: a bar cannot go above the axis', (await W('td-bars-w', 'w.values()'))[2] === 40); const top = await W('td-bars-w', 'w.at(2,40)'); await dragLine([top.x, top.y], [b.x, b.y + 2], 6); }
    else await dragLine([a.x, a.y], [b.x, b.y + 3], 8);              // 3 px off: must snap to the step
  }
  v = await W('td-bars-w', 'w.values()');
  ok('bars: dragging sets and snaps every bar', JSON.stringify(v) === JSON.stringify(barsAns), v);
  ok('bars: the value shows on the bar', await page.evaluate(() => [...document.querySelectorAll('#td-bars-w .tw-tag text')].map(t => t.textContent).join() === '15,20,35,25,30'));
  await act('td-bars-w', 'check');
  f = await fb('td-bars-w');
  ok('bars: Check says correct', / ok/.test(f.cls), f);
  await page.evaluate(() => document.getElementById('td-bars-w').__w.cols[0].focus());
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowDown');
  ok('bars: keyboard Up/Down moves the focused bar by one step', (await W('td-bars-w', 'w.values()'))[0] === 20);
  await stay(3, 'bars keyboard (Up/Down inside the chart)');
  await act('td-bars-w', 'check');
  f = await fb('td-bars-w');
  ok('bars: Check highlights the wrong bar', / no/.test(f.cls) && await page.evaluate(() => document.querySelectorAll('#td-bars-w .tw-col.no').length === 1), f);
  ok('focus: dragging a bar leaves no keyboard focus on the chart', await page.evaluate(() => document.activeElement === document.body));
  await act('td-bars-w', 'show'); await sleep(900);
  ok('focus: tapping Show answer leaves no focus on the button', await page.evaluate(() => document.activeElement === document.body));
  await page.keyboard.press(' '); await sleep(200);
  ok('focus: Space after Show answer does not hide the answer again', await page.evaluate(() => document.getElementById('td-bars-w').classList.contains('w-shown')));
  await page.evaluate(() => __deck.jump(3, 0)); await sleep(700);
  ok('answer tab: the big builders show the ANSWER tab', await page.evaluate(() => getComputedStyle(document.getElementById('td-bars-w'), '::after').content.includes('Answer') && getComputedStyle(document.getElementById('td-bars-w'), '::after').display !== 'none'));
  ok('bars: Show answer moves the bars to the answer', JSON.stringify(await W('td-bars-w', 'w.values()')) === JSON.stringify(barsAns) && await page.evaluate(() => document.getElementById('td-bars-w').classList.contains('w-shown')));
  ok('bars: the drawn bar heights match the answer', await page.evaluate(() => { const hs = [...document.querySelectorAll('#td-bars-w .tw-bar')].map(b => +b.getAttribute('height')); return hs.every((h, i) => Math.abs(h / hs[1] - [15, 20, 35, 25, 30][i] / 20) < 0.01); }));
  await act('td-bars-w', 'show'); await sleep(900);
  ok('bars: Hide answer returns the student\'s bars', (await W('td-bars-w', 'w.values()'))[0] === 20 && !(await page.evaluate(() => document.getElementById('td-bars-w').classList.contains('w-shown'))));
  await act('td-bars-w', 'reset'); await sleep(900);
  ok('bars: Reset returns to the start', (await W('td-bars-w', 'w.values()')).every(x => x === 20));
  await page.evaluate(() => document.activeElement.blur());
  await stay(3, 'bars');

  /* ---------- line graph ---------- */
  await go(4);
  const lineAns = [32, 34, 33, 36, 35];
  v = await W('td-line-w', 'w.values()');
  ok('line: starts from data-start', JSON.stringify(v) === '[34,34,35,33,34]', v);
  for (let i = 0; i < 5; i++) {
    const a = await W('td-line-w', 'w.at(' + i + ',' + v[i] + ')'), b = await W('td-line-w', 'w.at(' + i + ',' + lineAns[i] + ')');
    if (i % 2) await tap(b.x, b.y + 2); else await dragLine([a.x, a.y], [b.x, b.y - 2], 8);
  }
  v = await W('td-line-w', 'w.values()');
  ok('line: tap and drag set the points', JSON.stringify(v) === JSON.stringify(lineAns), v);
  ok('line: the points are joined in order', await page.evaluate(() => (document.querySelector('#td-line-w .tw-path').getAttribute('d').match(/[ML]/g) || []).length === 5));
  await act('td-line-w', 'check');
  ok('line: Check says correct', / ok/.test((await fb('td-line-w')).cls), await fb('td-line-w'));
  await act('td-line-w', 'reset'); await sleep(800);
  await act('td-line-w', 'check');
  ok('line: Check highlights wrong points', await page.evaluate(() => document.querySelectorAll('#td-line-w .tw-col.no').length === 4));
  await act('td-line-w', 'show'); await sleep(1100);
  ok('line: Show answer sets the answer', JSON.stringify(await W('td-line-w', 'w.values()')) === JSON.stringify(lineAns));
  await act('td-line-w', 'show'); await sleep(800);
  await stay(4, 'line');

  /* ---------- pie ---------- */
  await go(5);
  const pieType = async (k, text) => { await tapEl('#td-pie-w tbody tr:nth-child(' + (k + 1) + ') .tw-in'); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.type(text); };
  await pieType(0, '100');
  ok('pie: the pie draws while typing', await page.evaluate(() => document.querySelectorAll('#td-pie-w .tw-slice').length === 1 && /100° of 360°/.test(document.querySelector('#td-pie-w .tw-sum').textContent)));
  await page.keyboard.press('Enter'); await page.keyboard.type('90'); await page.keyboard.press('Enter'); await page.keyboard.type('90'); await page.keyboard.press('Enter'); await page.keyboard.type('60'); await page.keyboard.press('Enter');
  f = await fb('td-pie-w');
  ok('pie: Enter moves on and checks; a wrong angle is marked', / no/.test(f.cls) && /3 of 4/.test(f.text) && await page.evaluate(() => document.querySelector('#td-pie-w tbody tr:nth-child(1) .tw-in').classList.contains('no')), f);
  await pieType(0, '120'); await act('td-pie-w', 'check');
  f = await fb('td-pie-w');
  ok('pie: right angles, Check says correct', / ok/.test(f.cls), f);
  ok('pie: total reaches 360° and 4 labelled slices', await page.evaluate(() => /^360° of 360°/.test(document.querySelector('#td-pie-w .tw-sum').textContent) && document.querySelector('#td-pie-w .tw-sum').classList.contains('ok') && document.querySelectorAll('#td-pie-w .tw-slice').length === 4 && document.querySelectorAll('#td-pie-w .tw-slab').length === 4));
  await act('td-pie-w', 'reset');
  ok('pie: Reset empties the pie', await page.evaluate(() => document.querySelectorAll('#td-pie-w .tw-slice').length === 0));
  await page.evaluate(() => document.activeElement.blur());
  await stay(5, 'pie');
  await go(6);
  for (const [k, t] of [[0, '40'], [1, '25%'], [2, '20'], [3, '15.4']]) { await tapEl('#td-pie2-w tbody tr:nth-child(' + (k + 1) + ') .tw-in'); await page.keyboard.type(t); }
  await act('td-pie2-w', 'check');
  ok('pie percent: answers within ±0.5 are accepted', / ok/.test((await fb('td-pie2-w')).cls), await fb('td-pie2-w'));
  await act('td-pie2-w', 'show');
  ok('pie percent: Show answer fills 40, 25, 20, 15', await page.evaluate(() => [...document.querySelectorAll('#td-pie2-w .tw-in')].map(i => i.value).join() === '40,25,20,15'));
  await act('td-pie2-w', 'show');
  await page.evaluate(() => document.activeElement.blur());
  await stay(6, 'pie percent');

  /* ---------- pictogram ---------- */
  await go(7);
  v = await W('td-picto-w', 'w.values()');
  ok('picto: starts with a ready pictogram (2 in every row)', v.every(x => x === 2), v);
  const pb = (row, a) => tapEl('#td-picto-w .tw-pc:nth-child(' + (row * 3 + 3) + ') [data-act="' + a + '"]');
  await pb(0, 'plus'); await pb(1, 'half'); await pb(2, 'plus'); await pb(2, 'plus'); await pb(3, 'minus'); await pb(3, 'half');
  v = await W('td-picto-w', 'w.values()');
  ok('picto: + ½ − build the rows', JSON.stringify(v) === '[3,2.5,4,1.5]', v);
  ok('picto: half icons are drawn', await page.evaluate(() => document.querySelectorAll('#td-picto-w .tw-pa .tw-ic.half').length === 2 && document.querySelectorAll('#td-picto-w .tw-pa .tw-ic').length === 12 && !!document.querySelector('#td-picto-w .tw-pa use[href="#cup"]')));
  await act('td-picto-w', 'check');
  ok('picto: Check says correct', / ok/.test((await fb('td-picto-w')).cls), await fb('td-picto-w'));
  await pb(0, 'minus'); await act('td-picto-w', 'check');
  ok('picto: a wrong row gets a cross', await page.evaluate(() => document.querySelectorAll('#td-picto-w .tw-mark.no').length === 1));
  await act('td-picto-w', 'reset');
  ok('picto: Reset returns to the start', (await W('td-picto-w', 'w.values()')).every(x => x === 2));
  await stay(7, 'picto');

  /* ---------- dot plots ---------- */
  await go(8);
  const dotsAns = [2, 4, 5, 3, 1];
  for (let k = 0; k < 5; k++) for (let j = 0; j < dotsAns[k]; j++) { const p = await W('td-dots-w', 'w.at(' + k + ',' + j + ')'); await tap(p.x, p.y); }
  v = await W('td-dots-w', 'w.values()');
  ok('dots: tapping stacks dots', JSON.stringify(v) === JSON.stringify(dotsAns), v);
  { const p = await W('td-dots-w', 'w.at(2,5)'); await tap(p.x, p.y); const q = await W('td-dots-w', 'w.at(2,1)'); await tap(q.x, q.y); }
  ok('dots: tapping a dot removes it', (await W('td-dots-w', 'w.values()'))[2] === 5);
  await page.keyboard.press('Enter'); await page.keyboard.press(' '); await sleep(200);
  await page.evaluate(() => __deck.jump(8, 0)); await sleep(700);
  ok('focus: Enter/Space after tapping a dot do not add dots', JSON.stringify(await W('td-dots-w', 'w.values()')) === JSON.stringify(dotsAns) && await page.evaluate(() => document.activeElement === document.body), await W('td-dots-w', 'w.values()'));
  await act('td-dots-w', 'check');
  ok('dots: Check says correct', / ok/.test((await fb('td-dots-w')).cls), await fb('td-dots-w'));
  await page.evaluate(() => document.getElementById('td-dots-w').__w.cols[0].focus()); await page.keyboard.press('ArrowUp');
  ok('dots: keyboard Up adds a dot', (await W('td-dots-w', 'w.values()'))[0] === 3);
  await act('td-dots-w', 'check');
  ok('dots: a wrong stack is highlighted', await page.evaluate(() => document.querySelectorAll('#td-dots-w .tw-col.no').length === 1));
  for (const k of [0, 3, 3, 5]) { const p = await W('td-dots-free', 'w.at(' + k + ',' + (k === 3 ? 0.4 : 0) + ')'); await tap(p.x, p.y - (k === 3 ? 60 : 0)); }
  v = await W('td-dots-free', 'w.values()');
  ok('dots free survey: counts taps and has no Check', JSON.stringify(v) === '[1,0,0,2,0,1]' && await page.evaluate(() => !document.querySelector('#td-dots-free [data-act="check"]') && /Total: 4/.test(document.querySelector('#td-dots-free .tw-fb').textContent)), v);
  await act('td-dots-free', 'reset');
  ok('dots free survey: Reset', (await W('td-dots-free', 'w.values()')).every(x => x === 0));
  await page.evaluate(() => document.activeElement.blur());
  await stay(8, 'dots');

  /* ---------- crowded sort: nothing may leave its box or cover the buttons ---------- */
  await go(10);
  const inside = () => page.evaluate(() => {
    const w = document.getElementById('td-sort2-w'), W = w.getBoundingClientRect(), F = w.querySelector('.tw-foot').getBoundingClientRect(), bad = [];
    w.__w.items.forEach((it, k) => {
      const r = it.getBoundingClientRect(), box = it.closest('.tw-bin, .tw-pool');
      const s = box.classList.contains('tw-bin') ? box.querySelector('.tw-slot') : box, B = s.getBoundingClientRect(), scroll = s.classList.contains('scroll');
      if (r.left < W.left - 1 || r.right > W.right + 1) bad.push(k + ' outside the widget');
      if (!scroll && (r.bottom > B.bottom + 2 || r.top < B.top - 2)) bad.push(k + ' outside its box');
      if (!scroll && r.bottom > F.top + 1) bad.push(k + ' over the buttons');
      if (r.left < B.left - 2 || r.right > B.right + 2) bad.push(k + ' wider than its box');
    });
    w.__w.bins.forEach((b, k) => { const r = b.getBoundingClientRect(); if (r.bottom > F.top + 1 || r.bottom > W.bottom + 1) bad.push('box ' + k + ' over the buttons'); });
    const rb = w.querySelector('[data-act="reset"]').getBoundingClientRect(), top = document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2);
    if (!top || !top.closest('[data-act="reset"]')) bad.push('Reset is covered');
    return bad;
  });
  ok('sort crowded: start state fits', (await inside()).length === 0, await inside());
  await act('td-sort2-w', 'show'); await sleep(450);
  ok('sort crowded: after Show answer 7 cards fit in one box and the buttons stay free', (await inside()).length === 0 && (await W('td-sort2-w', 'w.state()')).filter(x => x === 0).length === 7, await inside());
  ok('sort crowded: the empty card pool takes no space', await page.evaluate(() => document.querySelector('#td-sort2-w .tw-pool').getBoundingClientRect().height === 0));
  await act('td-sort2-w', 'reset'); await sleep(200);
  ok('sort crowded: Reset can be pressed and puts the cards back', (await W('td-sort2-w', 'w.state()')).every(x => x === -1) && (await inside()).length === 0, await inside());
  for (let k = 0; k < 8; k++) { const c = await page.evaluate(k => { const r = document.getElementById('td-sort2-w').__w.items[k].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, k); await tap(c[0], c[1]); const b = await page.evaluate(() => { const r = document.getElementById('td-sort2-w').__w.bins[1].firstChild.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.4]; }); await tap(b[0], b[1]); await sleep(300); }
  await sleep(500);
  ok('sort crowded: all 8 cards in one box still fit', (await W('td-sort2-w', 'w.state()')).every(x => x === 1) && (await inside()).length === 0, await inside());
  await act('td-sort2-w', 'check');
  ok('sort crowded: Check still works after a full sort', /1 of 8 correct/.test((await fb('td-sort2-w')).text), await fb('td-sort2-w'));
  await act('td-in-card', 'show');
  ok('answer tab: a typed answer inside a .card shows no tab and no frame', await page.evaluate(() => { const w = document.getElementById('td-in-card'), c = getComputedStyle(w); return w.classList.contains('w-shown') && getComputedStyle(w, '::after').display === 'none' && c.outlineStyle === 'none' && c.boxShadow === 'none' && w.querySelector('.tw-in').classList.contains('ok'); }));
  await act('td-in-card', 'show');
  await stay(10, 'crowded sort');

  /* ---------- global pen ---------- */
  await go(3);
  const pen = expr => page.evaluate(expr => new Function('p', 'return ' + expr)(__tools.pen), expr);
  const stagePts = pts => page.evaluate(pts => { const r = document.getElementById('pen-layer').getBoundingClientRect(), k = r.width / 1920; return pts.map(p => [r.left + p[0] * k, r.top + p[1] * k]); }, pts);
  const penBtn = name => tapEl('#pen-bar [data-pen="' + name + '"]');
  const before = await W('td-bars-w', 'w.values()');
  await page.keyboard.press('p');
  ok('pen: P turns the pen on (pen-on + button state)', await page.evaluate(() => document.documentElement.classList.contains('pen-on') && document.getElementById('pen').getAttribute('aria-pressed') === 'true' && getComputedStyle(document.getElementById('pen-bar')).display === 'flex'));
  await drag(await stagePts(digit2(900, 420, 120, 200)));       // written right on top of the bar chart
  await sleep(250);
  ok('pen: writes on top of a widget, the widget does not move', await pen('p.ink.count()') === 1 && JSON.stringify(await W('td-bars-w', 'w.values()')) === JSON.stringify(before));
  ok('pen: a written "2" stays freehand', (await pen('p.ink.shapes()'))[0] === 'free');
  await drag(await stagePts(letterS(1100, 400, 110, 220))); await sleep(250);
  ok('pen: a written "S" stays freehand', (await pen('p.ink.shapes()'))[1] === 'free', await pen('p.ink.shapes()'));
  await drag(await stagePts(wobblyLine(300, 880, 1500, 930))); await sleep(250);
  ok('pen: a wobbly line becomes a straight line', (await pen('p.ink.shapes()'))[2] === 'line', await pen('p.ink.shapes()'));
  await drag(await stagePts(handCircle(1500, 500, 150))); await sleep(250);
  ok('pen: a hand circle becomes a clean circle', (await pen('p.ink.shapes()'))[3] === 'circle', await pen('p.ink.shapes()'));
  ok('pen: the circle is clean (all points at the same distance)', await pen('(function(){var s=p.ink.st.strokes[3].pts.slice(1),cx=0,cy=0;s.forEach(function(q){cx+=q.x;cy+=q.y});cx/=s.length;cy/=s.length;var r=s.map(function(q){return Math.hypot(q.x-cx,q.y-cy)});return Math.max.apply(null,r)-Math.min.apply(null,r)<3})()'));
  await drag(await stagePts(handRect(500, 300, 360, 220))); await sleep(250);
  ok('pen: a hand rectangle becomes a clean rectangle', (await pen('p.ink.shapes()'))[4] === 'rect' && await pen('p.ink.st.strokes[4].pts.length') === 5, await pen('p.ink.shapes()'));
  await drag(await stagePts(handTri(1250, 620, 260, 220))); await sleep(250);
  ok('pen: a hand triangle becomes a clean triangle', (await pen('p.ink.shapes()'))[5] === 'tri', await pen('p.ink.shapes()'));
  await drag(await stagePts(handCircle(700, 700, 60).map((p, i) => [700 + (p[0] - 700) * 2.2, p[1]]))); await sleep(250);
  ok('pen: a hand oval becomes a clean ellipse', (await pen('p.ink.shapes()'))[6] === 'ellipse', await pen('p.ink.shapes()'));
  await stay(3, 'pen (drawing never advances the slide)');
  await penBtn('undo');
  ok('pen: Undo first restores the hand-drawn stroke', await pen('p.ink.count()') === 7 && (await pen('p.ink.shapes()'))[6] === 'free');
  await penBtn('undo');
  ok('pen: Undo again removes the stroke', await pen('p.ink.count()') === 6);
  await penBtn('auto');
  await drag(await stagePts(handCircle(700, 700, 90))); await sleep(250);
  ok('pen: Auto shapes off keeps the circle freehand', (await pen('p.ink.shapes()'))[6] === 'free' && await page.evaluate(() => document.querySelector('#pen-bar [data-pen="auto"]').getAttribute('aria-pressed') === 'false'));
  await penBtn('auto');
  await penBtn('hi');
  ok('pen: the highlighter defaults to see-through sun yellow', await pen('p.ink.color === "#FFC53D" && p.ink.alpha < 1 && p.ink.alpha > 0.2') && await page.evaluate(() => document.querySelector('#pen-bar [data-pen="#FFC53D"]').getAttribute('aria-pressed') === 'true'));
  await penBtn('pen');
  ok('pen: back on the pen, the pen colour returns', await pen('p.ink.color === "#0F1B33" && p.ink.alpha === 1'));
  await penBtn('hi'); await penBtn('thick'); await penBtn('#FF6B5B');
  await drag(await stagePts(wobblyLine(300, 200, 900, 205))); await sleep(250);
  ok('pen: highlighter, thick and colour are used', await pen('(function(){var s=p.ink.st.strokes[7];return s.alpha<1&&s.size>=30&&s.color==="#FF6B5B"})()'));
  await penBtn('erase');
  await drag(await stagePts([[600, 150], [600, 180], [600, 205], [600, 240]])); await sleep(100);
  ok('pen: the stroke eraser removes a stroke', await pen('p.ink.count()') === 7);
  await penBtn('undo');
  ok('pen: Undo brings the erased stroke back', await pen('p.ink.count()') === 8);
  await page.keyboard.press('ArrowRight'); await sleep(500);
  ok('pen: ink is kept per slide (next slide is empty)', (await deck()).i === 4 && await pen('p.ink.count()') === 0);
  await penBtn('pen'); await penBtn('#0F1B33');
  await drag(await stagePts(digit2(400, 300, 100, 160))); await sleep(200);
  await page.keyboard.press('ArrowLeft'); await sleep(500);
  ok('pen: coming back redraws that slide\'s ink', (await deck()).i === 3 && await pen('p.ink.count()') === 8 && await page.evaluate(() => { const c = document.querySelector('#pen-layer canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++; return n > 500; }));
  await penBtn('clear');
  ok('pen: Clear empties this slide', await pen('p.ink.count()') === 0);
  await penBtn('undo');
  ok('pen: Undo after Clear brings the ink back', await pen('p.ink.count()') === 8);
  await penBtn('clear');
  { const c = (await stagePts([[960, 540]]))[0]; await tap(c[0], c[1]); await sleep(150); }
  await stay(3, 'pen (a tap while the pen is on)');
  await penBtn('close');
  ok('pen: Close turns it off', await page.evaluate(() => !document.documentElement.classList.contains('pen-on') && document.getElementById('pen').getAttribute('aria-pressed') === 'false' && getComputedStyle(document.getElementById('pen-bar')).display === 'none'));
  { const a = await W('td-bars-w', 'w.at(0,20)'), b = await W('td-bars-w', 'w.at(0,30)'); await dragLine([a.x, a.y], [b.x, b.y], 6); }
  ok('pen: widgets work again after the pen is closed', (await W('td-bars-w', 'w.values()'))[0] === 30);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('deck:pen'))); await page.keyboard.press('Escape');
  ok('pen: the deck:pen event turns it on and Escape turns it off', await page.evaluate(() => !document.documentElement.classList.contains('pen-on')));
  await stay(3, 'pen');

  ok('no console errors and no external requests', errors.length === 0, errors);

  /* ---------- ?still and ?still&answers ---------- */
  const p2 = await ctx.newPage(); const e2 = [];
  p2.on('pageerror', e => e2.push(e.message)); p2.on('console', m => { if (m.type() === 'error') e2.push(m.text()); });
  await p2.goto(FILE + '?still');
  ok('?still shows the default state (no answers)', await p2.evaluate(() => !document.querySelector('.w-shown, .c.picked') && document.getElementById('td-bars-w').__w.values().every(x => x === 20)));
  await p2.goto(FILE + '?still&answers');
  ok('?still&answers shows the answer on every widget', await p2.evaluate(() => __tools.widgets.filter(w => w.show && w.type !== 'mcq').every(w => w.el.classList.contains('w-shown')) && !!document.querySelector('#td-mcq-ch .c.ok.picked')
    && JSON.stringify(document.getElementById('td-bars-w').__w.values()) === '[15,20,35,25,30]' && JSON.stringify(document.getElementById('td-picto-w').__w.values()) === '[3,2.5,4,1.5]' && document.querySelector('#td-in-num .tw-in').value === '110'));
  ok('?still pages have no errors', e2.length === 0, e2);
  await browser.close();
}

(async () => {
  /* the four runs are independent browsers, so they run side by side (lines are labelled with the run's name) */
  await Promise.all(CONFIGS.map(cfg => run(cfg).catch(e => { failed++; total++; console.log('FAIL  [' + cfg.name + '] test run crashed -> ' + (e && e.stack || e)); })));
  console.log('\n' + (total - failed) + ' of ' + total + ' checks passed' + (failed ? ', ' + failed + ' FAILED' : ''));
  process.exit(failed ? 1 : 0);
})();
