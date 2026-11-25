// Record the deck's own "Play as film" mode: CDP screencast -> constant 30 fps H.264, plus a log of when each narration clip starts.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const LIMIT = +(process.argv[2] || 600), OUT = process.argv[3] || 'raw.mp4', FPS = 30, S = +(process.argv[4] || 4);  // S: slow-motion factor, undone in the output timeline
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.addInitScript((S) => {
    // slow the page's clock by S so the screencast catches every frame; the writer below compresses time back by S
    const oNow = Date.now.bind(Date), oPerf = performance.now.bind(performance), T0 = oNow(), P0 = oPerf();
    const oST = window.setTimeout.bind(window), oSI = window.setInterval.bind(window);
    window.__realNow = oNow;
    Date.now = () => T0 + (oNow() - T0) / S;
    performance.now = () => P0 + (oPerf() - P0) / S;
    window.setTimeout = (f, d, ...a) => oST(f, (d || 0) * S, ...a);
    window.setInterval = (f, d, ...a) => oSI(f, (d || 0) * S, ...a);
    oSI(() => document.querySelectorAll('video,audio').forEach(m => { if (m.playbackRate !== 1 / S) { m.defaultPlaybackRate = 1 / S; m.playbackRate = 1 / S; } }), 100);
    window.__plays = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.defaultPlaybackRate = 1 / S; this.playbackRate = 1 / S; if (/\.mp3/.test(this.src)) window.__plays.push({ src: this.src.split('/').pop(), t: window.__realNow() / 1000 }); return orig.call(this); };
  }, S);
  await p.goto('http://127.0.0.1:8765/deck/index.html', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '#ctl,#tl{display:none!important}' });
  await p.waitForTimeout(3000);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '16', '-pix_fmt', 'yuv420p', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const s = await p.context().newCDPSession(p);
  let last = null, t0 = null, n = 0, got = 0;
  const emit = (upto) => { while (last && t0 + n * S / FPS <= upto) { ff.stdin.write(last); n++; } };
  s.on('Page.screencastFrame', async (f) => {
    s.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    const ts = f.metadata.timestamp, buf = Buffer.from(f.data, 'base64'); got++;
    if (t0 === null) t0 = ts;
    emit(ts); last = buf;
  });
  await s.send('Animation.enable');
  await s.send('Animation.setPlaybackRate', { playbackRate: 1 / S });
  await s.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await p.waitForTimeout(1500);
  await p.keyboard.press('p');
  const tStart = Date.now();
  while ((Date.now() - tStart) / 1000 < LIMIT) {
    await p.waitForTimeout(1000);
    if (!(await p.evaluate(() => document.body.classList.contains('film')))) { await p.waitForTimeout(3000); break; }
  }
  await s.send('Page.stopScreencast');
  emit(Date.now() / 1000);
  const plays = await p.evaluate(() => window.__plays);
  fs.writeFileSync(OUT.replace(/\.mp4$/, '.json'), JSON.stringify({ S, t0, frames_in: got, frames_out: n, wall: (Date.now() - tStart) / 1000, plays }, null, 1));
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  console.log(`screencast frames ${got}, written ${n} (${(n / FPS).toFixed(1)} s), effective fps ${(got / (n / FPS)).toFixed(1)}`);
})();
