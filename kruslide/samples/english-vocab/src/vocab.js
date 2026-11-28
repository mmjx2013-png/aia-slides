/* vocab.js · the live parts of the Weather words sample (vanilla JS, no libraries, no network).
   Slide 1: flashcards flip in 3D (tap one; b1 flips them all).
   Slide 2: word stickers are dragged (or tapped) onto comic panels; Check / Show answer / Reset.
   Slide 3: a sentence builder in a speech bubble: drag tiles into order (a caret shows where a tile will land), Check.
   While a sticker or tile is dragged it is lifted onto the slide itself, so it is never clipped and always on top. */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, S = K.S, tk = K.tk;
  function pic(w, cls) { var s = S('svg', { viewBox: '0 0 240 240', 'class': cls || 'pic', 'aria-hidden': 'true' }); S('use', { href: '#w-' + w }, s); return s; }
  /* while dragging, a copy flies on the slide itself (never clipped, always on top) and the original waits, hidden.
     The original is never moved during the drag, so the pointer capture is kept. Returns the copy. */
  function lift(el, slide) {
    var b = K.box(el), g = el.cloneNode(true);
    g.classList.add('ghost'); g.removeAttribute('tabindex'); g.setAttribute('aria-hidden', 'true');
    g.style.position = 'absolute'; g.style.left = b.x + 'px'; g.style.top = b.y + 'px'; g.style.width = b.w + 'px'; g.style.height = b.h + 'px'; g.style.margin = '0';
    slide.appendChild(g); el._ghost = g; el.style.visibility = 'hidden';
    return g;
  }
  /* drop: remove the copy and return its last stage box */
  function unlift(el) {
    var g = el._ghost, b = g ? K.box(g) : K.box(el);
    if (g) g.remove(); el._ghost = null; el.style.visibility = '';
    return b;
  }
  /* animate a set of elements from their old boxes to where they are now */
  function boxes(list) { return list.map(function (x) { return K.box(x); }); }
  function flipAll(list, before, skip) {
    list.forEach(function (x, i) {
      if (x === skip || !before[i]) return;
      var a = before[i], b = K.box(x);
      if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) return;
      K.anim(x, [{ transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  }
  function pop(el, deg) { K.anim(el, [{ transform: 'scale(1.25) rotate(' + (deg || -6) + 'deg)' }, { transform: 'scale(.95)', offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); }
  function shake(el) { K.anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'none' }], { duration: 380 }); }
  function cheer() { [523, 659, 784, 1046].forEach(function (f, k) { K.tone(f, 200, 'square', 0.02, 0.09 * k); }); }

  /* ================= slide 1 · flashcards ================= */
  (function () {
    var cards = $$('#v1-grid .card'); if (!cards.length) return;
    cards.forEach(function (c, i) {
      var d = c.dataset, f = E('div', 'flip', null, c);
      var fr = E('div', 'face front', null, f), bk = E('div', 'face back', null, f);
      E('b', 'num', String(i + 1), fr); fr.appendChild(pic(d.w)); E('span', 'tapme', 'tap!', fr);
      bk.appendChild(pic(d.w, 'mini')); E('div', 'word', d.w, bk); E('div', 'syl', d.syl, bk); E('div', 'sent', d.s, bk);
      c.setAttribute('role', 'button'); c.tabIndex = 0; c.setAttribute('aria-label', 'Card ' + (i + 1) + ': ' + d.w + '. Tap to flip.');
      K.tap(c, function () { c.classList.toggle('flipped'); K.tone(c.classList.contains('flipped') ? 660 : 520, 90, 'triangle', 0.03); });
    });
    var tm = [];
    K.ctl('ev-cards', {
      set: function (st, prev) {
        tm.forEach(clearTimeout); tm = [];
        cards.forEach(function (c, i) {
          if (prev < 0 || K.still()) c.classList.toggle('flipped', st >= 1);
          else tm.push(setTimeout(function () { c.classList.toggle('flipped', st >= 1); }, i * 110));
        });
      },
      leave: function () { tm.forEach(clearTimeout); }
    });
  })();

  /* ================= slide 2 · stick the labels ================= */
  (function () {
    var sl = $('#ev-labels'); if (!sl) return;
    var panels = $$('.v2-p', sl), home = $('#v2-sts'), slots = [], sel = null;
    var ORDER = ['cloudy', 'sunny', 'stormy', 'rainy', 'windy', 'snowy'];
    panels.forEach(function (p) {
      p.appendChild(pic(p.dataset.w, 'v2-pic'));
      var s = E('div', 'v2-slot', null, p); s._panel = p; slots.push(s);
      p.setAttribute('role', 'button'); p.tabIndex = 0; p.setAttribute('aria-label', 'Picture: stick a word here');
      K.tap(p, function () { if (sel) place(sel, s); });
    });
    var stickers = ORDER.map(function (w) {
      var t = E('div', 'sticker', w, home); t.dataset.w = w;
      t.setAttribute('role', 'button'); t.tabIndex = 0; t.setAttribute('aria-label', 'Sticker: ' + w);
      E('i', 'mk', null, t);
      K.drag(t, {
        tap: function () {
          if (t.parentNode.classList.contains('v2-slot')) { ac.hide(); back(t); ft.say(''); return; }
          select(sel === t ? null : t);
        },
        start: function () { ac.hide(); select(null); lift(t, sl); },
        move: function (d, e, p) {
          t._ghost.style.transform = 'translate(' + d.dx + 'px,' + d.dy + 'px) rotate(-4deg) scale(1.08)';
          var h = K.hit(p, panels, 0); panels.forEach(function (x) { x.classList.toggle('hot', x === h); });
        },
        end: function (d, e, p, cancelled) {
          panels.forEach(function (x) { x.classList.remove('hot'); });
          var h = cancelled ? null : K.hit(p, panels, 0), b = unlift(t);
          if (h) place(t, h.querySelector('.v2-slot'), b);
          else { var a = K.box(t); K.anim(t, [{ transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
        }
      });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(sel === t ? null : t); } });
      return t;
    });
    function select(t) { if (sel) sel.classList.remove('sel'); sel = t; if (sel) sel.classList.add('sel'); sl.classList.toggle('picking', !!sel); }
    function unmark() { stickers.forEach(function (t) { t.classList.remove('ok', 'no'); }); }
    function place(t, s, fromBox) {
      ac.hide(); unmark(); select(null);
      var all = stickers, before = boxes(all);
      if (fromBox) before[all.indexOf(t)] = fromBox;
      var old = s.querySelector('.sticker'); if (old && old !== t) home.appendChild(old);
      s.appendChild(t);
      flipAll(all, before);
      pop(t, -8); K.tone(880, 70, 'square', 0.02);
      ft.say('');
    }
    function back(t) { var before = boxes(stickers); home.appendChild(t); unmark(); flipAll(stickers, before); }
    var ft = K.footer($('#v2-foot'), { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'Tap a sticker, then a picture' });
    function check() {
      ac.hide(); unmark(); select(null);
      var placed = stickers.filter(function (t) { return t.parentNode.classList.contains('v2-slot'); });
      if (!placed.length) { ft.say('info', 'Stick some words first!'); return; }
      var right = 0;
      placed.forEach(function (t) { var ok = t.parentNode._panel.dataset.w === t.dataset.w; t.classList.add(ok ? 'ok' : 'no'); if (ok) right++; else shake(t); });
      if (right === 6) { ft.say('ok', 'WOW! All 6 correct!'); cheer(); placed.forEach(function (t, k) { setTimeout(function () { pop(t, 6); }, k * 80); }); }
      else ft.say('no', right + ' of ' + placed.length + ' correct' + (placed.length < 6 ? ' · ' + (6 - placed.length) + ' to go' : ''));
    }
    function reset() { ac.off(); select(null); unmark(); var before = boxes(stickers); stickers.forEach(function (t) { home.appendChild(t); }); flipAll(stickers, before); ft.say(''); }
    var ac = tk.answerCtl($('#v2-tray'), ft, {
      snap: function () { return stickers.map(function (t) { return t.parentNode; }); },
      reveal: function () { select(null); var before = boxes(stickers); stickers.forEach(function (t) { var s = slots.filter(function (x) { return x._panel.dataset.w === t.dataset.w; })[0]; var o = s.querySelector('.sticker'); if (o && o !== t) home.appendChild(o); s.appendChild(t); t.classList.add('ok'); }); flipAll(stickers, before); },
      restore: function (s) { unmark(); var before = boxes(stickers); stickers.forEach(function (t, i) { s[i].appendChild(t); }); flipAll(stickers, before); }
    });
    window.__labels = { state: function () { return stickers.map(function (t) { return t.dataset.w + '>' + (t.parentNode._panel ? t.parentNode._panel.dataset.w : '-') + (t.classList.contains('ok') ? '✓' : t.classList.contains('no') ? '✗' : ''); }); } };
    K.ctl('ev-labels', { set: function () {}, leave: function () { select(null); } });
  })();

  /* ================= slide 3 · sentence builder ================= */
  (function () {
    var sl = $('#ev-build'); if (!sl) return;
    var bub = $('#v3-bub'), done = {};
    function Builder(root) {
      var answer = root.dataset.answer.split('|'), start = root.dataset.start.split('|');
      var line = E('div', 'v3-line', null, root), tray = E('div', 'v3-tray', null, root), fhost = E('div', 'v3-foot', null, root);
      var caret = E('i', 'v3-caret', null, root);
      line.setAttribute('aria-label', 'Your sentence'); line.setAttribute('role', 'list');
      var dragT = null;
      var tiles = start.map(function (w, k) {
        var t = E('span', 'wt', w, tray); t._k = k; t.setAttribute('role', 'button'); t.tabIndex = 0;
        K.drag(t, {
          tap: function () { move(t, t.parentNode === line ? null : line.children.length); },
          start: function () { ac.hide(); unmark(); dragT = t; lift(t, sl); },
          move: function (d, e, p) {
            t._ghost.style.transform = 'translate(' + d.dx + 'px,' + d.dy + 'px) rotate(3deg) scale(1.06)';
            var i = over(p); caret.style.display = i < 0 ? 'none' : 'block';
            if (i >= 0) showCaret(i);
          },
          end: function (d, e, p, cancelled) {
            caret.style.display = 'none';
            var i = cancelled ? -1 : over(p), b = unlift(t); dragT = null;
            if (i >= 0) move(t, i, b);
            else if (t.parentNode === line && !cancelled && !inside(p, line, 80)) move(t, null, b);
            else { var a = K.box(t); K.anim(t, [{ transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
          }
        });
        t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); move(t, t.parentNode === line ? null : line.children.length); } });
        return t;
      });
      function inside(p, el, pad) { var b = K.box(el); return p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < b.y + b.h + pad; }
      /* insertion index in the line for stage point p (reading order), or -1 when p is not over the bubble */
      function over(p) {
        if (!inside(p, line, 40)) return -1;
        var ts = [].slice.call(line.children).filter(function (x) { return x !== dragT; }), n = 0;
        ts.forEach(function (x) { var b = K.box(x); if (b.cy < p.y - b.h / 2 || (Math.abs(b.cy - p.y) <= b.h / 2 && b.cx < p.x)) n++; });
        return n;
      }
      function showCaret(i) {
        var ts = [].slice.call(line.children).filter(function (x) { return x !== dragT; }), r = K.box(root), b, x, y, h;
        if (!ts.length) { b = K.box(line); x = b.x + 30; y = b.cy - 34; h = 68; }
        else if (i < ts.length) { b = K.box(ts[i]); x = b.x - 9; y = b.y; h = b.h; }
        else { b = K.box(ts[ts.length - 1]); x = b.x + b.w + 5; y = b.y; h = b.h; }
        caret.style.left = (x - r.x) + 'px'; caret.style.top = (y - r.y) + 'px'; caret.style.height = h + 'px';
      }
      function move(t, i, fromBox) {
        ac.hide(); unmark();
        var before = boxes(tiles); if (fromBox) before[tiles.indexOf(t)] = fromBox;
        if (i === null) tray.appendChild(t);
        else { var ts = [].slice.call(line.children).filter(function (x) { return x !== t; }); line.insertBefore(t, ts[i] || null); }
        flipAll(tiles, before);
        K.tone(i === null ? 440 : 620, 60, 'triangle', 0.025);
        ft.say(''); setDone(false);
      }
      function unmark() { tiles.forEach(function (t) { t.classList.remove('bad', 'good'); }); }
      function words() { return [].slice.call(line.children).map(function (t) { return t.textContent; }); }
      function setDone(v) { done[root.id] = v; bub.classList.toggle('ok', v); }
      var ft = K.footer(fhost, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'Drag the words into the bubble' });
      function check() {
        ac.hide(); unmark();
        var w = words();
        if (w.length < answer.length) { ft.say('info', 'Use all ' + answer.length + ' words (' + (answer.length - w.length) + ' left).'); return; }
        var bad = 0;
        w.forEach(function (x, i) { var ok = x === answer[i]; [].slice.call(line.children)[i].classList.add(ok ? 'good' : 'bad'); if (!ok) bad++; });
        if (!bad) { ft.say('ok', 'Great! That’s right.'); setDone(true); cheer(); var g = $('#v3-great'); g.classList.remove('go'); void g.offsetWidth; g.classList.add('go'); }
        else { ft.say('no', bad + (bad === 1 ? ' word is' : ' words are') + ' in the wrong place.'); shake(line); }
      }
      function arrange(order) {
        var before = boxes(tiles);
        tiles.forEach(function (t) { tray.appendChild(t); });
        order.forEach(function (k) { line.appendChild(tiles[k]); });
        flipAll(tiles, before);
      }
      function reset() { ac.off(); unmark(); var before = boxes(tiles); tiles.forEach(function (t) { tray.appendChild(t); }); flipAll(tiles, before); ft.say(''); setDone(false); }
      var ac = tk.answerCtl(root, ft, {
        snap: function () { return { line: [].slice.call(line.children).map(function (t) { return t._k; }), done: !!done[root.id] }; },
        reveal: function () { arrange(answer.map(function (w) { return start.indexOf(w); })); tiles.forEach(function (t) { t.classList.add('good'); }); bub.classList.add('ok'); },
        restore: function (s) { unmark(); arrange(s.line); setDone(s.done); }
      });
      return { root: root, words: words, check: check, reset: reset, ac: ac, sync: function () { bub.classList.toggle('ok', !!done[root.id] || root.classList.contains('w-shown')); } };
    }
    var A = Builder($('#v3-a')), Q = Builder($('#v3-q'));
    var g = E('div', 'burst v3-great', null, sl); g.id = 'v3-great';
    g.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M100 4 L118 52 L166 22 L150 74 L198 86 L154 112 L184 156 L132 146 L124 196 L96 156 L58 192 L58 140 L6 140 L44 104 L8 66 L60 66 L56 14 L90 50 Z" fill="#FFD23F" stroke="#141414" stroke-width="6" stroke-linejoin="round"/></svg><span>Great!</span>';
    K.ctl('ev-build', { set: function (st) { (st >= 1 ? Q : A).sync(); } });
    window.__build = { A: A, Q: Q };
  })();

  K.start();
})();
