#!/usr/bin/env python3
"""Contact sheets from qa.cjs screens: python3 sheet.py [qa-out] -> qa-out/sheet-1.png, sheet-2.png ... (6 screens each, 2 columns)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

d = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / 'qa-out')
shots = sorted(p for p in d.glob('s*-b*.png'))
for old in d.glob('sheet-*.png'):
    old.unlink()
W, H, g, per = 960, 540, 14, 6
for n in range(0, len(shots), per):
    group = shots[n:n + per]
    rows = (len(group) + 1) // 2
    sheet = Image.new('RGB', (2 * W + 3 * g, rows * (H + 34) + g), (25, 28, 36))
    dr = ImageDraw.Draw(sheet)
    for k, p in enumerate(group):
        x, y = g + (k % 2) * (W + g), g + (k // 2) * (H + 34)
        dr.text((x, y), p.stem, fill=(220, 225, 235))
        sheet.paste(Image.open(p).convert('RGB').resize((W, H)), (x, y + 18))
    sheet.save(d / f'sheet-{n // per + 1}.png')
print(f'{len(shots)} screens -> {(len(shots) + per - 1) // per} sheet(s) in {d}')
