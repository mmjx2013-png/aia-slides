#!/usr/bin/env python3
"""Subset Shippori Mincho (OFL) to exactly the Japanese characters the site uses.
Scans site/*.html and site/assets/audio/*.json|vtt, writes site/assets/fonts/kanji.woff2 + kanji.css."""
import pathlib, re, io, sys
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/vendor/shippori"
text = ""
for p in list((ROOT / "site").glob("*.html")) + list((ROOT / "site/assets/audio").glob("*.json")) + list((ROOT / "site/assets/audio").glob("*.vtt")):
    text += p.read_text(encoding="utf8")
chars = sorted({c for c in text if ord(c) >= 0x2E80 and not (0xFE00 <= ord(c) <= 0xFE0F)})
if not chars:
    sys.exit("no CJK characters found")
need = set(map(ord, chars))
parts = []
for f in sorted(SRC.glob("*.woff2")):
    font = TTFont(f)
    have = need & set(font.getBestCmap().keys())
    if not have:
        continue
    opt = subset.Options(); opt.layout_features = ["*"]; opt.notdef_outline = True; opt.name_IDs = [1, 2]; opt.flavor = None
    s = subset.Subsetter(opt); s.populate(unicodes=have); s.subset(font)
    buf = io.BytesIO(); font.flavor = None; font.save(buf); buf.seek(0); parts.append(buf)
    need -= have
tmp = []
for i, b in enumerate(parts):
    p = ROOT / f"build/_k{i}.ttf"; p.parent.mkdir(exist_ok=True); p.write_bytes(b.getvalue()); tmp.append(str(p))
merged = Merger().merge(tmp) if len(tmp) > 1 else TTFont(tmp[0])
merged.flavor = "woff2"
out = ROOT / "site/assets/fonts/kanji.woff2"
merged.save(out)
for p in tmp:
    pathlib.Path(p).unlink()
rng = ",".join(f"U+{ord(c):04X}" for c in chars)
(ROOT / "site/assets/fonts/kanji.css").write_text(
    f'@font-face{{font-family:"Shippori Mincho";src:url("kanji.woff2") format("woff2");font-weight:400 600;font-style:normal;font-display:swap;unicode-range:{rng}}}\n')
print(f"{len(chars)} characters -> {out.stat().st_size} bytes; missing: {''.join(map(chr, sorted(need))) or 'none'}")
