// Kimono v3: scroll engine, picture walls, tracked labels, audio guide.
// No dependencies. Without JS (or without the rendered sequence) the page is a plain, complete exhibition.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 820px)');
const root = document.documentElement;
const SEQ_BASE = new URLSearchParams(location.search).get('seq') || 'assets/seq';

/* ------------------------------------------------------------------ */
/* Camera maths                                                        */
/* ------------------------------------------------------------------ */
const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
// rotate v by the inverse of unit quaternion q = [w, x, y, z]
function rotInv(q, v) {
  const u = [-q[1], -q[2], -q[3]], w = q[0];
  const t = V.mul(V.cross(u, v), 2);
  return V.add(V.add(v, V.mul(t, w)), V.cross(u, t));
}
function camAt(fi) {               // fi: fractional index into meta.available
  const C = Seq.meta.camera; if (!C) return null;
  const i = clamp(Math.floor(fi), 0, C.length - 1), j = Math.min(C.length - 1, i + 1), t = fi - i;
  const a = C[i], b = C[j];
  let d = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6], s = d < 0 ? -1 : 1;
  const q = [0, 1, 2, 3].map(k => a[3 + k] * (1 - t) + s * b[3 + k] * t), n = Math.hypot(...q);
  return { p: [0, 1, 2].map(k => a[k] * (1 - t) + b[k] * t), q: q.map(x => x / n) };
}
function project(cam, P) {          // world point -> normalised frame coords (0..1, top-left) or null
  const L = Seq.meta.lens, [W, H] = Seq.meta.size;
  const c = rotInv(cam.q, V.sub(P, cam.p));
  if (c[2] > -0.05) return null;
  const k = L.focal_mm / L.sensor_w_mm;
  const u = k * c[0] / -c[2] + (L.shift_x || 0), v = k * c[1] / -c[2] + (L.shift_y || 0);   // sign as exported by three_d/export_meta.py (checked against its anchors)
  return [0.5 + u, 0.5 - v * W / H];
}
// CSS matrix3d that maps an element of size w x h onto the quad tl, tr, br, bl (screen px)
function quad(w, h, [p0, p1, p2, p3]) {
  const sx = p0[0] - p1[0] + p2[0] - p3[0], sy = p0[1] - p1[1] + p2[1] - p3[1];
  let a, b, c, d, e, f, g, hh;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    a = p1[0] - p0[0]; b = p3[0] - p0[0]; c = p0[0]; d = p1[1] - p0[1]; e = p3[1] - p0[1]; f = p0[1]; g = 0; hh = 0;
  } else {
    const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1];
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den; hh = (dx1 * sy - sx * dy1) / den;
    a = p1[0] - p0[0] + g * p1[0]; b = p3[0] - p0[0] + hh * p3[0]; c = p0[0];
    d = p1[1] - p0[1] + g * p1[1]; e = p3[1] - p0[1] + hh * p3[1]; f = p0[1];
  }
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map(x => +x.toFixed(9)).join(',')})`;
}

/* ------------------------------------------------------------------ */
/* The sequence: one continuous render, scrubbed by scroll             */
/* ------------------------------------------------------------------ */
const Seq = {
  meta: null, imgs: new Map(), loading: new Set(), wallImgs: new Map(), canvas: $('#stage'), ctx: null,
  cur: 0, target: 0, drawnKey: '', rect: { dx: 0, dy: 0, dw: 1, dh: 1 }, set: 'd', dirty: true, wall: null,

  async init() {
    try {
      const r = await fetch(`${SEQ_BASE}/meta.json`, { cache: 'no-cache' });
      if (!r.ok) throw 0;
      this.meta = await r.json();
    } catch { return false; }
    const m = this.meta;
    if (!m.available) { m.available = []; for (let f = 0; f < m.frames; f += m.step || 1) m.available.push(f); }
    if (!m.available.length) { this.meta = null; return false; }
    m.count = m.available.length;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.layout();
    addEventListener('resize', () => this.layout(), { passive: true });
    await this.load(0);
    root.classList.add('has-seq');
    return true;
  },

  // fractional index into available[] for a full-rate frame number
  indexOf(f) {
    const A = this.meta.available;
    if (f <= A[0]) return 0;
    if (f >= A[A.length - 1]) return A.length - 1;
    let lo = 0, hi = A.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (A[mid] <= f) lo = mid; else hi = mid; }
    return lo + (f - A[lo]) / (A[hi] - A[lo]);
  },

  layout() {
    const m = this.meta; if (!m) return;
    const vw = this.canvas.clientWidth || innerWidth, vh = this.canvas.clientHeight || innerHeight;
    const [W, H] = m.size, crop = m.mobileCrop;
    const set = vw / vh < 0.6 ? 'm' : 'd';
    if (set !== this.set) { this.set = set; this.imgs.clear(); this.loading.clear(); }
    let s, dx, dy;
    if (set === 'd') { s = Math.max(vw / W, vh / H); dx = (vw - W * s) / 2; dy = (vh - H * s) / 2; }
    else { s = vw / crop[2]; dx = (vw - W * s) / 2; dy = Math.min(0, (vh - H * s) / 2); }   // phone: the whole centre column, top-aligned
    this.rect = { dx, dy, dw: W * s, dh: H * s, s };
    const k = clamp(1 / s, 1, Math.min(devicePixelRatio || 1, 2));
    this.canvas.width = Math.round(vw * k); this.canvas.height = Math.round(vh * k); this.k = k;
    this.dirty = true;
  },

  url(i, set = this.set) { const f = String(this.meta.available[i]).padStart(4, '0'); return `${SEQ_BASE}/${set}/f_${f}.webp`; },

  load(i) {
    if (this.imgs.has(i) || this.loading.has(i)) return Promise.resolve();
    this.loading.add(i);
    const set = this.set;
    return new Promise(res => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (set === this.set) { this.imgs.set(i, im); this.dirty = true; } this.loading.delete(i); res(); this.pump(); };
      im.onerror = () => { this.loading.delete(i); res(); };
      im.src = this.url(i, set);
    });
  },
  wallImage(i) {                       // the wall stops always use the full-width frame (it tiles)
    if (this.set === 'd') return this.imgs.get(i);
    if (this.wallImgs.has(i)) return this.wallImgs.get(i);
    const im = new Image(); im.decoding = 'async'; im.onload = () => { this.dirty = true; }; im.src = this.url(i, 'd');
    this.wallImgs.set(i, im); return null;
  },

  // nearest first, look further ahead than behind; coarse frames first
  pump() {
    const m = this.meta; if (!m) return;
    const max = phone.matches ? 4 : 6, c = Math.round(this.cur), win = phone.matches ? 60 : 100;
    while (this.loading.size < max) {
      let best = -1, bs = 1e9;
      for (let i = Math.max(0, c - 20); i <= Math.min(m.count - 1, c + win); i++) {
        if (this.imgs.has(i) || this.loading.has(i)) continue;
        const d = Math.abs(i - c) * (i < c ? 2.5 : 1), sc = d * (i % 8 === 0 ? 0.12 : i % 4 === 0 ? 0.3 : i % 2 === 0 ? 0.6 : 1);
        if (sc < bs) { bs = sc; best = i; }
      }
      if (best < 0) break;
      this.load(best);
    }
  },
  nearest(i) {
    if (this.imgs.has(i)) return i;
    for (let d = 1; d < this.meta.count; d++) { if (this.imgs.has(i - d)) return i - d; if (this.imgs.has(i + d)) return i + d; }
    return -1;
  },

  draw() {
    const m = this.meta; if (!m || !this.ctx) return;
    const { ctx, k } = this, r = this.rect, c = m.mobileCrop, W = m.size[0];
    const i0 = clamp(Math.floor(this.cur), 0, m.count - 1), frac = this.cur - i0;
    const wall = this.wall;
    if (wall) {
      const im = this.wallImage(wall.index); if (!im || !im.complete || !im.naturalWidth) return this.drawSeq(i0, frac);
      const key = `w${wall.index}:${wall.shift.toFixed(1)}`;
      if (key === this.drawnKey && !this.dirty) return;
      this.drawnKey = key; this.dirty = false;
      ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const P = wall.period, s = wall.shift;
      ctx.drawImage(im, (r.dx - s + P) * k, r.dy * k, r.dw * k, r.dh * k);
      ctx.drawImage(im, (r.dx - s) * k, r.dy * k, r.dw * k, r.dh * k);
      this.band(im);
      return;
    }
    this.drawSeq(i0, frac);
  },
  drawSeq(i0, frac) {
    const m = this.meta, { ctx, k } = this, r = this.rect, c = m.mobileCrop, W = m.size[0];
    const a = this.nearest(i0); if (a < 0) return;
    const blend = a === i0 && frac > 0.02 && this.imgs.has(i0 + 1) && !reduced.matches;
    const key = `${a}:${blend ? Math.round(frac * 24) : 0}`;
    if (key === this.drawnKey && !this.dirty) return;
    this.drawnKey = key; this.dirty = false;
    const put = im => {
      if (this.set === 'd') ctx.drawImage(im, r.dx * k, r.dy * k, r.dw * k, r.dh * k);
      else ctx.drawImage(im, (r.dx + c[0] / W * r.dw) * k, r.dy * k, c[2] / W * r.dw * k, r.dh * k);
    };
    ctx.globalAlpha = 1; ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    put(this.imgs.get(a));
    if (blend) { ctx.globalAlpha = Math.round(frac * 24) / 24; put(this.imgs.get(i0 + 1)); ctx.globalAlpha = 1; }
    this.band(this.imgs.get(a));
  },

  // on tall phones the frame ends above the bottom of the screen: continue its last rows, fading to paper
  band(im) {
    const { ctx, k } = this, r = this.rect, bottom = r.dy + r.dh, vh = this.canvas.height / k, vw = this.canvas.width / k;
    if (bottom >= vh - 1 || !im) return;
    const c = this.meta.mobileCrop, W = this.meta.size[0], full = im.naturalWidth > c[2] + 4;
    const sx = full ? c[0] * im.naturalWidth / W : 0, sw = full ? c[2] * im.naturalWidth / W : im.naturalWidth;
    ctx.drawImage(im, sx, im.naturalHeight - 3, sw, 2, 0, (bottom - 1) * k, vw * k, (vh - bottom + 2) * k);
    const g = ctx.createLinearGradient(0, bottom * k, 0, vh * k);
    g.addColorStop(0, 'rgba(231,224,210,0)'); g.addColorStop(1, 'rgba(231,224,210,.85)');
    ctx.fillStyle = g; ctx.fillRect(0, bottom * k, vw * k, (vh - bottom) * k);
  },

  toScreen(n) { return n && { x: this.rect.dx + n[0] * this.rect.dw, y: this.rect.dy + n[1] * this.rect.dh }; },
  anchor(name) {
    const A = this.meta?.anchors?.[name]; if (!A) return null;
    const i0 = clamp(Math.floor(this.cur), 0, A.length - 1), i1 = Math.min(A.length - 1, i0 + 1), f = this.cur - i0;
    const p = A[i0], q = A[i1]; if (!p || !p[2]) return null;
    const x = q && q[2] ? p[0] + (q[0] - p[0]) * f : p[0], y = q && q[2] ? p[1] + (q[1] - p[1]) * f : p[1];
    if (this.wall) return null;
    return this.toScreen([x, y]);
  },
};

/* ------------------------------------------------------------------ */
/* The timeline: each room is a list of segments                       */
/*   ["f", from, to]          scrub the 3D frames                      */
/*   ["w", stop, p0, p1]      walk along a picture wall from pool p0 to p1 */
/* ------------------------------------------------------------------ */
const segWeight = s => s[0] === 'f' ? Math.max(1, (s[2] - s[1]) * 1.75) : (s[3] - s[2] + 0.6) * 95;
const sections = $$('[data-seg]').map(el => {
  const segs = JSON.parse(el.dataset.seg);
  const total = segs.reduce((a, s) => a + segWeight(s), 0);
  return {
    el, segs, total, id: el.id, pin: $('.scrub__pin', el), head: $('.scrub__head', el), svg: $('.leaders', el), line: $('.scrub__line', el),
    labels: $$('.label', el).map((li, n) => ({ el: li, n: n + 1, anchor: li.dataset.anchor, from: +li.dataset.from, to: +li.dataset.to, side: li.dataset.side || 'right', g: null })),
    frames: segs.filter(s => s[0] === 'f').map(s => [s[1], s[2]]),
  };
});
let stopOffset = {};        // where the walk along the wall stands at each stop (pool units)

function evalSection(S, u) {   // u: 0..1 through the section -> {frame, wall}
  let acc = 0;
  for (let i = 0; i < S.segs.length; i++) {
    const s = S.segs[i], w = segWeight(s) / S.total;
    const last = i === S.segs.length - 1;
    if (u <= acc + w || last) {
      const t = clamp((u - acc) / w, 0, 1);
      if (s[0] === 'f') return { frame: s[1] + t * (s[2] - s[1]), seg: s, i };
      const n = s[3] - s[2], x = clamp(t * (n + 0.6) - 0.3, 0, n), k = Math.floor(x), fr = x - k;
      const off = s[2] + Math.min(n, k + smooth(clamp((fr - 0.22) / 0.56, 0, 1)));
      return { frame: Seq.meta?.walls?.[s[1]]?.frame ?? 0, wall: { stop: s[1], off }, seg: s, i };
    }
    acc += w;
  }
}
function timeline() {
  const vh = innerHeight; let st = { frame: 0, wall: null, section: null, u: 0 };
  const off = {};
  let passed = true;
  for (const S of sections) {
    const r = S.el.getBoundingClientRect();
    if (passed && r.top <= 0.5) {
      const u = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const e = evalSection(S, u);
      st = { frame: e.frame, wall: e.wall || null, section: S, u, inside: r.bottom >= vh - 1 };
      S.segs.forEach((s, i) => {
        if (s[0] !== 'w') return;
        if (i < e.i || (r.bottom < vh - 1 && u >= 1)) off[s[1]] = s[3];
        else if (i === e.i) off[s[1]] = e.wall.off;
        else if (!(s[1] in off)) off[s[1]] = s[2];
      });
    } else {
      passed = false;
      for (const s of S.segs) if (s[0] === 'w' && !(s[1] in off)) off[s[1]] = s[2];
    }
  }
  stopOffset = off;
  return st;
}
function scrollForState(S, f, pool) {
  // inverse of evalSection for the guide: frame f inside an "f" segment, or a pool inside a "w" segment
  const top = S.el.getBoundingClientRect().top + scrollY, span = S.el.offsetHeight - innerHeight;
  let acc = 0;
  for (const s of S.segs) {
    const w = segWeight(s) / S.total;
    if (pool == null && f != null && s[0] === 'f' && f >= Math.min(s[1], s[2]) && f <= Math.max(s[1], s[2])) return top + (acc + w * (f - s[1]) / ((s[2] - s[1]) || 1)) * span;
    if (pool != null && s[0] === 'w' && pool >= s[2] && pool <= s[3]) { const n = s[3] - s[2]; return top + (acc + w * ((pool - s[2]) + 0.3) / (n + 0.6)) * span; }
    acc += w;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Picture walls: works and panels hung in the light pools             */
/* ------------------------------------------------------------------ */
const hang = $('#hang');
const STRIDE = 2;             // a work in every other bay: air between them, and room for the label
let items = [];
function setupHang() {
  $$('.works [data-stop]').forEach(el => { el.dataset.room = el.closest('[data-seg]')?.id || ''; hang.append(el); });
  items = $$('.work, .panel', hang).map(el => ({
    el, stop: el.dataset.stop, pool: +el.dataset.pool, room: el.dataset.room, photo: el.dataset.photo,
    placard: $(`.placard[data-stop="${el.dataset.stop}"][data-pool="${el.dataset.pool}"]`, hang),
  }));
  const fit = () => items.forEach(it => {
    const cl = it.el.classList;
    if (cl.contains('work')) {
      const a = +it.el.dataset.aspect || 1;
      const [bw, bh, pad] = cl.contains('work--cut') ? [1.28, 1.56, 0] : cl.contains('work--print') ? [1.0, 1.05, 0.06] : [1.1, 1.3, 0];
      const w = Math.min(bw, bh * a), h = w / a;                 // the object, metres
      it.wm = w + 2 * pad; it.hm = h + 2 * pad;
      it.el.style.setProperty('--pad', `${(pad / it.wm * 100).toFixed(3)}%`);
      it.el.style.width = '400px'; it.el.style.height = `${(400 * it.hm / it.wm).toFixed(1)}px`;
    } else {
      it.wm = 1.3; it.el.style.width = '440px'; it.el.style.height = 'auto';
      it.hm = it.wm * it.el.offsetHeight / 440;
    }
  });
  fit(); addEventListener('resize', fit, { passive: true });
  document.fonts?.ready.then(fit);
}
function activeStop(frame) {
  let best = null, bd = 1e9;
  for (const [k, W] of Object.entries(Seq.meta.walls || {})) { const d = Math.abs(frame - W.frame); if (d < bd) { bd = d; best = k; } }
  return best;
}
function updateHang(st, cam) {
  const W = Seq.meta.walls || {}, vw = innerWidth, vh = innerHeight;
  const group = st.wall ? st.wall.stop : activeStop(st.frame);
  // works are shown only on the walk to and from a stop, when nothing stands between camera and wall
  const dist = st.wall || !group ? 0 : Math.abs(st.frame - W[group].frame);
  hang.style.opacity = clamp((72 - dist) / 20, 0, 1).toFixed(3);
  let centred = null;
  for (const it of items) {
    const wall = W[it.stop];
    const off = st.wall && st.wall.stop === it.stop ? st.wall.off : (stopOffset[it.stop] ?? 0);
    const rel = it.pool - off;
    let ok = !!(wall && cam && it.stop === group && dist < 72 && Math.abs(rel) < 1.6);
    if (ok) {
      const top = wall.top ?? 1.72;
      const c = V.add([wall.pool0[0], wall.pool0[1], top - it.hm / 2], V.mul(wall.along, rel * wall.spacing * STRIDE));
      const hx = V.mul(wall.along, it.wm / 2), hy = [0, 0, it.hm / 2];
      const camRef = st.wall ? Seq.meta._stopCam[it.stop] : cam;
      const pts = [V.add(V.sub(c, hx), hy), V.add(V.add(c, hx), hy), V.sub(V.add(c, hx), hy), V.sub(V.sub(c, hx), hy)].map(P => project(camRef, P));
      if (pts.some(q => !q)) ok = false;
      else {
        const sp = pts.map(q => Seq.toScreen(q)).map(q => [q.x, q.y]);
        const minx = Math.min(...sp.map(q => q[0])), maxx = Math.max(...sp.map(q => q[0]));
        if (maxx < -40 || minx > vw + 40) ok = false;
        else {
          it.el.style.transform = quad(it.el.offsetWidth, it.el.offsetHeight, sp);
          it.box = { minx, maxx, miny: Math.min(...sp.map(q => q[1])), maxy: Math.max(...sp.map(q => q[1])) };
          if (st.wall && Math.abs(rel) < 0.16) centred = it;
        }
      }
    }
    if (ok !== it.on) { it.el.classList.toggle('is-on', ok); it.on = ok; }
  }
  for (const it of items) {
    const pl = it.placard; if (!pl) continue;
    const on = it === centred;
    if (on && !phone.matches && it.box) {
      const w = pl.offsetWidth, h = pl.offsetHeight, gap = Math.max(26, (it.box.maxx - it.box.minx) * 0.09);
      let x = it.box.maxx + gap; const y = clamp(it.box.maxy - h, vh * 0.16, vh - h - vh * 0.1);
      if (x + w > vw - 20) x = Math.max(20, it.box.minx - gap - w);
      pl.style.left = `${x}px`; pl.style.top = `${y}px`;
    }
    if (on !== pl._on) { pl.classList.toggle('is-on', on); pl._on = on; }
  }
}

/* still rooms: slow push-in, one picture dissolving into the next */
const stillRooms = $$('[data-stills]').map(el => ({ el, figs: $$('figure', el), head: $('.scrub__head', el) }));
function updateStills() {
  const vh = innerHeight;
  for (const R of stillRooms) {
    const r = R.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const n = R.figs.length, pos = clamp(-r.top / Math.max(1, r.height - vh), 0, 1) * n;
    R.head?.classList.toggle('is-away', pos > 0.22);
    R.figs.forEach((f, i) => {
      f.style.opacity = i === 0 ? 1 : smooth(clamp((pos - i + 0.18) / 0.36, 0, 1));
      if (!reduced.matches) $('img', f).style.transform = `scale(${(1 + 0.07 * clamp((pos - i + 0.3) / 1.3, 0, 1)).toFixed(4)})`;
    });
  }
}

/* ------------------------------------------------------------------ */
/* Scrub rooms: labels with leader lines                               */
/* ------------------------------------------------------------------ */
const NS = 'http://www.w3.org/2000/svg';
function buildLeaders() {
  for (const S of sections) for (const L of S.labels) {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<path/><circle r="11"/><text>${L.n}</text>`;
    S.svg?.append(g); L.g = g;
  }
}
function updateScrub(st) {
  const vw = innerWidth, vh = innerHeight, isPhone = phone.matches, frame = st.frame;
  for (const S of sections) {
    const r = S.el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) continue;
    const inside = r.top <= 1 && r.bottom >= vh - 1;
    const u = S === st.section ? st.u : (r.top > 0 ? 0 : 1);
    S.head?.classList.toggle('is-away', inside && u > 0.04);
    if (S.line) S.line.classList.toggle('is-on', inside && !st.wall && frame >= +S.line.dataset.from && frame <= +S.line.dataset.to + 0.5);
    const inFrames = !st.wall && S.frames.some(([a, b]) => frame >= a - 0.5 && frame <= b + 0.5);
    let shown = null;
    for (const L of S.labels) { L.on = inside && inFrames && frame >= L.from && frame <= L.to; L.a = L.on ? Seq.anchor(L.anchor) : null; if (L.on) shown = L; }
    for (const L of S.labels) {
      const on = L.on && (!isPhone || L === shown);
      L.el.classList.toggle('is-on', on);
      L.g.classList.toggle('is-on', on && !!L.a);
      if (!on) continue;
      const a = L.a;
      if (!isPhone) {
        const w = L.el.offsetWidth, h = L.el.offsetHeight, g = Math.max(18, vw * 0.035);
        const x = L.side === 'left' ? g : vw - g - w;
        const y = clamp((a ? a.y : vh * 0.5) - h * 0.5, vh * 0.2, vh - h - vh * 0.16);
        L.el.style.left = x + 'px'; L.el.style.top = y + 'px';
        if (a) {
          const x1 = L.side === 'left' ? x + w + 6 : x - 6, y1 = y + Math.min(h * 0.5, 44);
          const dir = Math.sign(a.x - x1) || 1, ex = a.x - dir * 10, xm = x1 + (ex - x1) * 0.4;
          $('path', L.g).setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}H${xm.toFixed(1)}L${ex.toFixed(1)} ${a.y.toFixed(1)}`);
        }
      }
      if (a) for (const [sel, ax, ay] of [['circle', 'cx', 'cy'], ['text', 'x', 'y']]) { const e = $(sel, L.g); e.setAttribute(ax, a.x); e.setAttribute(ay, a.y + (sel === 'text' ? 0.5 : 0)); }
    }
  }
}

/* the rules, written on the back of the kimono in the last room */
const rules = $('#rules');
function updateRules(st) {
  if (!rules) return;
  const S = sections.find(s => s.el.contains(rules));
  const names = ['back_tl', 'back_tr', 'back_br', 'back_bl'];
  const pts = names.map(n => Seq.anchor(n));
  const seg = S?.segs[S.segs.length - 1];
  const on = st.section === S && !st.wall && pts.every(Boolean) && seg && st.frame >= seg[2] - 40;
  rules.classList.toggle('is-on', !!on && !phone.matches);
  rules.classList.toggle('is-sheet', !!on && phone.matches);
  if (on && !phone.matches) {
    // lay the block inside the back panels, keeping its own proportions
    const [tl, tr, br, bl] = pts, w = rules.offsetWidth, h = rules.offsetHeight;
    const Qw = Math.hypot(tr.x - tl.x, tr.y - tl.y), Qh = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const sc = Math.min(0.84 * Qw / w, 0.8 * Qh / h), du = sc * w / Qw, dv = sc * h / Qh;
    const u0 = 0.5 - du / 2, v0 = 0.13 + (0.8 - dv) / 2;
    const at = (u, v) => { const a = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u }, c = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u }; return [a.x + (c.x - a.x) * v, a.y + (c.y - a.y) * v]; };
    rules.style.transform = quad(w, h, [at(u0, v0), at(u0 + du, v0), at(u0 + du, v0 + dv), at(u0, v0 + dv)]);
  }
}

/* ------------------------------------------------------------------ */
/* Rooms: rail, bar, slow drift                                        */
/* ------------------------------------------------------------------ */
const rooms = $$('[data-room]');
const rail = $('#rail'), where = $('#where');
rooms.forEach(sec => {
  const a = document.createElement('a'); a.href = '#' + sec.id; a.innerHTML = `<span>${sec.dataset.title}</span>`;
  a.setAttribute('aria-label', sec.dataset.title); rail.append(a); sec._dot = a;
});
let currentRoom = null;
function updateRooms() {
  const mid = innerHeight * 0.5; let cur = rooms[0];
  for (const sec of rooms) if (sec.getBoundingClientRect().top <= mid) cur = sec;
  if (cur !== currentRoom) {
    currentRoom = cur;
    rooms.forEach(s => s._dot.setAttribute('aria-current', s === cur));
    where.textContent = cur.id === 'threshold' ? '' : cur.dataset.title;
  }
}
const drifters = $$('[data-drift]').map(el => ({ el, k: +el.dataset.drift, host: el.closest('section') }));
function updateDrift() {
  if (reduced.matches) return;
  const vh = innerHeight;
  for (const d of drifters) {
    const r = d.host.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1) - 0.5;
    d.el.style.transform = `translate3d(0,${(-p * d.k * vh).toFixed(1)}px,0) scale(${(1.035 + p * d.k * 0.5).toFixed(4)})`;
  }
}

/* ------------------------------------------------------------------ */
/* The answer you hold                                                 */
/* ------------------------------------------------------------------ */
const choices = $$('.choice');
function setAnswer(v) {
  choices.forEach(b => b.setAttribute('aria-pressed', b.dataset.answer === v));
  const note = $('#answer-note');
  const said = v === 'garment' ? 'a garment' : 'a set of rules';
  if (v && note) note.textContent = `You said: ${said}. Hold on to that. It is settled in the last room, not before.`;
  $$('[data-your-answer]').forEach(el => { el.hidden = !v; if (v) el.textContent = `At the entrance you said: ${said}.`; });
}
choices.forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('kimono-answer', b.dataset.answer); } catch {} setAnswer(b.dataset.answer); }));
try { setAnswer(localStorage.getItem('kimono-answer')); } catch {}

/* ------------------------------------------------------------------ */
/* Audio guide: one play button per stop, synced captions, no autoplay */
/* ------------------------------------------------------------------ */
const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const Guide = {
  data: null, audio: new Audio(), id: null, guided: false, chaseY: null,
  cap: $('#captions'), text: $('#cap-text'), bar: $('#cap-bar'),
  async init() {
    try { this.data = await (await fetch('assets/audio/narration.json', { cache: 'no-cache' })).json(); } catch { this.data = {}; }
    this.audio.preload = 'none';
    $$('.guide').forEach(b => {
      const d = this.data[b.dataset.audio];
      if (!d) { b.hidden = true; return; }
      const el = $('[data-dur]', b); if (el) el.textContent = fmt(d.duration);
      b.addEventListener('click', () => this.toggle(b.dataset.audio));
    });
    $('#cap-toggle').addEventListener('click', () => this.audio.paused ? this.audio.play() : this.audio.pause());
    $('#cap-close').addEventListener('click', () => this.stop());
    this.audio.addEventListener('play', () => this.sync());
    this.audio.addEventListener('pause', () => this.sync());
    this.audio.addEventListener('ended', () => { this.guided = false; this.sync(); setTimeout(() => { if (this.audio.ended) this.stop(); }, 1600); });
    const cancel = () => { this.guided = false; };
    addEventListener('wheel', cancel, { passive: true }); addEventListener('touchmove', cancel, { passive: true });
    addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) cancel(); if (e.key === 'Escape') this.stop(); });
  },
  toggle(id) {
    if (this.id === id) { this.audio.paused ? this.audio.play() : this.audio.pause(); return; }
    const d = this.data[id]; if (!d) return;
    this.id = id; this.audio.src = d.src; this.audio.currentTime = 0; this.text.textContent = ''; this._txt = '';
    const S = sections.find(s => s.el.id === id);
    // the guide can walk you through a room; any scroll input hands control back
    this.guided = !!(S && d.cues.some(c => 'frame' in c || 'photo' in c) && !reduced.matches && root.classList.contains('has-seq'));
    this.S = S || null; this.chaseY = null;
    if (S && S.el.getBoundingClientRect().top > 2 && this.guided) scrollTo(0, S.el.getBoundingClientRect().top + scrollY);
    this.audio.play().catch(() => {});
    if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: d.title, artist: 'Kimono: audio guide', album: 'Kimono: a garment, or a set of rules?' });
  },
  stop() { this.audio.pause(); this.id = null; this.guided = false; this.sync(); },
  sync() {
    const playing = !!this.id && !this.audio.paused;
    $$('.guide').forEach(b => b.setAttribute('aria-pressed', b.dataset.audio === this.id && playing));
    this.cap.classList.toggle('is-on', !!this.id);
    this.cap.classList.toggle('is-paused', !playing);
    $('#cap-toggle').setAttribute('aria-label', playing ? 'Pause the audio guide' : 'Play the audio guide');
  },
  tick() {
    if (!this.id) return;
    const d = this.data[this.id], t = this.audio.currentTime;
    const cue = d.cues.find(c => t >= c.t0 && t < c.t1);
    const txt = cue ? cue.text : '';
    if (txt && txt !== this._txt) { this._txt = txt; this.text.textContent = txt; }
    this.bar.style.scale = `${clamp(t / d.duration, 0, 1)} 1`;
    if (!(this.guided && this.S && !this.audio.paused)) { this.chaseY = null; return; }
    // picture timing from the same script: each cue start is keyed to a frame or a picture
    const poolOf = k => items.find(it => it.room === this.id && it.photo === String(k))?.pool;
    const pts = d.cues.filter(c => 'frame' in c || 'photo' in c).map(c => [c.t0, 'photo' in c ? scrollForState(this.S, null, poolOf(c.photo)) : scrollForState(this.S, c.frame)]).filter(p => p[1] != null);
    if (!pts.length) return;
    const last = d.cues[d.cues.length - 1];
    if (last.end_frame != null) { const y = scrollForState(this.S, last.end_frame); if (y != null) pts.push([last.t1, y]); }
    let y = pts[0][1];
    for (let i = 0; i < pts.length; i++) {
      const [t0, y0] = pts[i], nx = pts[i + 1];
      if (t >= t0) y = nx ? y0 + (nx[1] - y0) * smooth(clamp((t - t0) / Math.max(0.5, Math.min(nx[0] - t0, 4.5)), 0, 1)) : y0;
    }
    this.chaseY = this.chaseY == null ? scrollY : this.chaseY;
    this.chaseY += (y - this.chaseY) * 0.06;
    if (Math.abs(this.chaseY - scrollY) > 0.5) scrollTo(0, this.chaseY);
  },
};

/* before/after: the render and the flat-colour model view */
$$('[data-ba]').forEach(el => { const i = $('input', el); const set = () => el.style.setProperty('--x', i.value + '%'); i.addEventListener('input', set); set(); });
if ($('#film')) $$('[data-film-link]').forEach(a => { a.hidden = false; });

/* zoom viewer for photographs */
const zoom = $('#zoom');
document.addEventListener('click', e => {
  const a = e.target.closest('[data-zoom]'); if (!a || !zoom?.showModal) return;
  e.preventDefault(); $('#zoom-img').src = a.href; $('#zoom-img').alt = a.closest('.placard')?.querySelector('h3')?.textContent || '';
  const pl = a.closest('.placard'), cap = $('#zoom-cap');
  if (cap && pl) cap.innerHTML = `<b>${pl.querySelector('h3')?.textContent || ''}</b>${pl.querySelector('.placard__credit')?.textContent || ''}`;
  zoom.showModal();
});
zoom?.addEventListener('click', e => { if (e.target === zoom) zoom.close(); });

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
let lastKey = '';
function loop() {
  if (Seq.meta) {
    const st = timeline();
    const m = Seq.meta;
    if (st.wall) {
      const W = m.walls[st.wall.stop], idx = Seq.indexOf(W.frame);
      Seq.cur = Seq.target = idx;
      const cam = m._stopCam[st.wall.stop];
      const a = project(cam, W.pool0), b = project(cam, V.add(W.pool0, V.mul(W.along, W.spacing)));
      const P = (b[0] - a[0]) * Seq.rect.dw, fr = (st.wall.off * STRIDE) % 1;
      Seq.wall = { index: Math.round(idx), period: P, shift: fr * P };
    } else {
      if (Seq.wall) { Seq.wall = null; Seq.dirty = true; }
      Seq.target = Seq.indexOf(st.frame);
      const d = Seq.target - Seq.cur;
      Seq.cur = Math.abs(d) < 0.002 || reduced.matches || Math.abs(d) > 30 ? Seq.target : Seq.cur + d * 0.18;
    }
    Seq.pump(); Seq.draw();
    const cam = camAt(Seq.cur);
    const key = `${Seq.cur.toFixed(3)}|${st.wall ? st.wall.off.toFixed(4) : ''}|${innerWidth}x${innerHeight}`;
    if (key !== lastKey) {
      lastKey = key;
      const shown = { ...st, frame: st.wall ? st.frame : m.available[Math.floor(Seq.cur)] + (Seq.cur % 1) * ((m.available[Math.ceil(Seq.cur)] ?? 0) - m.available[Math.floor(Seq.cur)]) };
      updateScrub(shown); if (items.length && m.camera) updateHang(st, cam); updateRules(shown);
    }
  }
  updateRooms(); updateDrift(); updateStills(); Guide.tick();
  requestAnimationFrame(loop);
}

(async function start() {
  buildLeaders();
  await Promise.all([Seq.init(), Guide.init()]);
  if (Seq.meta) {
    $('#threshold')?.classList.add('is-live');
    const m = Seq.meta; m._stopCam = {};
    for (const [k, W] of Object.entries(m.walls || {})) { const i = Seq.indexOf(W.frame); m._stopCam[k] = camAt(Math.round(i)); }
    if (m.camera && m.walls) setupHang();
    addEventListener('resize', () => { lastKey = ''; }, { passive: true });
  }
  requestAnimationFrame(loop);
})();
