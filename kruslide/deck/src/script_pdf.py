#!/usr/bin/env python3
"""Render ../script.md to ../script.pdf (A4) with the deck's self-hosted fonts, via Playwright (node).
   python3 src/script_pdf.py      (from kruslide/deck)"""
import pathlib, subprocess, tempfile, markdown, json
D = pathlib.Path(__file__).resolve().parent.parent
md = (D / 'script.md').read_text()
body = markdown.markdown(md, extensions=['tables'])
F = (D / 'fonts').as_uri()
css = f'''
@font-face{{font-family:KS;src:url({F}/Inter-Regular.woff2);font-weight:400}}
@font-face{{font-family:KS;src:url({F}/Inter-SemiBold.woff2);font-weight:600}}
@font-face{{font-family:KS;src:url({F}/Inter-Bold.woff2);font-weight:700}}
@font-face{{font-family:KS;src:url({F}/Inter-ExtraBold.woff2);font-weight:800}}
@font-face{{font-family:KS;src:url({F}/Anuphan-Thai-400.woff2);font-weight:400;unicode-range:U+0E00-0E7F}}
@font-face{{font-family:KS;src:url({F}/Anuphan-Thai-600.woff2);font-weight:600;unicode-range:U+0E00-0E7F}}
@font-face{{font-family:KS;src:url({F}/Anuphan-Thai-700.woff2);font-weight:700 800;unicode-range:U+0E00-0E7F}}
@page{{size:A4;margin:16mm 16mm 18mm}}
body{{font:400 11pt/1.62 KS,sans-serif;color:#1C2A55}}
h1{{font:800 24pt/1.3 KS;margin:0 0 6pt;color:#1C2A55}}
h1::before{{content:"";display:inline-block;width:26pt;height:26pt;margin-right:10pt;vertical-align:-6pt;border-radius:7pt;
  background:url("{(D / 'img' / 'kruslide-icon.svg').as_uri()}") center/cover}}
h2{{font:800 15pt/1.35 KS;margin:18pt 0 6pt;padding:6pt 10pt;border-radius:6pt;background:#EEF2FF;color:#1C2A55;break-after:avoid}}
p{{margin:4pt 0 6pt}}ul{{margin:4pt 0 8pt;padding-left:16pt}}li{{margin:0 0 4pt}}
strong{{color:#C2410C;font-weight:700}}
table{{border-collapse:collapse;width:100%;font-size:10pt;margin:6pt 0 10pt}}
th,td{{border-bottom:1px solid #D9DEEA;padding:4pt 6pt;text-align:left}}th{{background:#1C2A55;color:#fff;font-weight:700}}
tr:last-child td{{font-weight:700;background:#FFF1C7}}
hr{{border:0;border-top:2px dashed #D9DEEA;margin:14pt 0}}
code{{font:600 9.5pt KS;background:#F2F4F9;padding:0 3pt;border-radius:3pt}}
'''
html = f'<!doctype html><html lang="th"><meta charset="utf-8"><style>{css}</style><body>{body}</body></html>'
with tempfile.TemporaryDirectory() as tmp:
    h = pathlib.Path(tmp) / 'script.html'; h.write_text(html)
    js = f'''const pw=require('playwright');(async()=>{{const b=await pw.chromium.launch();const p=await b.newPage();
await p.goto({json.dumps(h.as_uri())});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
await p.pdf({{path:{json.dumps(str(D / 'script.pdf'))},format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
footerTemplate:'<div style="font:8pt sans-serif;color:#8A93AE;width:100%;text-align:center"><span class=pageNumber></span> / <span class=totalPages></span> · KruSlide</div>',margin:{{top:'16mm',bottom:'18mm',left:'16mm',right:'16mm'}}}});await b.close();}})();'''
    subprocess.run(['node', '-e', js], check=True, cwd='/tmp', env={**__import__('os').environ, 'NODE_PATH': subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()})
print('wrote', D / 'script.pdf')
