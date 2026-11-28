/**
 * The only script of the member and admin pages, served at /app/static/app.js. It is progressive enhancement:
 * every page works without it (plain forms). Pages that load it send a CSP that allows exactly this URL.
 *  - style quiz: a tap shows the pick (tick, the other card fades) before the form is sent; keys ← → ↓ / 1 2 3;
 *    the next question's images are fetched early.
 *  - admin: "copy brief" buttons copy the request brief to the clipboard; the access panel's "ทั้งเล่ม" box ticks a
 *    book's units; the access matrix sends a tapped cell in the background (its page allows connect-src to that URL).
 */
export const APP_JS = `(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const quiz = document.querySelector('form[data-quiz]');
  if (quiz) {
    let busy = false;
    const reset = () => {
      busy = false;
      quiz.classList.remove('picked');
      for (const b of quiz.querySelectorAll('.chosen')) b.classList.remove('chosen');
    };
    const choose = (btn) => {
      if (busy || !btn) return;
      busy = true;
      quiz.classList.add('picked');
      btn.classList.add('chosen');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        if (typeof quiz.requestSubmit === 'function') quiz.requestSubmit(btn);
        else { const h = document.createElement('input'); h.type = 'hidden'; h.name = btn.name; h.value = btn.value; quiz.appendChild(h); quiz.submit(); }
      }, reduce ? 0 : 340);
    };
    quiz.addEventListener('click', (e) => {
      const btn = e.target.closest('button[name="choice"]');
      if (!btn) return;
      e.preventDefault();
      choose(btn);
    });
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const v = { ArrowLeft: 'a', 1: 'a', ArrowRight: 'b', 2: 'b', ArrowDown: 'both', 3: 'both' }[e.key];
      if (!v) return;
      e.preventDefault();
      choose(quiz.querySelector('button[name="choice"][value="' + v + '"]'));
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) reset(); });
    for (const src of (quiz.dataset.next || '').split(' ')) {
      if (!src) continue;
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    }
  }

  // Access panel: "ทั้งเล่ม" ticks every unit of the book; unit boxes show the book box as all / some / none.
  for (const f of document.querySelectorAll('form[data-access]')) {
    const sync = (id) => {
      const book = f.querySelector('input[data-book="' + id + '"]');
      const units = [...f.querySelectorAll('input[data-of="' + id + '"]')];
      if (!book || !units.length) return;
      const n = units.filter((u) => u.checked).length;
      book.checked = n === units.length;
      book.indeterminate = n > 0 && n < units.length;
    };
    f.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.book) {
        for (const u of f.querySelectorAll('input[data-of="' + el.dataset.book + '"]')) u.checked = el.checked;
        el.indeterminate = false;
      } else if (el.dataset.of) sync(el.dataset.of);
    });
    for (const b of f.querySelectorAll('input[data-book]')) sync(b.dataset.book);
  }

  // Picking a date selects "ถึงวันที่…" in the same expiry control.
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== 'date' || !/expiry_date$/.test(el.name) || !el.value) return;
    const prefix = el.name.slice(0, -'expiry_date'.length);
    const scope = el.closest('form') || document;
    const radio = scope.querySelector('input[type="radio"][name="' + prefix + 'expiry"][value="date"]');
    if (radio) radio.checked = true;
    const sel = scope.querySelector('select[name="' + prefix + 'expiry"]');
    if (sel) sel.value = 'date';
  });

  // Access matrix: a tap sends that one cell in the background and flips it; without script it is a normal form post.
  const mx = document.querySelector('form[data-matrix]');
  if (mx) {
    const paint = (b) => {
      const g = Number(b.dataset.g), s = b.dataset.s === '1';
      if (b.classList.contains('u')) {
        b.className = 'cell u ' + (g && s ? 'gs' : g ? 'g' : s ? 's' : '');
      } else {
        const m = Number(b.dataset.m);
        b.className = 'cell b ' + (s ? 's' : g === m ? 'full' : g ? 'part' : '');
        const em = b.querySelector('em');
        if (em) em.textContent = s ? '฿' : g && g < m ? g + '/' + m : '';
      }
    };
    mx.addEventListener('click', async (e) => {
      const b = e.target.closest('button[name="cell"]');
      if (!b || b.disabled) return;
      e.preventDefault();
      b.classList.add('busy');
      const body = new URLSearchParams();
      for (const [k, v] of new FormData(mx)) if (typeof v === 'string' && k !== 'sel') body.append(k, v);
      body.set('cell', b.value);
      try {
        const res = await fetch(mx.action, { method: 'POST', body, redirect: 'manual', credentials: 'same-origin' });
        if (res.type !== 'opaqueredirect' && !res.ok) throw new Error('HTTP ' + res.status);
        if (b.classList.contains('u')) b.dataset.g = b.dataset.g === '1' ? '0' : '1';
        else b.dataset.g = Number(b.dataset.g) === Number(b.dataset.m) ? '0' : b.dataset.m;
        paint(b);
      } catch (_) {
        location.reload();
        return;
      }
      b.classList.remove('busy');
    });
  }

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall back below */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    return ok;
  };
  for (const b of document.querySelectorAll('[data-copy]')) {
    b.hidden = false;
    b.addEventListener('click', async () => {
      const src = document.getElementById(b.dataset.copy);
      if (!src) return;
      const text = src instanceof HTMLTemplateElement ? src.content.textContent : ('value' in src ? src.value : src.textContent);
      const label = b.querySelector('.lbl');
      const before = label ? label.textContent : '';
      const ok = await copyText(text || '');
      b.classList.toggle('copied', ok);
      if (label) label.textContent = ok ? 'คัดลอกแล้ว' : 'คัดลอกไม่ได้ เลือกข้อความเอง';
      setTimeout(() => { b.classList.remove('copied'); if (label) label.textContent = before; }, 2200);
    });
  }
})();
`;
