/* Password lock for a deck built with `build.py --lock` (the teacher-only answer keys).
   The slides are encrypted at build time with AES-256-GCM; the key comes from the password via PBKDF2-SHA256.
   The published page holds only ciphertext, so without the password the answers cannot be read, not even in the
   page source. A link ending in #k=<password> opens the deck directly; the key is removed from the address bar at
   once, and a URL fragment is never sent to the web server.
   After a successful unlock the slides are put into #stage and boot() starts the deck engine and the tools. */
(function () {
  var data = document.getElementById('lockdata');
  if (!data) { boot(); return; }
  var d = JSON.parse(data.textContent), box = document.getElementById('lock');
  var input = document.getElementById('lock-pw'), btn = document.getElementById('lock-go'), msg = document.getElementById('lock-msg');
  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function unlock(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(d.s), iterations: d.n, hash: 'SHA-256' }, base,
          { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(d.i) }, key, bytes(d.c)); })
      .then(function (plain) { return new TextDecoder().decode(plain); });
  }
  function open(html) {
    document.getElementById('stage').innerHTML = html;   /* authenticated by AES-GCM: only our own build can produce it */
    data.remove(); box.remove(); document.documentElement.classList.remove('locked');
    boot();
  }
  function attempt(pw) {
    if (!pw) return;
    btn.disabled = true; msg.textContent = 'Opening…'; msg.className = '';
    unlock(pw).then(open, function () {
      btn.disabled = false; msg.textContent = 'That password is not right. Try again.'; msg.className = 'bad';
      input.select();
    });
  }
  btn.addEventListener('click', function () { attempt(input.value); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(input.value); });
  var m = /^#k=([^&]+)/.exec(location.hash);
  if (m) {
    var pw = decodeURIComponent(m[1]);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    attempt(pw);
  } else input.focus();
})();
