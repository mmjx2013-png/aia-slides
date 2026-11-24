// Kimono v3: scroll engine, tracked labels, audio guide.
// No dependencies. Everything degrades to a readable page without it.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 820px)');
const root = document.documentElement;
const SEQ_BASE = new URLSearchParams(location.search).get('seq') || 'assets/seq';   // dev override only

/* ------------------------------------------------------------------ */
/* The sequence: one continuous render, scrubbed by scroll             */
/* ------------------------------------------------------------------ */
const Seq = {
  meta: null, imgs: new Map(), loading: new Set(), canvas: $('#stage'), ctx: null,
  cur: 0, target: 0, drawn: -1, rect: { dx: 0, dy: 0, dw: 1, dh: 1 }, set: 'd', dirty: true,

  async init() {
    try {
      const r = await fetch(`${SEQ_BASE}/meta.json`, { cache: 'no-cache' });
      if (!r.ok) throw 0;
      this.meta = await r.json();
    } catch { return false; }
    const m = this.meta;
    m.count = m.count || Math.floor((m.frames - 1) / m.step) + 1;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.layout();
    addEventListener('resize', () => this.layout(), { passive: true });
    await this.load(0);
    root.classList.add('has-seq');
    return true;
  },

  // which pre-rendered set, and where the 1920x1080 frame sits on screen
  layout() {
    const m = this.meta; if (!m) return;
    const vw = this.canvas.clientWidth || innerWidth, vh = this.canvas.clientHeight || innerHeight;
    const [W, H] = m.size, crop = m.mobileCrop;
    const set = vw / vh < 0.6 ? 'm' : 'd';
    if (set !== this.set) { this.set = set; this.imgs.clear(); this.loading.clear(); }
    let s, dx, dy;
    if (set === 'd') {            // cover
      s = Math.max(vw / W, vh / H); dx = (vw - W * s) / 2; dy = (vh - H * s) / 2;
    } else {                      // phone: fit the centre column to the width, bias upward for the label sheet
      s = Math.max(vw / crop[2], (vh * 0.8) / H);
      dx = (vw - W * s) / 2; dy = Math.min(0, (vh - H * s) / 2 - vh * 0.035);
    }
    this.rect = { dx, dy, dw: W * s, dh: H * s, s };
    const k = clamp(1 / s, 1, Math.min(devicePixelRatio || 1, 2));
    this.canvas.width = Math.round(vw * k); this.canvas.height = Math.round(vh * k); this.k = k;
    this.dirty = true;
  },

  url(i) { const f = String(i * this.meta.step).padStart(4, '0'); return `${SEQ_BASE}/${this.set}/f_${f}.webp`; },

  load(i) {
    if (this.imgs.has(i)) return Promise.resolve();
    if (this.loading.has(i)) return Promise.resolve();
    this.loading.add(i);
    const set = this.set;
    return new Promise(res => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (set === this.set) { this.imgs.set(i, im); this.dirty = true; } this.loading.delete(i); res(); this.pump(); };
      im.onerror = () => { this.loading.delete(i); res(); };
      im.src = this.url(i);
    });
  },

  // coarse-to-fine, nearest to the current position first
  pump() {
    const m = this.meta; if (!m) return;
    const max = phone.matches ? 4 : 6, c = Math.round(this.cur), win = phone.matches ? 70 : 110;
    while (this.loading.size < max) {
      let best = -1, bs = 1e9;
      for (let i = Math.max(0, c - 24); i <= Math.min(m.count - 1, c + win); i++) {
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
    for (let d = 1; d < this.meta.count; d++) {
      if (this.imgs.has(i - d)) return i - d;
      if (this.imgs.has(i + d)) return i + d;
    }
    return -1;
  },

  draw() {
    const m = this.meta; if (!m || !this.ctx) return;
    const i0 = clamp(Math.floor(this.cur), 0, m.count - 1), frac = this.cur - i0;
    const a = this.nearest(i0); if (a < 0) return;
    const key = a + (a === i0 && this.imgs.has(i0 + 1) ? Math.round(frac * 16) / 16 : 0);
    if (key === this.drawn && !this.dirty) return;
    this.drawn = key; this.dirty = false;
    const { ctx, k } = this, r = this.rect, c = m.mobileCrop, W = m.size[0];
    const put = im => {
      if (this.set === 'd') ctx.drawImage(im, r.dx * k, r.dy * k, r.dw * k, r.dh * k);
      else ctx.drawImage(im, (r.dx + c[0] / W * r.dw) * k, r.dy * k, c[2] / W * r.dw * k, r.dh * k);
    };
    ctx.globalAlpha = 1; ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    put(this.imgs.get(a));
    if (a === i0 && frac > 0.02 && this.imgs.has(i0 + 1) && !reduced.matches) { ctx.globalAlpha = frac; put(this.imgs.get(i0 + 1)); ctx.globalAlpha = 1; }
  },

  // anchor in viewport px at the current (fractional) index, or null
  anchor(name) {
    const A = this.meta?.anchors?.[name]; if (!A) return null;
    const i0 = clamp(Math.floor(this.cur), 0, A.length - 1), i1 = Math.min(A.length - 1, i0 + 1), f = this.cur - i0;
    const p = A[i0], q = A[i1]; if (!p || !p[2]) return null;
    const x = q[2] ? p[0] + (q[0] - p[0]) * f : p[0], y = q[2] ? p[1] + (q[1] - p[1]) * f : p[1];
    return { x: this.rect.dx + x * this.rect.dw, y: this.rect.dy + y * this.rect.dh };
  },
};

/* ------------------------------------------------------------------ */
/* Scrub chapters                                                      */
/* ------------------------------------------------------------------ */
const scrubs = $$('.scrub').map(el => ({
  el, from: +el.dataset.from, to: +el.dataset.to, pin: $('.scrub__pin', el), head: $('.scrub__head', el),
  svg: $('.leaders', el), line: $('.scrub__line', el),
  labels: $$('.label', el).map((li, n) => ({ el: li, n: n + 1, anchor: li.dataset.anchor, from: +li.dataset.from, to: +li.dataset.to, side: li.dataset.side || 'right', g: null })),
}));

function frameFromScroll() {
  // full-rate frame number for the current scroll position
  let f = scrubs.length ? scrubs[0].from : 0;
  const vh = innerHeight;
  for (const s of scrubs) {
    const r = s.el.getBoundingClientRect();
    const span = r.height - vh;
    if (r.top > 0) break;
    f = s.from + clamp(-r.top / span, 0, 1) * (s.to - s.from);
  }
  return f;
}
function scrollForFrame(s, f) {
  const top = s.el.getBoundingClientRect().top + scrollY, span = s.el.offsetHeight - innerHeight;
  return top + clamp((f - s.from) / (s.to - s.from), 0, 1) * span;
}

const NS = 'http://www.w3.org/2000/svg';
function buildLeaders() {
  for (const s of scrubs) for (const L of s.labels) {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<path/><circle r="11"/><text>${L.n}</text>`;
    s.svg.append(g); L.g = g;
  }
}

function updateScrub(frame) {
  const vw = innerWidth, vh = innerHeight, isPhone = phone.matches;
  for (const s of scrubs) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) continue;
    const inside = r.top <= 1 && r.bottom >= vh - 1;
    const p = (frame - s.from) / (s.to - s.from);
    s.head?.classList.toggle('is-away', inside && p > 0.035);
    if (s.line) s.line.classList.toggle('is-on', inside && frame >= +s.line.dataset.from && frame <= +s.line.dataset.to + 0.5);
    let shown = null;
    for (const L of s.labels) {
      const on = inside && frame >= L.from && frame <= L.to;
      const a = on ? Seq.anchor(L.anchor) : null;
      if (on) shown = L;
      L.on = on; L.a = a;
    }
    for (const L of s.labels) {
      const on = L.on && (!isPhone || L === shown);
      L.el.classList.toggle('is-on', on);
      L.g.classList.toggle('is-on', on && !!L.a);
      if (!on) continue;
      const a = L.a;
      if (!isPhone) {
        const w = L.el.offsetWidth, h = L.el.offsetHeight, g = Math.max(18, vw * 0.035);
        const x = L.side === 'left' ? g : vw - g - w;
        const ay = a ? a.y : vh * 0.5;
        const y = clamp(ay - h * 0.5, vh * 0.2, vh - h - vh * 0.16);
        L.el.style.left = x + 'px'; L.el.style.top = y + 'px';
        if (a) {
          const x1 = L.side === 'left' ? x + w + 6 : x - 6, y1 = y + Math.min(h * 0.5, 44);
          const dir = Math.sign(a.x - x1) || 1, rr = 11;
          const ex = a.x - dir * rr * 0.92, xm = x1 + (ex - x1) * 0.4;
          $('path', L.g).setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}H${xm.toFixed(1)}L${ex.toFixed(1)} ${(a.y + (y1 - a.y) * 0.02).toFixed(1)}`);
        }
      }
      if (a) {
        $('circle', L.g).setAttribute('cx', a.x); $('circle', L.g).setAttribute('cy', a.y);
        $('text', L.g).setAttribute('x', a.x); $('text', L.g).setAttribute('y', a.y + 0.5);
      }
    }
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
  for (const sec of rooms) { if (sec.getBoundingClientRect().top <= mid) cur = sec; }
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
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1) - 0.5;       // -0.5 .. 0.5 through the viewport
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
  if (v && note) note.textContent = `You said: ${v === 'garment' ? 'a garment' : 'a set of rules'}. Hold on to that. It is settled in the last room, not before.`;
  $$('[data-your-answer]').forEach(el => { el.hidden = !v; el.dataset.yourAnswer = v || ''; });
}
choices.forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('kimono-answer', b.dataset.answer); } catch {} setAnswer(b.dataset.answer); }));
try { setAnswer(localStorage.getItem('kimono-answer')); } catch {}

/* ------------------------------------------------------------------ */
/* Audio guide: one play button per stop, synced captions, no autoplay */
/* ------------------------------------------------------------------ */
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
    this.id = id; this.audio.src = d.src; this.audio.currentTime = 0;
    this.text.textContent = '';
    const s = scrubs.find(s => s.el.dataset.audio === id);
    // the narration can walk you through a 3D room; any scroll input hands control back
    this.guided = !!(s && d.cues.some(c => 'frame' in c) && !reduced.matches && root.classList.contains('has-seq'));
    this.scrub = s || null; this.chaseY = null;
    this.audio.play().catch(() => {});
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: d.title, artist: 'Kimono: audio guide', album: 'Kimono: a garment, or a set of rules?' });
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
    if (txt !== this._txt) { this._txt = txt; if (txt) this.text.textContent = txt; }
    this.bar.style.scale = `${clamp(t / d.duration, 0, 1)} 1`;
    if (this.guided && this.scrub && !this.audio.paused) {
      // picture timing from the same script: frame keyed to each cue start
      const pts = d.cues.filter(c => 'frame' in c).map(c => [c.t0, c.frame]);
      const last = d.cues[d.cues.length - 1];
      pts.push([last.t1, last.end_frame ?? this.scrub.to]);
      let f = pts[0][1];
      for (let i = 0; i < pts.length - 1; i++) {
        const [t0, f0] = pts[i], [t1, f1] = pts[i + 1];
        if (t >= t0) { const u = clamp((t - t0) / (t1 - t0), 0, 1); f = f0 + (f1 - f0) * (u * u * (3 - 2 * u)); }
      }
      const y = scrollForFrame(this.scrub, f);
      this.chaseY = this.chaseY == null ? scrollY : this.chaseY;
      this.chaseY += (y - this.chaseY) * 0.07;
      if (Math.abs(this.chaseY - scrollY) > 0.5) scrollTo(0, this.chaseY);
    } else this.chaseY = null;
  },
};
const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
let lastFrame = -1;
function loop() {
  if (Seq.meta) {
    const f = frameFromScroll();
    Seq.target = f / Seq.meta.step;
    const d = Seq.target - Seq.cur;
    Seq.cur = Math.abs(d) < 0.002 || reduced.matches ? Seq.target : Seq.cur + d * 0.16;   // soften wheel steps
    Seq.pump(); Seq.draw();
    const shown = Seq.cur * Seq.meta.step;
    if (Math.abs(shown - lastFrame) > 0.01 || Seq.dirty) { updateScrub(shown); lastFrame = shown; }
  }
  updateRooms(); updateDrift(); Guide.tick();
  requestAnimationFrame(loop);
}

(async function start() {
  buildLeaders();
  await Promise.all([Seq.init(), Guide.init()]);
  if (Seq.meta) { $('#threshold')?.classList.add('is-live'); addEventListener('resize', () => { lastFrame = -1; }, { passive: true }); }
  requestAnimationFrame(loop);
})();
