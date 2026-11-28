/**
 * The only script of the member and admin pages, served at /app/static/app.js. It is progressive enhancement:
 * every page works without it (plain forms). Pages that load it send a CSP that allows exactly this URL.
 *  - style quiz: a tap shows the pick (tick, the other card fades) before the form is sent; keys ← → ↓ / 1 2 3;
 *    the next question's images are fetched early.
 *  - admin: "copy brief" buttons copy the request brief to the clipboard.
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
