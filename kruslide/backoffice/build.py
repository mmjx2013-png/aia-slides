#!/usr/bin/env python3
"""Build the KruSlide back office (the owner's private catalog and work-order console) into dist/.

    python3 kruslide/backoffice/build.py

What it does
- Scans kruslide/samples/**/sample.json. A sample is used only when it has index.html, sample.json (with
  title_th, subject, level) and shots/1..3.webp (or -sm). Unfinished folders are listed, never copied.
- Copies each sample, plus the Unit 4 deck, the showcase deck and the sales site, into dist/ at the same
  path they have under kruslide/ (samples/<dir>/, deck/, site/), so their relative links keep working.
  Only files that a page really references are copied. A file whose bytes are already in dist/ (shared
  fonts, the trailer) is not copied twice: the reference is pointed at the existing copy instead, except
  inside inline scripts that a page's CSP pins by hash.
- Reads the hand-written catalogs in data/ (styles, mechanics, products, prices, status) and keeps every
  code ever handed out in data/codes.json, so codes never move when new samples arrive.
- Writes dist/index.html (CSS, JS and data inlined) and reports dist's size and file count against the
  limits (60 MB, 250 files) of a claude.ai artifact.
"""
import datetime
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
KS = HERE.parent
ROOT = KS.parent
SAMPLES = KS / 'samples'
DATA = HERE / 'data'
SRC = HERE / 'src'
DIST = HERE / 'dist'
APP_FONTS = ROOT / 'teacher-slides' / 'unit4' / 'fonts'
LIMIT_BYTES, LIMIT_FILES = 60 * 2**20, 250
MAX_COPY = 30 * 2**20  # never ship a single file bigger than this (the 4K masters)

# Extra decks and sites bundled next to the samples (key -> entry page under kruslide/).
EXTRAS = {
    'unit4': {'page': 'samples/statistics/index.html', 'th': 'Unit 4 สถิติ ม.1', 'en': 'Unit 4 Statistics'},
    'deck': {'page': 'deck/index.html', 'th': 'สไลด์โชว์ผลงาน', 'en': 'Showcase deck'},
}
# The sales site (kruslide/site/) is shown as full-page screenshots instead: its sample library alone is
# 60+ files and grows with every sample, which would push dist past the artifact's 250-file limit.
# A reference to the left file is served by the right one (the 4K trailer is too big for the artifact).
SUBST = {KS / 'deck/media/ayutthaya-4k.mp4': KS / 'deck/media/ayutthaya-1080.mp4'}
# Folders under samples/ that are not samples themselves.
NOT_SAMPLES = {'_shared', 'statistics', 'styles'}

SUBJECTS = {
    'math': ('คณิตศาสตร์', 'Maths'), 'science': ('วิทยาศาสตร์', 'Science'), 'thai': ('ภาษาไทย', 'Thai'),
    'english': ('ภาษาอังกฤษ', 'English'), 'social': ('สังคมศึกษา', 'Social studies'), 'art': ('ศิลปะ', 'Art'),
    'music': ('ดนตรี', 'Music'), 'health': ('สุขศึกษา', 'Health'), 'tech': ('เทคโนโลยี', 'Technology'),
    'early': ('ปฐมวัย', 'Early years'),
}
LEVELS = ['อนุบาล', 'ป.1-3', 'ป.4-6', 'ม.1-3', 'ม.4-6']

TEXT_EXT = {'.html', '.htm', '.css', '.js', '.mjs', '.json'}
REF_EXT = r'webp|png|jpe?g|gif|svg|avif|mp4|webm|mp3|m4a|wav|ogg|vtt|woff2?|ttf|otf|js|mjs|css|json|html?'
REF_RE = re.compile(r'''(?<=["'(=\s,])((?:\.\.?/)*[A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:%s))(?=["')?#\s,])''' % REF_EXT)
SCRIPT_RE = re.compile(r'<script\b[^>]*>(.*?)</script>', re.S | re.I)
CSP_RE = re.compile(r'Content-Security-Policy"\s+content="([^"]*)"', re.I)

warnings = []


def warn(msg):
    warnings.append(msg)
    print('  ! ' + msg)


_sha_cache = {}


def sha(p):
    p = Path(p)
    if p not in _sha_cache:
        h = hashlib.sha256()
        with open(p, 'rb') as f:
            for chunk in iter(lambda: f.read(1 << 20), b''):
                h.update(chunk)
        _sha_cache[p] = h.hexdigest()
    return _sha_cache[p]


class Dist:
    """dist/ plus a registry of the binary files already in it (sha -> path), so nothing ships twice."""

    def __init__(self, root):
        self.root = root
        self.reg = {}

    def _path(self, rel):
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def copy(self, src, rel):
        shutil.copyfile(src, self._path(rel))
        self.reg.setdefault(sha(src), rel)
        return rel

    def write(self, rel, data):
        p = self._path(rel)
        if isinstance(data, str):
            p.write_text(data, encoding='utf-8')
        else:
            p.write_bytes(data)
        return rel

    def has(self, rel):
        return (self.root / rel).is_file()

    def place(self, src, fallback_dir='img'):
        """Put a binary file in dist once; return its dist path. Files under kruslide/ keep their path."""
        src = Path(src).resolve()
        h = sha(src)
        if h in self.reg:
            return self.reg[h]
        try:
            rel = src.relative_to(KS).as_posix()
            if rel.startswith('backoffice/'):
                raise ValueError
        except ValueError:
            rel = f'{fallback_dir}/{src.name}'
        return self.copy(src, rel)


def mirror(p):
    return Path(p).resolve().relative_to(KS).as_posix()


def inside(p, root):
    try:
        Path(p).resolve().relative_to(Path(root).resolve())
        return True
    except ValueError:
        return False


def bundle(dist, entry, root):
    """Copy the page `entry` and every file it references inside kruslide/ into dist at mirrored paths.
    Returns the set of other pages it links to that live outside `root` (they must be bundled on their own)."""
    entry, root = Path(entry).resolve(), Path(root).resolve()
    queue, seen, outside_pages = [entry], set(), set()
    while queue:
        f = queue.pop()
        if f in seen:
            continue
        seen.add(f)
        out_rel = mirror(f)
        text = f.read_text(encoding='utf-8')
        csp = CSP_RE.search(text) if f.suffix.lower() in ('.html', '.htm') else None
        pinned = bool(csp and re.search(r"script-src[^;]*'(sha\d+|nonce)-", csp.group(1)))
        guarded = [m.span(1) for m in SCRIPT_RE.finditer(text)] if pinned else []

        def is_guarded(pos):
            return any(a <= pos < b for a, b in guarded)

        refs = {}
        for m in REF_RE.finditer(text):
            refs.setdefault(m.group(1), []).append(is_guarded(m.start(1)))
        mapping = {}
        for ref, flags in refs.items():
            target = Path(os.path.normpath(f.parent / ref))
            if not inside(target, KS):
                continue
            target = SUBST.get(target, target)
            if not target.is_file():
                continue
            locked = any(flags)  # some occurrence sits in a hash-pinned script: the path must stay as written
            if target.suffix.lower() in TEXT_EXT:
                if inside(target, root):
                    queue.append(target)
                elif target.suffix.lower() in ('.html', '.htm'):
                    outside_pages.add(mirror(target))
                continue
            if target.stat().st_size > MAX_COPY:
                warn(f'{mirror(f)}: skipped {ref} ({target.stat().st_size >> 20} MB)')
                continue
            here = mirror(target)
            h = sha(target)
            if h in dist.reg and dist.reg[h] != here and not locked:
                new = os.path.relpath(dist.reg[h], os.path.dirname(out_rel)).replace(os.sep, '/')
                if new != ref:
                    mapping[ref] = new
                continue
            if not dist.has(here):
                dist.copy(target, here)
            orig = Path(os.path.normpath(f.parent / ref))
            if orig != target and not locked:  # substituted file: point the reference at it
                mapping[ref] = os.path.relpath(here, os.path.dirname(out_rel)).replace(os.sep, '/')
        if mapping:
            out, last = [], 0
            for m in REF_RE.finditer(text):
                if m.group(1) in mapping and not is_guarded(m.start(1)):
                    out.append(text[last:m.start(1)])
                    out.append(mapping[m.group(1)])
                    last = m.end(1)
            out.append(text[last:])
            text = ''.join(out)
        dist.write(out_rel, text)
    return outside_pages


def norm(s):
    return re.sub(r'[^a-z0-9ก-๙]+', ' ', (s or '').lower()).strip()


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def thai_date(iso):
    d = datetime.date.fromisoformat(iso)
    months = 'ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.'.split()
    return f'{d.day} {months[d.month - 1]} {d.year + 543}'


class Codes:
    """Every code ever given out, kept in data/codes.json so it never changes."""

    def __init__(self):
        self.path = DATA / 'codes.json'
        self.data = json.loads(self.path.read_text(encoding='utf-8')) if self.path.exists() else {}
        for k in ('samples', 'styles', 'mechanics'):
            self.data.setdefault(k, {})
        self.before = json.dumps(self.data, sort_keys=True)

    def take(self, kind, key, prefix, used, extra=None):
        book = self.data[kind]
        if key in book:
            return book[key]['code']
        taken = set(used) | {v['code'] for v in book.values()}
        n = 1
        while f'{prefix}-{n:02d}' in taken:
            n += 1
        book[key] = {'code': f'{prefix}-{n:02d}', **(extra or {})}
        return book[key]['code']

    def save(self):
        if json.dumps(self.data, sort_keys=True) != self.before:
            self.path.write_text(json.dumps(self.data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
            print('  codes.json updated')


def shot(d, k):
    for name in (f'{k}-sm.webp', f'{k}.webp'):
        if (d / 'shots' / name).is_file():
            return d / 'shots' / name
    return None


def make_strip(paths, out):
    """Stack the small shots into one image (one file per sample instead of three)."""
    frames = [Image.open(p).convert('RGB').resize((480, 270), Image.LANCZOS) for p in paths]
    strip = Image.new('RGB', (480, 270 * len(frames)), 'white')
    for i, im in enumerate(frames):
        strip.paste(im, (0, 270 * i))
    out.parent.mkdir(parents=True, exist_ok=True)
    strip.save(out, 'WEBP', quality=82, method=6)


def to_webp(dist, src, name, width, crop=None, quality=80):
    src = Path(src)
    rel = f'img/{name}.webp'
    im = Image.open(src)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if crop and im.height > crop:
        im = im.crop((0, 0, im.width, crop))
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    p = dist.root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p, 'WEBP', quality=quality, method=6)
    return rel


def discover(codes):
    found, incomplete = [], []
    for sj in sorted(SAMPLES.rglob('sample.json')):
        d = sj.parent
        rel = d.relative_to(SAMPLES).as_posix()
        if rel.split('/')[0] in ('_shared',):
            continue
        try:
            meta = json.loads(sj.read_text(encoding='utf-8'))
        except Exception as e:  # half-written by an agent
            incomplete.append({'dir': rel, 'why': f'sample.json: {e.__class__.__name__}'})
            continue
        miss = [] if (d / 'index.html').is_file() else ['index.html']
        miss += [f'shots/{k}.webp' for k in (1, 2, 3) if not shot(d, k)]
        miss += [k for k in ('title_th', 'subject', 'level') if not meta.get(k)]
        if miss:
            incomplete.append({'dir': rel, 'why': ', '.join(miss)})
            continue
        found.append((sj.stat().st_mtime, rel, d, meta))
    found.sort(key=lambda t: (t[0], t[1]))
    samples = []
    for mtime, rel, d, meta in found:
        added = datetime.date.fromtimestamp(mtime).isoformat()
        code = codes.take('samples', rel, 'S', [], {'added': added})
        added = codes.data['samples'][rel].get('added', added)
        samples.append({
            'code': code, 'slug': meta.get('slug') or d.name, 'dir': rel, 'src': d,
            'th': meta.get('title_th', ''), 'en': meta.get('title_en') or meta.get('title_th', ''),
            'subject': meta.get('subject', ''), 'level': meta.get('level', ''),
            'style_th': meta.get('style_th', ''), 'style_en': meta.get('style_en', ''),
            'tags': [t for t in meta.get('mechanics', []) if isinstance(t, str)],
            'blurb_th': meta.get('blurb_th', ''), 'blurb_en': meta.get('blurb_en', ''),
            'slides': meta.get('slides') or 0, 'added': added,
            'href': f'samples/{rel}/index.html', 'strip': f'samples/{rel}/shots/strip.webp',
        })
    # folders that look like samples in progress (sources but no complete sample)
    done = {s['dir'] for s in samples} | {i['dir'] for i in incomplete}
    for d in sorted(list(SAMPLES.glob('*/')) + list(SAMPLES.glob('styles/*/'))):
        rel = d.relative_to(SAMPLES).as_posix()
        if not d.is_dir() or rel in NOT_SAMPLES or rel in done or any(rel.startswith(x + '/') for x in done):
            continue
        if (d / 'build.py').exists() or (d / 'src').is_dir() or (d / 'index.html').exists():
            incomplete.append({'dir': rel, 'why': 'no sample.json yet'})
    return samples, incomplete


def main():
    t0 = datetime.datetime.now()
    print('KruSlide back office build')
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    dist = Dist(DIST)
    codes = Codes()

    # 1. shared fonts first, so every later copy of the same font points here
    for f in sorted((SAMPLES / '_shared' / 'fonts').glob('*')):
        if f.is_file():
            dist.copy(f, mirror(f))

    # 2. samples
    samples, incomplete = discover(codes)
    print(f'  samples: {len(samples)} complete, {len(incomplete)} unfinished')
    linked = set()
    for s in samples:
        linked |= bundle(dist, s['src'] / 'index.html', s['src'])
        make_strip([shot(s['src'], k) for k in (1, 2, 3)], DIST / s['strip'])

    # 3. extra decks and sites
    extras = {}
    for key, ex in EXTRAS.items():
        page = KS / ex['page']
        if page.is_file():
            linked |= bundle(dist, page, page.parent)
            extras[key] = {'href': ex['page'], 'th': ex['th'], 'en': ex['en']}
        else:
            warn(f'extra "{key}" missing: {ex["page"]}')
    for page in sorted(linked):
        if not dist.has(page):
            print(f'  note: {page} is linked from a bundled page but is not in dist (that page shows its own fallback)')

    by_key = {}
    for s in samples:
        by_key[s['slug']] = by_key[s['dir']] = s

    # 4. styles
    st_data = load('styles.json')
    sales = st_data['sales']
    notes = st_data.get('notes', {})
    styles = []
    for st in sales:
        st = dict(st)
        st['kind'] = 'sales'
        st['used'] = []
        st['opens'] = [{'x': o['extra']} for o in st.pop('open', []) if o.get('extra') in extras]
        styles.append(st)
    used_codes = [s['code'] for s in styles]
    sample_styles = {}
    for s in samples:
        key = norm(s['style_en'] or s['style_th'])
        hit = next((st for st in styles if any(s['dir'] == d or s['dir'].startswith(d + '/') for d in st.get('dirs', []))), None)
        hit = hit or next((st for st in styles if key and key in [norm(a) for a in st.get('aliases', [])]), None)
        if not hit and key in sample_styles:
            hit = sample_styles[key]
        if not hit:
            code = codes.take('styles', key, 'ST', used_codes)
            note = notes.get(key, {})
            hit = sample_styles[key] = {
                'code': code, 'kind': 'sample', 'th': s['style_th'] or s['style_en'], 'en': s['style_en'] or s['style_th'],
                'desc_th': note.get('th', ''), 'desc_en': note.get('en', ''), 'used': [], 'opens': [], 'status': 'live',
            }
        hit['used'].append(s['code'])
        s['style'] = hit['code']
    styles += sorted(sample_styles.values(), key=lambda st: int(st['code'].split('-')[1]))
    for st in styles:
        first = by_key.get(next((s['dir'] for s in samples if s['code'] in st['used']), ''), None)
        if st['kind'] == 'sample' or (first and st.get('dirs')):
            st['img'] = [{'strip': first['strip']}] if first else []
            if first and st.get('dirs'):
                st['status'] = 'live'
        else:
            imgs = [KS.parent / p for p in st.get('preview', [])]
            imgs = [p for p in imgs if p.is_file()]
            if st.get('preview_mode') != 'all':
                imgs = imgs[:1]
            st['img'] = [{'src': dist.place(p)} for p in imgs]
        for k in ('preview', 'preview_mode', 'dirs', 'aliases'):
            st.pop(k, None)

    # 5. mechanics
    mech_data = load('mechanics.json')
    mechanics = []
    tag_code = {}
    for m in mech_data['items']:
        for t in m.get('tags', []):
            tag_code.setdefault(t, m['code'])
    all_tags = sorted({t for s in samples for t in s['tags']})
    for t in all_tags:  # a tag nobody described yet gets its own code
        if t not in tag_code:
            code = codes.take('mechanics', t, 'M', [m['code'] for m in mech_data['items']])
            mech_data['items'].append({'code': code, 'group': 'basic', 'th': t, 'en': t, 'desc_th': '', 'desc_en': '', 'tags': [t]})
            tag_code[t] = code
    for m in mech_data['items']:
        links, coming = [], []
        for ref in m.get('see', []):
            n = ref.get('n')
            if 's' in ref:
                s = by_key.get(ref['s'])
                if s:
                    links.append({'s': s['code'], 'n': n})
                else:
                    coming.append(ref['s'])
            elif 'x' in ref and ref['x'] in extras:
                links.append({'x': ref['x'], 'n': n})
            elif 'p' in ref:
                links.append({'p': ref['p']})
            elif 'url' in ref:
                links.append({'url': ref['url'], 'th': ref.get('th', ''), 'en': ref.get('en', '')})
        have = {l.get('s') for l in links}
        for s in samples:
            if s['code'] not in have and set(m.get('tags', [])) & set(s['tags']):
                links.append({'s': s['code']})
                have.add(s['code'])
        mechanics.append({k: m.get(k, '') for k in ('code', 'group', 'th', 'en', 'desc_th', 'desc_en')} |
                         {'tags': m.get('tags', []), 'links': links, 'coming': sorted(set(coming))})
    for s in samples:
        s['mech'] = [tag_code[t] for t in s['tags'] if t in tag_code]
        s['mech_all'] = [m['code'] for m in mechanics if any(l.get('s') == s['code'] for l in m['links'])]

    # 6. products
    prod_data = load('products.json')
    products = []
    for p in prod_data['items']:
        p = dict(p)
        if p.get('video'):
            p['video'] = dist.place(KS.parent / p['video'])
            p['poster'] = dist.place(KS.parent / p['poster'])
        if p.get('preview'):
            src = KS.parent / p['preview']
            p['preview'] = dist.place(src) if src.is_file() else ''
        if p.get('open') and p['open'] not in extras:
            p.pop('open')
        if p.get('gallery'):
            gal = []
            for i, g in enumerate(p['gallery']):
                src = KS.parent / g['src']
                if not src.is_file():
                    warn(f'{p["code"]}: missing {g["src"]}')
                    continue
                g = dict(g)
                crop = g.pop('crop', None)
                if src.suffix in ('.webp', '.svg') and not crop:  # already web-ready: ship as is
                    g['src'] = dist.place(src)
                else:
                    g['src'] = to_webp(dist, src, f'{p["code"].lower()}-{i + 1}', 1280, crop)
                gal.append(g)
            p['gallery'] = gal
        products.append(p)

    # 7. status (owner-maintained) + unfinished folders found by this build
    status = load('status.json')
    for it in status['items']:
        if it.get('image'):
            src = KS.parent / it['image']
            it['image'] = to_webp(dist, src, 'status-' + norm(it['en'])[:24].replace(' ', '-'), 1600, quality=78) if src.is_file() else ''

    prices = load('prices.json')

    # 8. app shell: fonts from teacher-slides/unit4/fonts (same bytes as the shared copy, so nothing new ships)
    faces = []
    for fname, fam, weight, rng in [
        ('Inter-Regular.woff2', 'Inter', 400, ''), ('Inter-Medium.woff2', 'Inter', 500, ''),
        ('Inter-SemiBold.woff2', 'Inter', 600, ''), ('Inter-Bold.woff2', 'Inter', 700, ''),
        ('Anuphan-Thai-400.woff2', 'Anuphan', 400, 'U+0E00-0E7F'), ('Anuphan-Thai-600.woff2', 'Anuphan', 600, 'U+0E00-0E7F'),
        ('Anuphan-Thai-700.woff2', 'Anuphan', 700, 'U+0E00-0E7F'),
    ]:
        rel = dist.place(APP_FONTS / fname, 'fonts')
        faces.append(f"@font-face{{font-family:{fam};src:url({rel}) format('woff2');font-weight:{weight};font-display:swap"
                     + (f';unicode-range:{rng}' if rng else '') + '}')
    icon = (KS / 'brand' / 'kruslide-icon.svg').read_text(encoding='utf-8').strip()

    today = datetime.date.today().isoformat()
    data = {
        'meta': {'built': t0.strftime('%Y-%m-%d %H:%M'), 'built_th': thai_date(today) + t0.strftime(' %H:%M')},
        'subjects': {k: {'th': v[0], 'en': v[1]} for k, v in SUBJECTS.items()},
        'levels': LEVELS,
        'extras': extras,
        'samples': [{k: v for k, v in s.items() if k != 'src'} | {'added_th': thai_date(s['added'])} for s in samples],
        'incomplete': incomplete,
        'styles': styles,
        'mech_groups': mech_data['groups'],
        'mechanics': mechanics,
        'tag_code': tag_code,
        'product_tabs': prod_data['tabs'],
        'products': products,
        'prices': prices,
        'status': status,
    }
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    shell = (SRC / 'shell.html').read_text(encoding='utf-8')
    html = (shell.replace('/*FONTS*/', '\n'.join(faces))
            .replace('/*CSS*/', (SRC / 'app.css').read_text(encoding='utf-8'))
            .replace('<!--ICON-->', icon)
            .replace('/*DATA*/', blob)
            .replace('/*JS*/', (SRC / 'app.js').read_text(encoding='utf-8'))
            .replace('{{ICON_URI}}', 'data:image/svg+xml,' + icon.replace('"', "'").replace('#', '%23').replace('<', '%3C').replace('>', '%3E')))
    dist.write('index.html', html)
    codes.save()

    # 9. report
    files = [p for p in DIST.rglob('*') if p.is_file()]
    total = sum(p.stat().st_size for p in files)
    print(f'  styles {len(styles)} · mechanics {len(mechanics)} · products {len(products)} · extras {", ".join(extras)}')
    print(f'  dist: {len(files)} files, {total / 2**20:.1f} MB  (limits {LIMIT_FILES} files, {LIMIT_BYTES >> 20} MB)')
    if len(files) > LIMIT_FILES or total > LIMIT_BYTES:
        by_top = {}
        for p in files:
            parts = p.relative_to(DIST).parts
            top = '/'.join(parts[:2]) if parts[0] == 'samples' and len(parts) > 2 else parts[0]
            n, b = by_top.get(top, (0, 0))
            by_top[top] = (n + 1, b + p.stat().st_size)
        warn('dist is over the artifact limits. Biggest parts (files, MB):')
        for top, (n, b) in sorted(by_top.items(), key=lambda kv: -kv[1][1])[:12]:
            print(f'      {top:32s} {n:4d} {b / 2**20:7.1f}')
        print('    Proposal: publish the heaviest bundles (e.g. samples/history, site/, the trailer) as a second\n'
              '    artifact and link to it, or drop the 1080p trailer from dist and play it from the sales site.')
    if incomplete:
        print('  unfinished (not copied): ' + ', '.join(f"{i['dir']} ({i['why']})" for i in incomplete))
    print(f'  done in {(datetime.datetime.now() - t0).total_seconds():.1f} s -> {DIST / "index.html"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
