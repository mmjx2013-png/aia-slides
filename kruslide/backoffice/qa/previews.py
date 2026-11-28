#!/usr/bin/env python3
"""Turn the PNGs from previews.cjs into the small WebP previews in data/img/.
    python3 kruslide/backoffice/qa/previews.py <dir with the PNGs>"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
out = Path(__file__).resolve().parent.parent / 'data' / 'img'
out.mkdir(parents=True, exist_ok=True)
for name, dest, width, q in [('deck.png', 'deck.webp', 960, 82), ('site-hero.png', 'site.webp', 960, 82),
                             ('site-desktop.png', 'site-desktop.webp', 1200, 72), ('site-mobile.png', 'site-mobile.webp', 480, 72),
                             ('style-D.png', 'style-D.webp', 960, 80), ('style-E.png', 'style-E.webp', 960, 80), ('style-F.png', 'style-F.webp', 960, 80)]:
    p = src / name
    if not p.exists():
        print('missing', p)
        continue
    im = Image.open(p).convert('RGB')
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(out / dest, 'WEBP', quality=q, method=6)
    print(dest, im.size, (out / dest).stat().st_size // 1024, 'KB')
