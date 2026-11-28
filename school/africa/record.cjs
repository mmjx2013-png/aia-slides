// Record the film in real time (1920x1080) and mux it with the narration -> africa.mp4
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const B = path.join(__dirname, 'build'), vdir = path.join(B, 'rec'); fs.rmSync(vdir, { recursive: true, force: true }); fs.mkdirSync(vdir);
(async () => {
  const b = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: vdir, size: { width: 1920, height: 1080 } } });
  const t0 = Date.now(); const p = await ctx.newPage();
  await p.goto('file://' + path.join(B, 'film.html') + '?rec'); await p.waitForFunction(() => window.FILM && window.FILM.ready); await p.waitForTimeout(1500);
  const total = await p.evaluate(() => window.FILM.total()); const ts = Date.now(); await p.evaluate(() => window.FILM.start());
  const offset = (ts - t0) / 1000 + 0.02; console.log('offset', offset.toFixed(2), 'total', total.toFixed(1));
  if (process.env.LIMIT) await p.waitForTimeout(+process.env.LIMIT * 1000); else await p.waitForFunction(() => window.FILM.done, null, { timeout: (total + 120) * 1000, polling: 2000 });
  const v = p.video(); await ctx.close(); await b.close(); const webm = await v.path();
  fs.writeFileSync(path.join(B, 'rec.json'), JSON.stringify({ webm, offset, total }));
  console.log('recorded', webm);
})();
