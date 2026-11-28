#!/usr/bin/env python3
"""Download the Wikimedia Commons originals listed in images.json into img/, record author and licence, write credits.md.
Only public domain, CC0, CC BY and CC BY-SA files are accepted; anything else stops the script.

Wikimedia now answers 429 ("use thumbnail images in sizes listed on https://w.wiki/GHai") to bulk downloads of
originals from cloud IPs. So each file is tried as the original once; on 429 the 3840 px standard rendition is
taken instead (same image, resized by Wikimedia). meta.json records which one was used ("got").
Re-run with --originals [--only id1,id2] later to try to upgrade the 3840 px files to the originals."""
import html, json, os, re, sys, time, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, 'img')
UA = 'KruSlideTrailerBuilder/1.0 (educational video sample; python-urllib)'
API = 'https://commons.wikimedia.org/w/api.php'
OK = re.compile(r'^(public domain|pd\b|cc0|cc by(-sa)? [0-9.]+|cc by(-sa)?$)', re.I)

UPGRADE = '--originals' in sys.argv
ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None

def get(url, retry=True):
    for attempt in range(10):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and retry:
                wait = int(e.headers.get('retry-after', '20') or 20) + 3
                print(f'  {e.code}, waiting {wait}s', file=sys.stderr); time.sleep(wait); continue
            raise
    raise RuntimeError('gave up: ' + url)

def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s or ''); s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()

def main():
    cfg = json.load(open(os.path.join(HERE, 'images.json'), encoding='utf-8'))['images']
    os.makedirs(IMG, exist_ok=True)
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'formatversion': '2', 'prop': 'imageinfo',
                                'iiprop': 'url|size|extmetadata', 'titles': '|'.join(c['title'] for c in cfg)})
    pages = {p['title']: p for p in json.loads(get(API + '?' + q))['query']['pages']}
    mp = os.path.join(IMG, 'meta.json')
    old_meta = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else []
    meta = []
    for c in cfg:
        p = pages[c['title']]; ii = p['imageinfo'][0]; m = ii['extmetadata']
        v = lambda k: (m.get(k) or {}).get('value', '')
        lic = clean(v('LicenseShortName'))
        if not OK.match(lic):
            sys.exit(f'REJECTED licence {lic!r} for {c["title"]}')
        url = ii['url'].split('?')[0]  # Commons now appends utm_* tracking parameters
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
        path = os.path.join(IMG, c['id'] + ext)
        prev = {m['id']: m for m in old_meta}.get(c['id'], {})
        got = prev.get('got', '')
        have = os.path.exists(path) and os.path.getsize(path) > 10000
        if not have or (UPGRADE and got != 'original' and (ONLY is None or c['id'] in ONLY)):
            print('download', c['id'], ii['width'], 'x', ii['height'], f"{ii['size']/1e6:.1f} MB")
            data, got = None, ''
            try:
                data = get(url, retry=False); got = "original"
            except urllib.error.HTTPError as e:
                if e.code != 429: raise
                if have: print('  original still rate-limited, keeping', prev.get('got')); got = prev.get('got')
                else:
                    w = min(3840, ii['width'])
                    thumb = url.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/', 1) + f'/{w}px-' + os.path.basename(urllib.parse.urlparse(url).path)
                    if ext in ('.tif', '.tiff'): thumb += '.jpg'; path = os.path.splitext(path)[0] + '.jpg'
                    print('  original rate-limited (429), using the', w, 'px rendition'); data = get(thumb); got = f'{w}px rendition'
            if data:
                tmp = path + '.part'; open(tmp, 'wb').write(data); os.replace(tmp, path)
            time.sleep(1)
        meta.append(dict(id=c['id'], file=os.path.basename(path), title=c['title'], subject=c['subject'],
                         width=ii['width'], height=ii['height'], author=clean(v('Artist')) or clean(v('Credit')),
                         source=clean(v('Credit')), got=got, licence=lic, licence_url=clean(v('LicenseUrl')),
                         date=clean(v('DateTimeOriginal')), page=ii['descriptionurl']))
    json.dump(meta, open(os.path.join(IMG, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    write_credits(meta)

def write_credits(meta):
    L = ['# Image credits: Ayutthaya trailer', '',
         'Every picture in the trailer is a photograph or historical artwork from Wikimedia Commons.',
         'All were checked for a licence that allows reuse (public domain, CC0, CC BY or CC BY-SA).',
         'The trailer crops, moves, colour-grades and adds grain to these images; for CC BY-SA files those changes',
         'are shared under the same licence. Licence links are given with each file.', '',
         '| # | File in img/ | Subject | Author | Licence | Source page |', '|---|---|---|---|---|---|']
    for i, m in enumerate(meta, 1):
        lic = f"[{m['licence']}]({m['licence_url']})" if m['licence_url'] else m['licence']
        author = m['author'].replace('|', '/')[:160]
        L.append(f"| {i} | `{m['file']}` ({m['width']}×{m['height']}) | {m['subject']} | {author} | {lic} | [{m['title'][5:]}]({m['page']}) |")
    L += ['', 'Narration: AI voice (Venice API text-to-speech). Music and sound: original, synthesised for this trailer.',
          'Fonts: Anuphan (SIL Open Font License) and Inter (SIL Open Font License).', '', '© KruSlide']
    open(os.path.join(HERE, 'credits.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('wrote credits.md')

if __name__ == '__main__':
    main()
