#!/usr/bin/env python3
"""Builds pitch/index.html: src.html + the type1-deck engine, then a Content-Security-Policy with the hash of every inline script.
   python3 build_deck.py   (run after editing src.html or deck.css)"""
import base64, hashlib, pathlib, re
HERE = pathlib.Path(__file__).parent
ENGINE = HERE.parents[1] / '.claude/skills/type1-deck/template/index.html'
t = ENGINE.read_text()
js = t[t.rindex('<script>'):t.rindex('</script>') + len('</script>')]
js = js.replace("var t0=performance.now()+380,dur=1300;", "var t0=performance.now()+(+el.getAttribute('data-delay')||380),dur=+el.getAttribute('data-dur')||1300,dec=+el.getAttribute('data-dec')||0;")
js = js.replace("el.textContent=Math.round(to*e).toLocaleString('en');", "el.textContent=dec?(to*e).toFixed(dec):Math.round(to*e).toLocaleString('en');")
doc = (HERE / 'src.html').read_text().replace('<!--ENGINE-->', js)
# another site framing the deck (clickjacking): hide it and try to break out
GUARD = "try{if(top!==self&&top.location.origin!==location.origin)throw 0;}catch(e){document.documentElement.style.display='none';try{top.location=location.href;}catch(f){}}"
doc = doc.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<!--CSP-->\n<meta name="referrer" content="strict-origin-when-cross-origin">\n<script>' + GUARD + '</script>', 1)
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(m.encode()).digest()).decode() + "'" for m in re.findall(r'<script>(.*?)</script>', doc, re.S)]
assert not re.search(r'\son[a-z]+\s*=|javascript:', doc, re.I), 'inline handler or javascript: URL in the deck'
csp = ("default-src 'none'; script-src 'self' " + ' '.join(hashes) + "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
       "media-src 'self'; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; "
       "require-trusted-types-for 'script'; trusted-types 'none'; upgrade-insecure-requests")
doc = doc.replace('<!--CSP-->', f'<meta http-equiv="Content-Security-Policy" content="{csp}">', 1)
(HERE / 'index.html').write_text(doc)
print('deck built,', len(hashes), 'inline scripts hashed')
