#!/usr/bin/env python3
"""Build the KruSlide sample library (static, no runtime fetch, strict CSP kept).

Run from anywhere:  python3 kruslide/site/_src/build_library.py

What it does
1. Scans kruslide/samples/**/sample.json (folders without sample.json, or without index.html and
   shots/1.webp, are skipped; nothing is ever shown as a placeholder).
2. Copies each sample's shots/N.webp and shots/N-sm.webp to site/img/lib/<slug>-N.webp and -N-sm.webp.
3. Copies the style D/E/F shots from samples/styles/shots/ (style-D-1.webp ... style-F-3.webp, plus -sm)
   to site/img/ when they exist.
4. Writes site/library.html (cards + filter chips with counts + search), reusing the header, footer,
   icon sprite and viewer from index.html (between <!--SHARED:...--> markers).
5. Rewrites the generated regions of site/index.html (<!--LIB:...--> markers): the hero desk, the
   "play a sample" strip, the sample count and the D/E/F style tiles.
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
SAMPLES = SITE.parent / 'samples'
IMG = SITE / 'img'
LIB = IMG / 'lib'

SUBJECTS = {  # key: (th, en, colour class)
    'math': ('คณิตศาสตร์', 'Maths', 'c-blue'), 'science': ('วิทยาศาสตร์', 'Science', 'c-mint'),
    'thai': ('ภาษาไทย', 'Thai', 'c-tom'), 'english': ('ภาษาอังกฤษ', 'English', 'c-lilac'),
    'social': ('สังคมศึกษา', 'Social studies', 'c-sun'), 'art': ('ศิลปะ', 'Art', 'c-pink'),
    'music': ('ดนตรี', 'Music', 'c-lilac'), 'tech': ('เทคโนโลยี', 'Technology', 'c-blue'),
    'health': ('สุขศึกษา', 'Health', 'c-mint'), 'early': ('ปฐมวัย', 'Early years', 'c-sun'),
}
LEVELS = {'อนุบาล': 'Kindergarten', 'ป.1-3': 'P1–3', 'ป.4-6': 'P4–6', 'ม.1-3': 'M1–3', 'ม.4-6': 'M4–6'}
MECH = {  # key: (icon, th, en)
    'tap': ('i-hand', 'แตะ', 'Tap'), 'drag': ('i-drag', 'ลาก', 'Drag'), 'slider': ('i-slider', 'แถบเลื่อน', 'Slider'),
    'type': ('i-type', 'พิมพ์', 'Type'), 'draw': ('i-pen', 'วาด', 'Draw'), 'write': ('i-hw', 'เขียนมือ', 'Write'),
    'sim': ('i-motion', 'จำลอง', 'Simulation'), 'sort': ('i-sort', 'จัดกลุ่ม', 'Sort'), 'reveal': ('i-reveal', 'เฉลยทีละขั้น', 'Step reveal'),
    'chart': ('i-bar', 'สร้างกราฟ', 'Build a chart'), 'bar': ('i-bar', 'กราฟแท่ง', 'Bar chart'), 'pie': ('i-pie', 'แผนภูมิวงกลม', 'Pie chart'),
    'line': ('i-line', 'กราฟเส้น', 'Line graph'), 'quiz': ('i-check', 'ตอบคำถาม', 'Quiz'), 'match': ('i-link', 'จับคู่', 'Match'),
    'listen': ('i-sound', 'ฟังเสียง', 'Listen'), 'audio': ('i-sound', 'ฟังเสียง', 'Listen'), 'map': ('i-map', 'แผนที่', 'Map'),
    'zoom': ('i-expand', 'ซูม', 'Zoom'), 'explore': ('i-spark', 'สำรวจ', 'Explore'), 'timeline': ('i-steps', 'เส้นเวลา', 'Timeline'),
    'build': ('i-sort', 'ประกอบ', 'Build'), 'code': ('i-code', 'เขียนโค้ด', 'Code'), 'play': ('i-sound', 'เล่นเสียง', 'Play'),
    'count': ('i-dots', 'นับ', 'Count'), 'video': ('i-video', 'วิดีโอ', 'Video'), 'game': ('i-spark', 'เกม', 'Game'),
}
REQ = ['slug', 'title_th', 'title_en', 'subject', 'level', 'style_th', 'style_en', 'mechanics', 'blurb_th', 'blurb_en', 'slides']
e = lambda s: html.escape(str(s), quote=True)


def mech(k):
    return MECH.get(k, ('i-spark', k, k))


def load():
    out, skipped = [], []
    for p in sorted(SAMPLES.rglob('sample.json')):
        d = p.parent
        if '_shared' in d.parts:
            continue
        try:
            s = json.loads(p.read_text(encoding='utf-8'))
        except Exception as ex:
            skipped.append(f'{d.relative_to(SAMPLES)}: bad JSON ({ex})'); continue
        miss = [k for k in REQ if k not in s]
        if miss:
            skipped.append(f'{d.relative_to(SAMPLES)}: missing {", ".join(miss)}'); continue
        if not (d / 'index.html').exists() or not (d / 'shots' / '1.webp').exists():
            skipped.append(f'{d.relative_to(SAMPLES)}: no index.html or shots/1.webp'); continue
        if not re.fullmatch(r'[a-z0-9-]+', s['slug']):
            skipped.append(f'{d.relative_to(SAMPLES)}: slug must be a-z, 0-9 and -'); continue
        s['rel'] = d.relative_to(SAMPLES).as_posix()
        s['href'] = f'../samples/{s["rel"]}/index.html'
        s['shots'] = []
        LIB.mkdir(parents=True, exist_ok=True)
        for n in (1, 2, 3):
            for suf in ('', '-sm'):
                src = d / 'shots' / f'{n}{suf}.webp'
                if src.exists():
                    dst = LIB / f'{s["slug"]}-{n}{suf}.webp'
                    if not dst.exists() or dst.read_bytes() != src.read_bytes():
                        shutil.copyfile(src, dst)
            if (LIB / f'{s["slug"]}-{n}.webp').exists():
                s['shots'].append(n)
        s['sm'] = f'img/lib/{s["slug"]}-1-sm.webp' if (LIB / f'{s["slug"]}-1-sm.webp').exists() else f'img/lib/{s["slug"]}-1.webp'
        out.append(s)
    return out, skipped


def style_shots():
    """Copy samples/styles/shots/style-[DEF]-N(-sm).webp into img/; return {letter: [n,...]}."""
    have = {}
    src = SAMPLES / 'styles' / 'shots'
    for L in 'DEF':
        for n in (1, 2, 3):
            for suf in ('', '-sm'):
                f = src / f'style-{L}-{n}{suf}.webp'
                if f.exists():
                    dst = IMG / f.name
                    if not dst.exists() or dst.read_bytes() != f.read_bytes():
                        shutil.copyfile(f, dst)
            if (IMG / f'style-{L}-{n}.webp').exists():
                have.setdefault(L, []).append(n)
    return have


def bi(th, en):
    return f'<span class="th">{e(th)}</span><span class="en">{e(en)}</span>'


def card(s, cls='lc'):
    th, en, col = SUBJECTS.get(s['subject'], (s['subject'], s['subject'], 'c-blue'))
    mechs = ''.join(f'<li title="{e(mech(m)[1])}"><svg class="ic" aria-hidden="true"><use href="#{mech(m)[0]}"/></svg><span class="sr">{bi(mech(m)[1], mech(m)[2])}</span></li>' for m in s['mechanics'][:6])
    q = ' '.join([s['title_th'], s['title_en'], s['style_th'], s['style_en'], s['blurb_th'], s['blurb_en'], th, en, s['level'], LEVELS.get(s['level'], '')]).lower()
    return (f'<article class="{cls} {col}" data-subject="{e(s["subject"])}" data-level="{e(s["level"])}" data-mech="{e(" ".join(s["mechanics"]))}" data-q="{e(q)}">'
            f'<button type="button" class="lc-open" data-view="{e(s["href"])}" data-vt-th="{e(s["title_th"])}" data-vt-en="{e(s["title_en"])}">'
            f'<span class="lc-art"><img src="{e(s["sm"])}" width="480" height="270" alt="" loading="lazy" decoding="async"><span class="lc-lvl">{bi(s["level"], LEVELS.get(s["level"], s["level"]))}</span><span class="gx-play"><svg class="ic" aria-hidden="true"><use href="#i-play"/></svg></span></span>'
            f'<span class="lc-sub">{bi(th, en)} · {bi(s["style_th"], s["style_en"])}</span>'
            f'<b class="lc-h">{bi(s["title_th"], s["title_en"])}</b>'
            f'<span class="lc-d">{bi(s["blurb_th"], s["blurb_en"])}</span>'
            f'</button><ul class="lc-m" aria-label="วิธีโต้ตอบ" data-en-aria-label="Interactions">{mechs}</ul>'
            f'<a class="gx-alt" href="{e(s["href"])}">{bi("เปิดเต็มจอ", "Full screen")}</a></article>')


# our own finished pieces without a sample.json; they join the library (and the strip) until they get one
OWN = [
    dict(slug='history', title_th='อยุธยา: ซูมแผนที่ เล่าเรื่องแบบหนัง', title_en='Ayutthaya, with a map zoom', subject='social', level='ม.1-3',
         style_th='ภาพยนตร์', style_en='Cinematic', mechanics=['zoom', 'map', 'tap'], href='../samples/history/index.html', sm='img/sample-history.webp',
         blurb_th='จากลูกโลก ซูมผ่านเอเชียและประเทศไทย ลงไปถึงเกาะอยุธยา', blurb_en='From the globe down to the island city of Ayutthaya.', need='history/index.html'),
    dict(slug='tools-demo', title_th='เครื่องมือครบ 10 แบบ', title_en='All 10 answer tools', subject='math', level='ม.1-3',
         style_th='โมเดิร์น คลีน', style_en='Modern clean', mechanics=['tap', 'type', 'drag', 'chart', 'pie', 'draw'], href='demo/index.html', sm='img/story-bars.webp',
         blurb_th='ลองแตะ พิมพ์ ลากกราฟ พิมพ์มุม และปากกาวาดรูปอัตโนมัติ', blurb_en='Tap, type, drag bars, type angles and try the tidy-up pen.', need=None),
    dict(slug='statistics', title_th='คณิต ม.1 Unit 4 สถิติ ทั้งหน่วย', title_en='Maths M1, Unit 4 Statistics', subject='math', level='ม.1-3',
         style_th='โมเดิร์น คลีน', style_en='Modern clean', mechanics=['tap', 'type', 'write', 'sort', 'chart', 'pie', 'draw', 'reveal'], href='../samples/statistics/index.html', sm='img/work-unit4.webp',
         blurb_th='67 สไลด์ตามหนังสือ ทุกเครื่องมือ พร้อมเฉลยทีละขั้น ใช้สอนจริงแล้ว', blurb_en='67 slides in book order, every tool, step-by-step answers; in use.', need='statistics/index.html', strip=False),
]


def with_own(samples):
    have = {s['slug'] for s in samples}
    extra = [dict(o, slides=0) for o in OWN if o['slug'] not in have and (not o['need'] or (SAMPLES / o['need']).exists())]
    return samples + extra


def strip(lib):
    """Seven varied samples (one per subject first, then one per style); the eighth tile is the library entry."""
    pool = [s for s in lib if s.get('strip', True)]
    pick, seen = [], set()
    for s in pool:
        if s['subject'] not in seen:
            pick.append(s); seen.add(s['subject'])
    styles = {s['style_en'] for s in pick}
    for s in pool:
        if s not in pick and s['style_en'] not in styles:
            pick.append(s); styles.add(s['style_en'])
    for s in pool:
        if s not in pick:
            pick.append(s)
    return pick[:7]


def lib_tile(n):
    return (f'<a class="lc lc-cta rv" href="library.html"><span class="lc-cta-art" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
            f'<span class="lc-cta-t"><b>{bi(f"ดูตัวอย่างทั้งหมด {n} แบบ", f"See all {n} samples")}</b>'
            f'<small>{bi("ทุกวิชา ทุกระดับชั้น กรองตามวิชา ระดับ และวิธีโต้ตอบ", "Every subject and level; filter by subject, level and interaction")}</small>'
            f'<span class="more">{bi("เปิดคลังตัวอย่าง", "Open the library")}<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></span></span></a>')


def desk(samples):
    """Hero desk: five real pieces in different styles. Library shots replace the fallbacks as they arrive."""
    items = []
    calc = next((s for s in samples if s['slug'] == 'calculus'), None)
    items.append(('img/lib/calculus-1.webp' if calc else 'img/sample-calculus-title.webp', 'แคลคูลัส ม.6', 'Calculus M6', 't-sun'))
    items.append(('img/ayutthaya-poster-sm.webp', 'อยุธยา · ภาพยนตร์', 'Ayutthaya · film', 't-tom'))
    others = [s for s in samples if s['slug'] != 'calculus' and s['subject'] != 'math']
    used = set()
    for s in others:
        if len(items) >= 5:
            break
        if s['subject'] in used:
            continue
        used.add(s['subject'])
        items.append((f'img/lib/{s["slug"]}-1.webp', s['title_th'], s['title_en'], 't-mint'))
    for f, th, en, t in [('img/style-C-sm.webp', 'สไตล์ C อินโฟกราฟิก', 'Style C infographic', 't-tom'),
                         ('img/theme-green-white-sm.webp', 'ธีมสีโรงเรียน', 'School colours', 't-mint'),
                         ('img/style-A-1-sm.webp', 'สไตล์ A · Unit 4', 'Style A · Unit 4', 't-sky')]:
        if len(items) >= 5:
            break
        items.append((f, th, en, t))
    out = []
    for k, (f, th, en, t) in enumerate(items, 1):
        out.append(f'<figure class="dk dk{k}"><img src="{e(f)}" width="800" height="450" alt="" decoding="async"><figcaption><i class="{t}"></i>{bi(th, en)}</figcaption></figure>')
    return '\n    '.join(out)


STYLE_DEF = {
    'D': ('กระจก', 'Glass', 'ระบบสุริยะบนกระจกหักเหแสงแบบจริง', 'The solar system on real refractive glass', 'styles/glass', 't-sky'),
    'E': ('ภาพเยอะ', 'Photo-rich', 'ป่าชายเลนไทย ภาพถ่ายหลายภาพต่อหน้า', 'The Thai mangrove, many photos per slide', 'styles/photo', 't-mint'),
    'F': ('สำรวจกลไก', 'Mechanism explorer', 'เครื่องยนต์สี่จังหวะ เฟือง และคาน ให้ลองกดสำรวจ', 'A four-stroke engine, gears and levers to explore', 'styles/mechanics', 't-lilac'),
}


def style_tile(L, have):
    th, en, dth, den, rel, t = STYLE_DEF[L]
    live = (SAMPLES / rel / 'index.html').exists()
    shots = have.get(L, [])
    if shots:
        art = f'<img src="img/style-{L}-1-sm.webp" width="800" height="450" alt="" loading="lazy" decoding="async">'
        if not (IMG / f'style-{L}-1-sm.webp').exists():
            art = f'<img src="img/style-{L}-1.webp" width="1600" height="900" alt="" loading="lazy" decoding="async">'
    else:
        art = f'<span class="plate {t}" aria-hidden="true"><b>{L}</b></span>'  # PLACEHOLDER until the shots arrive
    gal = ','.join(f'img/style-{L}-{n}.webp' for n in shots)
    view = f' data-view="../samples/{rel}/index.html"' if live else ''
    return (f'<button type="button" class="sty-shot" data-style="{L}"{view} data-gal-list="{e(gal)}" data-vt-th="สไตล์ {L} · {e(th)}" data-vt-en="Style {L} · {e(en)}" '
            f'aria-label="เปิดสไตล์ {L} {e(th)}" data-en-aria-label="Open style {L}, {e(en)}">{art}</button>'
            f'<div class="sty-body"><p class="sty-tag {t}">{L}</p><h3>{bi(th, en)} <span class="sty-new">{bi("ใหม่", "New")}</span></h3><p>{bi(dth, den)}</p></div>')


def region(text, name, content):
    pat = re.compile(r'(<!--LIB:%s-->)(.*?)(<!--/LIB:%s-->)' % (re.escape(name), re.escape(name)), re.S)
    if not pat.search(text):
        sys.exit(f'index.html has no <!--LIB:{name}--> region')
    return pat.sub(lambda m: m.group(1) + content + m.group(3), text)


def shared(text, name):
    m = re.search(r'<!--SHARED:%s-->(.*?)<!--/SHARED:%s-->' % (name, name), text, re.S)
    if not m:
        sys.exit(f'index.html has no <!--SHARED:{name}--> block')
    return m.group(1)


def library_page(index, samples):
    head = index.split('<body>')[0]
    head = re.sub(r'<title>.*?</title>', '<title>คลังตัวอย่าง · ครูสไลด์ KruSlide</title>', head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="คลังตัวอย่างสไลด์โต้ตอบของครูสไลด์ ทุกวิชา ทุกระดับชั้น เลือกดูตามวิชา ระดับ และวิธีโต้ตอบ แล้วลองเล่นได้ทันที">', head)
    head = head.replace('<link rel="preload" href="fonts/InterDisplay-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>\n', '')
    fix = lambda h: re.sub(r'href="#(?!top"|main")([a-z][\w-]*)"', r'href="index.html#\1"', h)
    count = lambda key, val: sum(1 for s in samples if (val in s['mechanics'] if key == 'mech' else s[key] == val))
    def chips(key, items):
        out = [f'<button type="button" data-f="{key}" data-v="" aria-pressed="true">{bi("ทั้งหมด", "All")} <small>{len(samples)}</small></button>']
        for v, th, en in items:
            n = count(key, v)
            if n:
                out.append(f'<button type="button" data-f="{key}" data-v="{e(v)}" aria-pressed="false">{bi(th, en)} <small>{n}</small></button>')
        return ''.join(out)
    subj = [(k, v[0], v[1]) for k, v in SUBJECTS.items()]
    lvl = [(k, k, v) for k, v in LEVELS.items()]
    used_m = sorted({m for s in samples for m in s['mechanics']}, key=lambda m: -count('mech', m))
    mch = [(m, mech(m)[1], mech(m)[2]) for m in used_m]
    cards = '\n   '.join(card(s) for s in samples)
    body = f'''<body class="libpage">
<!-- generated by _src/build_library.py from kruslide/samples/**/sample.json; do not edit by hand -->
{shared(index, 'SPRITE')}
<a class="skip" href="#main">{bi("ข้ามไปที่เนื้อหา", "Skip to content")}</a>
{fix(shared(index, 'HEADER'))}
<main id="main">
<section class="lib-hero">
 <div class="wrap">
  <p class="kicker">{bi("คลังตัวอย่าง", "Sample library")}</p>
  <h1>{bi("เลือกดูตัวอย่างทั้งหมด", "Browse every sample")} <span class="lib-n">{len(samples)}</span> {bi("แบบ", "")}</h1>
  <p class="sub">{bi("ทุกวิชา ทุกระดับชั้น แต่ละชิ้นมีสไตล์ของตัวเอง กดที่การ์ดเพื่อลองเล่นในหน้านี้", "Every subject and level, each in its own style. Click a card to play it right here.")}</p>
 </div>
</section>
<section class="lib" id="lib" aria-label="คลังตัวอย่าง" data-en-aria-label="Sample library">
 <div class="wrap">
  <div class="lib-bar">
   <label class="lib-search"><svg class="ic" aria-hidden="true"><use href="#i-search"/></svg><span class="sr">{bi("ค้นหา", "Search")}</span><input type="search" id="lib-q" placeholder="ค้นหา เช่น เศษส่วน วงจร กลอน" data-ph-th="ค้นหา เช่น เศษส่วน วงจร กลอน" data-ph-en="Search, e.g. fractions, circuit, poem" autocomplete="off"></label>
   <div class="lib-f" role="group" aria-label="วิชา" data-en-aria-label="Subject"><span class="lib-fl">{bi("วิชา", "Subject")}</span>{chips('subject', subj)}</div>
   <div class="lib-f" role="group" aria-label="ระดับชั้น" data-en-aria-label="Level"><span class="lib-fl">{bi("ระดับชั้น", "Level")}</span>{chips('level', lvl)}</div>
   <div class="lib-f" role="group" aria-label="วิธีโต้ตอบ" data-en-aria-label="Interaction"><span class="lib-fl">{bi("วิธีโต้ตอบ", "Interaction")}</span>{chips('mech', mch)}</div>
  </div>
  <p class="lib-count" id="lib-count" aria-live="polite"><b id="lib-shown">{len(samples)}</b> {bi("จาก", "of")} {len(samples)} {bi("ตัวอย่าง", "samples")}</p>
  <div class="lib-grid" id="lib-grid">
   {cards}
  </div>
  <p class="lib-empty" id="lib-empty" hidden>{bi("ไม่พบตัวอย่างที่ตรงกับตัวกรอง ลองล้างตัวกรองหรือค้นหาคำอื่น", "No sample matches. Clear a filter or try another word.")}</p>
 </div>
</section>
</main>
{fix(shared(index, 'FOOTER'))}
{shared(index, 'VIEWER')}
</body>
</html>
'''
    return head + body


def main():
    samples, skipped = load()
    lib = with_own(samples)
    have = style_shots()
    idx_p = SITE / 'index.html'
    index = idx_p.read_text(encoding='utf-8')
    index = region(index, 'DESK', '\n    ' + desk(samples) + '\n    ')
    pick = strip(lib)
    index = region(index, 'STRIP', '\n   ' + '\n   '.join(card(s, 'lc lc-home') for s in pick) + '\n   ' + lib_tile(len(lib)) + '\n   ')
    index = re.sub(r'(<!--LIB:COUNT-->)(.*?)(<!--/LIB:COUNT-->)', lambda m: m.group(1) + str(len(lib)) + m.group(3), index)
    for L in 'DEF':
        index = region(index, f'STYLE-{L}', style_tile(L, have))
    idx_p.write_text(index, encoding='utf-8')
    (SITE / 'library.html').write_text(library_page(index, lib), encoding='utf-8')
    print(f'library: {len(lib)} piece(s) ({len(samples)} with sample.json): ' + ', '.join(s['slug'] for s in lib))
    print('home strip: ' + ', '.join(s['slug'] for s in pick))
    for L in 'DEF':
        print(f'style {L}: ' + (f'shots {have[L]}' if L in have else 'NO SHOTS YET (placeholder plate shown)') + ('' if (SAMPLES / STYLE_DEF[L][4] / 'index.html').exists() else ', no live deck yet'))
    for s in skipped:
        print('skipped: ' + s)


if __name__ == '__main__':
    main()
