import { describe, it, expect } from 'vitest';
import { injectWatermark, watermarkText } from '../src/lib/watermark';
import { inlineScriptHashes, countSlides } from '../src/lib/deckmeta';
import { SAMPLE_DECK } from './helpers';

async function run(htmlText: string, text: string) {
  return injectWatermark(new Response(htmlText, { headers: { 'Content-Type': 'text/html' } }), text).text();
}

describe('watermark injection', () => {
  it('adds the style to <head> and one visible mark at the end of <body>', async () => {
    const out = await run(SAMPLE_DECK, watermarkText('ครูมานี', 'โรงเรียนบ้านดอน'));
    expect(out.match(/id="ks-wm"/g)).toHaveLength(1);
    expect(out.match(/<style id="ks-wm-style">/g)).toHaveLength(1);
    expect(out.indexOf('ks-wm-style')).toBeLessThan(out.indexOf('</head>'));
    expect(out.indexOf('id="ks-wm"')).toBeGreaterThan(out.indexOf('</main>'));
    expect(out.indexOf('id="ks-wm"')).toBeLessThan(out.indexOf('</body>'));
    expect(out).toContain('>Licensed to ครูมานี · โรงเรียนบ้านดอน</div>');
    expect(out).toContain('pointer-events:none'); // it never blocks the slide controls
  });

  it('keeps the deck intact: same slides, and the inline script is byte-identical so its CSP hash still matches', async () => {
    const out = await run(SAMPLE_DECK, 'Licensed to A · B');
    expect(countSlides(out)).toBe(countSlides(SAMPLE_DECK));
    expect(await inlineScriptHashes(out)).toEqual(await inlineScriptHashes(SAMPLE_DECK));
    expect(out).not.toMatch(/<script[^>]*>[^<]*ks-wm/); // the mark adds no script
  });

  it('escapes the teacher\'s name and school (no HTML injection into the deck)', async () => {
    const out = await run(SAMPLE_DECK, watermarkText('<img src=x onerror=alert(1)>', '"</div><script>alert(2)</script>'));
    expect(out).not.toContain('<img src=x');
    expect(out).not.toContain('<script>alert(2)');
    expect(out).toContain('&lt;img src&#61;x onerror&#61;alert(1)&gt;');
  });

  it('works on the real Unit 4 deck structure (one inline script, many slides)', async () => {
    const big = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${'<section class="slide" data-steps="2">x</section>'.repeat(67)}<script>var a = "</sc" + "ript>";</script></body></html>`;
    const out = await run(big, 'Licensed to A · B');
    expect(countSlides(out)).toBe(67);
    expect(await inlineScriptHashes(big)).toHaveLength(1);
  });

  it('slide count ignores scripts and comments, and class names that only contain "slide"', () => {
    const deck = '<section class="slide opener">a</section><section class="slide">b</section><section class="slide-note">x</section>'
      + '<!-- <section class="slide"> --><script>/* <section class="slide" data-steps="N"> */</script>';
    expect(countSlides(deck)).toBe(2);
  });

  it('script hashes ignore external scripts and JSON data blocks', async () => {
    const h = await inlineScriptHashes('<script src="/x.js"></script><script type="application/json">{"a":1}</script><script>go()</script><script type="module">m()</script>');
    expect(h).toHaveLength(2);
  });
});
