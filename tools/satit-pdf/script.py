import markdown, re, sys
from pathlib import Path
src, thumbs, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
FONTS = Path('/home/user/aia-slides/satit-site/fonts')
md = src.read_text()
shots = {int(p.name[:2]): p for p in sorted(thumbs.glob('*.jpg'))}
qa_at = md.index('\n# ')
head_md, rest = md[:md.index('\n## 1.')], md[md.index('\n## 1.'):qa_at]
qa_md = md[qa_at:]
R = lambda t: markdown.markdown(t, extensions=['tables', 'sane_lists'])
parts = re.split(r'\n## (\d+)\. (.*)\n', rest)
h = '<section class="cover">' + R(head_md) + '</section>'
for i in range(1, len(parts), 3):
    n, title, body = int(parts[i]), parts[i+1], parts[i+2]
    img = shots.get(n); pic = f'<img class="shot" src="{img.as_uri()}" alt="">' if img else ''
    h += f'<section class="sl"><div class="top"><div class="head"><span class="no">{n:02d}</span><h2>{title}</h2></div>{pic}</div>{R(body)}</section>'
h += '<section class="sl">' + R(qa_md) + '</section>'
h = re.sub(r'<hr\s*/?>', '', h)
h = h.replace('<strong>[กด]</strong>', '<span class="click">กด</span>')
h = re.sub(r'<p><strong>(ถ้าถูกถาม:[^<]*)</strong>', r'<p class="q"><strong>\1</strong>', h)
h = re.sub(r'<p><strong>(พูด:)</strong>', r'<p class="say"><strong>\1</strong>', h)
h = h.replace('<p><strong>"', '<p class="q"><strong>"')
def F(name, w, fam): return f"@font-face{{font-family:{fam};font-weight:{w};src:url('{(FONTS/name).as_uri()}')}}"
fonts = ''.join(F(f'anuphan-{s}-{w}-normal.woff2', w, 'Anuphan') for s in ['thai', 'latin'] for w in [500, 600, 700]) + \
        ''.join(F(f'ibm-plex-sans-thai-{s}-{w}-normal.woff2', w, 'Plex') for s in ['thai', 'latin'] for w in [400, 500, 600, 700])
css = fonts + '''
@page{size:A4;margin:15mm 16mm}
*{box-sizing:border-box}body{margin:0;font:400 11.4pt/1.7 Plex,sans-serif;color:#13241B}
h1{font:700 22pt/1.3 Anuphan;color:#0F3B2A;margin:0 0 6px;border-bottom:3px solid #E7BE55;padding-bottom:8px}
h2{font:700 15pt/1.35 Anuphan;color:#0F3B2A;margin:0}
.sl{break-before:page}.top{break-inside:avoid}.cover{margin-bottom:10px}
.head{display:flex;align-items:center;gap:12px;margin:0 0 8px}
.no{font:700 13pt Anuphan;color:#fff;background:#0F3B2A;border-radius:8px;padding:2px 9px}
.shot{display:block;width:68%;margin:4px 0 10px;border-radius:8px;border:1px solid #cfd8d3}
p{margin:6px 0}ul,ol{margin:4px 0 8px;padding-left:22px}li{margin:2px 0}
.say{background:#eef5f1;border-left:4px solid #16774a;padding:8px 12px;border-radius:0 8px 8px 0}
.say strong{color:#16774a}
.q{margin-top:12px;color:#5b4710}.q strong{color:#8a6d1d}
.click{display:inline-block;font:700 9.5pt/1 Anuphan;background:#E7BE55;color:#13241B;border-radius:99px;padding:4px 10px;margin-right:4px;vertical-align:1px}
blockquote{margin:8px 0;padding:6px 12px;background:#fbf2ef;border-left:4px solid #b4412f;border-radius:0 8px 8px 0}
hr{border:0;margin:0}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:8px 0}th,td{border-bottom:1px solid #e1e7e3;padding:5px 7px;text-align:left;vertical-align:top}th{background:#eef2ef}
code{font:400 9.5pt ui-monospace,Menlo,monospace;background:#f1f4f2;padding:0 3px;border-radius:3px}
h1 + p, h1 + p + p{color:#33463c}
'''
doc = f'<!doctype html><html lang="th"><head><meta charset="utf-8"><title>บทพูด: เว็บไซต์ใหม่ โรงเรียนสาธิต มรภ.เพชรบุรี</title><style>{css}</style></head><body>{h}</body></html>'
# second h1 (Q&A) starts a new page
out.write_text(doc); print('ok')
