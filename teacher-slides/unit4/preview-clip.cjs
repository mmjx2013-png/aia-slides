// Records a short preview clip of the deck's animation (for the owner to see motion; not a deliverable).
// node preview-clip.cjs [index.html] [out.mp4]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const file = path.resolve(process.argv[2] || 'index.html');
const out = path.resolve(process.argv[3] || 'preview-clip.mp4');
const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'clip-'));
// [slide id, number of clicks to show, ms to wait after entering and after each click]
const plan = [['t-title', 0, 3000], ['l1-hook', 3, 2600], ['l3a-why', 2, 3000], ['l3a-two', 3, 2200], ['l3b-intro', 1, 3200], ['l3b-make', 4, 2000], ['l4-case', 3, 2400], ['l4-cycle', 4, 1600], ['l4-end', 1, 2600]];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => document.fonts.ready);
  for (const [id, clicks, wait] of plan) {
    const k = await p.evaluate(id => [...document.querySelectorAll('.slide')].findIndex(s => s.id === id), id);
    if (k < 0) { console.log('skip (not found): ' + id); continue; }
    await p.evaluate(k => __deck.jump(k, 0), k);
    await p.waitForTimeout(wait);
    for (let c = 0; c < clicks; c++) { await p.evaluate(() => __deck.next()); await p.waitForTimeout(wait); }
  }
  const v = p.video(); await ctx.close(); await b.close();
  const webm = await v.path();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart', out]);
  console.log('wrote ' + out);
})();
