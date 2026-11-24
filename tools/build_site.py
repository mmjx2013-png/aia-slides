#!/usr/bin/env python3
"""Build the exhibition from content/rooms/*.json.

One source of truth drives everything:
  site/index.html          the page (rooms, labels, wall works, cards, colophon)
  audio/script.json        the narration script (read by tools/narrate.py)
  kimono-sources.md        the claims ledger (one row per claim, verbatim quotes)
It also checks: every citation token has a claim row, every <q> quote is verbatim in a
claim, quotes are 25 words or fewer, text limits, label windows.
Usage: tools/build_site.py [--strict]
"""
import json, re, sys, html, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
ROOMS = pathlib.Path(next((a.split("=",1)[1] for a in sys.argv if a.startswith("--rooms=")), ROOT / "content/rooms"))
STRICT = "--strict" in sys.argv

SOURCES = json.loads((ROOT / "content/sources.json").read_text())
RESPELL = json.loads((ROOT / "content/respell.json").read_text())
PHOTOS = json.loads((ROOT / "site/assets/photos/photos.json").read_text()) if (ROOT / "site/assets/photos/photos.json").exists() else {}
WISH = {o["objectID"]: o for o in json.loads((ROOT / "assets/photo-wishlist.json").read_text())["objects"]}
CREDITS = {}
cp = ROOT / "assets/photos/credits.json"
if cp.exists():
    try:
        raw = json.loads(cp.read_text())
        items = raw.get("photos", raw.get("items", raw)) if isinstance(raw, dict) else raw
        if isinstance(items, dict):
            items = [dict(v, file=k) for k, v in items.items()]
        for it in items:
            m = re.search(r"(\d{3,})", str(it.get("objectID") or it.get("file") or ""))
            if m:
                CREDITS[int(m.group(1))] = it
    except Exception as e:  # never let a malformed credits file break the build
        print("credits.json unreadable:", e)

problems, warnings = [], []


def err(msg):
    problems.append(msg)


def warn(msg):
    warnings.append(msg)


def esc(s):
    return html.escape(str(s), quote=True)


def visible(s):
    s = re.sub(r"\{[^{}:]+:[^{}]+\}", "", s)
    return re.sub(r"<[^>]+>", "", s).strip()


def src_label(key):
    key = str(key)
    return SOURCES["map"].get(key, key)


def cites(s, room):
    """{4:p.10} -> linked citation; returns html."""
    def rep(m):
        key, page = m.group(1).strip(), m.group(2).strip()
        n = src_label(key)
        if str(n) not in SOURCES["list"]:
            err(f"{room}: citation to unknown source {key}")
        room_cites.setdefault(room, set()).add((str(n), norm_page(page)))
        return f' <a class="cite" href="#src-{n}">[{n}]&nbsp;{esc(page)}</a>'
    return re.sub(r"\s?\{([^{}:]+):([^{}]+)\}", rep, s)


def norm_page(p):
    return re.sub(r"[^0-9a-z]", "", p.lower().replace("pp.", "p.").replace("–", "-"))


room_cites = {}


def rich(s, room):
    """allow <q>, <i>, <em>, <span lang="ja">; escape nothing else that is not markup we know."""
    s = cites(s, room)
    return s


def q_texts(s):
    return [re.sub(r"\s+", " ", m).strip() for m in re.findall(r"<q>(.*?)</q>", s, flags=re.S)]


def load_rooms():
    rooms = []
    for p in sorted(ROOMS.glob("*.json")):
        try:
            r = json.loads(p.read_text())
        except Exception as e:
            err(f"{p.name}: invalid JSON: {e}")
            continue
        r["_file"] = p.name
        rooms.append(r)
    rooms.sort(key=lambda r: r.get("n", 99))
    return rooms


def check_room(r):
    rid = r["id"]
    lim = [("title", 22), ("heading", 34), ("intro", 150)]
    for k, n in lim:
        if k in r and len(visible(r[k])) > n:
            err(f"{rid}: {k} is {len(visible(r[k]))} chars (max {n})")
    claims = r.get("claims", [])
    for c in claims:
        words = len(re.findall(r"\S+", c.get("quote", "")))
        jp = bool(re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", c.get("quote", "")))
        if not jp and words > 25:
            err(f"{rid}: quote over 25 words: {c['quote'][:60]}...")
        if jp and len(c.get("quote", "")) > 70:
            warn(f"{rid}: long Japanese quote ({len(c['quote'])} chars)")
    allq = " ".join(re.sub(r"\s+", " ", c.get("quote", "")) for c in claims)
    norm = lambda s: re.sub(r"[‘’'“”\"]", "'", s).replace("…", "...")
    texts = []
    for L in r.get("labels", []):
        texts += L.get("body", [])
        if len(visible(L.get("title", ""))) > 34:
            err(f"{rid}: label title too long: {L['title']}")
        if len(visible(L.get("kicker", ""))) > 18:
            err(f"{rid}: label kicker too long: {L['kicker']}")
        if sum(len(visible(b)) for b in L.get("body", [])) > 250:
            err(f"{rid}: label body too long ({L.get('title')})")
        if L.get("to", 0) - L.get("from", 0) < 25:
            warn(f"{rid}: label '{L.get('title')}' visible for fewer than 25 frames")
    for P in r.get("photos", []):
        texts.append(P.get("label", {}).get("insight", ""))
        if len(visible(P.get("label", {}).get("insight", ""))) > 175:
            err(f"{rid}: photo insight too long ({P.get('objectID')})")
    for C in r.get("cards", []):
        texts += C.get("body", [])
        for row in C.get("rows", []):
            texts += [str(x) for x in row]
    texts += [r.get("intro", ""), (r.get("line") or {}).get("text", "")] + r.get("rules", [])
    for t in texts:
        for q in q_texts(t):
            if norm(q) not in norm(allq):
                err(f"{rid}: quoted words not found verbatim in any claim: <q>{q}</q>")
    labs = sorted(r.get("labels", []), key=lambda L: L["from"])
    for a, b in zip(labs, labs[1:]):
        if b["from"] <= a["to"]:
            err(f"{rid}: label windows overlap: '{a['title']}' and '{b['title']}'")
    # every citation token must have a claim row with the same source and page
    have = {(str(src_label(c["src"])), norm_page(str(c["page"]))) for c in claims}
    return have


ICON_PLAY = '<svg class="i-play" viewBox="0 0 12 12"><path d="M2.5 1.2v9.6L11 6z" fill="currentColor"/></svg>'
ICON_PAUSE = '<svg class="i-pause" viewBox="0 0 12 12"><path d="M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z" fill="currentColor"/></svg>'


def guide_button(rid, label, extra=""):
    return (f'<button class="guide glass glass--pill{extra}" data-audio="{rid}" aria-pressed="false">'
            f'<span class="guide__disc" aria-hidden="true">{ICON_PLAY}{ICON_PAUSE}</span>'
            f'<span class="guide__meta"><b>{esc(label)}</b><span data-dur></span></span></button>')


def photo_entry(oid):
    key = f"met-{oid}"
    return key, PHOTOS.get(key)


def head_html(r, eyebrow):
    out = [f'<div class="scrub__head"><p class="eyebrow">{esc(eyebrow)}</p><h2>{rich(r["heading"], r["id"])}</h2>']
    if r.get("intro"):
        out.append(f'<p>{rich(r["intro"], r["id"])}</p>')
    out.append("</div>")
    return "".join(out)


def card_html(C, rid, idx):
    kind = C.get("kind", "text")
    parts = [f'<aside class="card glass" data-card="{idx}"' + (f' data-pool="{C["pool"]}"' if "pool" in C else "") + ">",
             f'<h3>{rich(C["title"], rid)}</h3>']
    for b in C.get("body", []):
        parts.append(f"<p>{rich(b, rid)}</p>")
    if kind in ("table", "calendar") and C.get("rows"):
        parts.append('<table class="card__table">')
        if C.get("head"):
            parts.append("<thead><tr>" + "".join(f'<th scope="col">{rich(h, rid)}</th>' for h in C["head"]) + "</tr></thead>")
        parts.append("<tbody>")
        for row in C["rows"]:
            parts.append("<tr>" + "".join((f'<th scope="row">{rich(x, rid)}</th>' if i == 0 else f"<td>{rich(str(x), rid)}</td>") for i, x in enumerate(row)) + "</tr>")
        parts.append("</tbody></table>")
    parts.append("</aside>")
    return "".join(parts)


def main():
    rooms = load_rooms()
    if not rooms:
        sys.exit("no rooms")
    claims_all = []
    sections, works, script_chapters = [], [], []
    stop_pool = {}          # running pool index per wall stop
    prev_end_frame = 0
    rail_n = 0
    for r in rooms:
        rid, typ = r["id"], r["type"]
        have = check_room(r)
        for c in r.get("claims", []):
            claims_all.append(dict(c, room=rid))
        n = r.get("n", 0)
        title = r.get("title", rid)
        rail_title = f"{n} · {title}" if n else title
        eyebrow = f"Room {n} · {r.get('theme', '')}" if n else r.get("theme", "")
        narr = r.get("narration")
        if narr:
            cues = []
            for c in narr["cues"]:
                say = c.get("say", c["show"])
                cue = {"show": c["show"], "say": say}
                for k in ("frame", "photo", "end_frame"):
                    if k in c:
                        cue[k] = c[k]
                cues.append(cue)
            script_chapters.append({"id": rid, "title": narr.get("title", title), "cues": cues})
        if typ == "threshold":
            sections.append(f'''
  <section class="threshold" id="{rid}" data-room data-title="{esc(title)}" data-seg='[["f",0,0]]'>
    <div class="threshold__plate"><img class="obj" src="assets/photos/met-76731-cut-1068.webp" srcset="assets/photos/met-76731-cut-720.webp 720w, assets/photos/met-76731-cut-1068.webp 1068w" sizes="(max-width:820px) 70vw, 45vw" alt="{esc(r.get('plate_alt', 'A silk robe of the 1660s, hung flat in the T shape: an ivory ground crossed by broad aubergine and grey bands that sweep across the seams, gold-embroidered characters, and a vermilion lining at the hem.'))}" data-drift="0.06" fetchpriority="high"><span class="glow" aria-hidden="true"></span>
      <p class="threshold__tag"><b>Robe (Kosode) with Fishing Net and Characters</b><span>Japan · Edo period · probably ca. 1660s</span><span>The Metropolitan Museum of Art, 2011.155 · Public domain</span></p></div>
    <div class="threshold__inner">
      <p class="eyebrow">{esc(r.get("eyebrow", "An online exhibition · ten rooms · audio guide"))}</p>
      <h1 class="display">Kimono<span class="jp" lang="ja">着物</span></h1>
      <p class="threshold__q">{r.get("question_html", 'Is a kimono <em>a garment</em>, or <em>a set of rules</em>?')}</p>
      <div class="threshold__row" role="group" aria-label="Pick one and hold your answer">
        <button class="choice glass glass--pill" data-answer="garment" aria-pressed="false"><i></i>A garment</button>
        <button class="choice glass glass--pill" data-answer="rules" aria-pressed="false"><i></i>A set of rules</button>
        <p class="threshold__note" id="answer-note">{rich(r.get("note", "Pick one and hold your answer. It is settled in the last room, not before."), rid)}</p>
      </div>
      <div class="threshold__row">
        {guide_button(rid, (narr or {}).get("title", "Audio guide · Welcome"))}
        <span class="scrollcue" aria-hidden="true">Scroll slowly</span>
      </div>
    </div>
  </section>''')
            continue

        segs = []
        if typ in ("scrub", "answer"):
            segs.append(["f", r["from"], r["to"]])
            prev_end_frame = r["to"]
        room_works = []
        cards_list = r.get("cards", [])
        if typ == "wall":
            stop = r["stop"]
            if "from" in r and "to" in r and r["to"] > r["from"]:
                segs.append(["f", r["from"], r["to"]])
            photos = [P for P in r.get("photos", []) if photo_entry(P["objectID"])[1]]
            missing = [P["objectID"] for P in r.get("photos", []) if not photo_entry(P["objectID"])[1]]
            if missing:
                warn(f"{rid}: photos not available yet: {missing}")
            seq_items = [("photo", P) for P in photos]
            for C in cards_list:                      # text panels hang in the pools too
                seq_items.insert(min(int(C.get("at", 0)), len(seq_items)), ("panel", C))
            cards_list = []
            start = stop_pool.get(stop)
            first = 0 if start is None else start + 1
            if seq_items:
                p0 = first if start is None else start
                segs.append(["w", stop, p0, first + len(seq_items) - 1])
                stop_pool[stop] = first + len(seq_items) - 1
            for i, (kind_, P) in enumerate(seq_items):
                pool = first + i
                if kind_ == "panel":
                    room_works.append(card_html(P, rid, i).replace('<aside class="card glass"', f'<aside class="panel" data-stop="{stop}" data-pool="{pool}" data-w="1.15"', 1))
                    continue
                key, ph = photo_entry(P["objectID"])
                L = P["label"]
                rec = WISH.get(P["objectID"], {})
                cr = CREDITS.get(P["objectID"], {})
                lic = str(cr.get("licence") or cr.get("license") or ("CC0" if rec.get("isPublicDomain") else "")).strip()
                if cr and not re.search(r"cc0|public domain|pdm|cc-zero|open access", lic, re.I):
                    err(f"{rid}: photo {P['objectID']} licence not clear in credits.json: {lic!r}")
                museum = cr.get("museum") or "The Metropolitan Museum of Art"
                pd = 'cc0' in lic.lower() or 'public domain' in lic.lower() or rec.get('isPublicDomain')
                credit = f"{esc(museum)}, {esc(rec.get('accessionNumber', ''))}. {esc(rec.get('creditLine', ''))} {'Public domain (CC0).' if pd else esc(lic)}".strip()
                kind = "print" if re.search(r"print|painting|book|screen|album|scroll", (rec.get("classification", "") + " " + rec.get("objectName", "")), re.I) else "textile"
                files = ph["files"]
                widths = sorted(int(w) for w in files)
                srcset = ", ".join(f"assets/photos/{files[str(w)]} {w}w" for w in widths)
                big = files[str(widths[-1])]
                alt = P.get("alt") or f"{rec.get('title', L['title'])}. Photograph: The Metropolitan Museum of Art."
                room_works.append(f'''
      <figure class="work work--{kind}" data-stop="{stop}" data-pool="{pool}" data-aspect="{ph['w'] / ph['h']:.4f}">
        <div class="work__frame"><img src="assets/photos/{files[str(widths[0])]}" srcset="{srcset}" sizes="(max-width:820px) 92vw, 36vw" width="{ph['w']}" height="{ph['h']}" alt="{esc(alt)}" loading="lazy" decoding="async"></div>
      </figure>
      <div class="placard glass glass--light" data-stop="{stop}" data-pool="{pool}" role="group" aria-label="Label: {esc(L['title'])}">
        <h3>{esc(L["title"])}</h3>
        <p class="placard__meta">{esc(L.get("meta", ""))}</p>
        <p class="placard__mat">{esc(L.get("material", ""))}</p>
        <p class="placard__insight">{rich(L.get("insight", ""), rid)}</p>
        <p class="placard__credit">{credit}</p>
        <a class="placard__zoom" href="assets/photos/{big}" data-zoom>Look closer</a>
      </div>''')
        labels = []
        for i, L in enumerate(r.get("labels", []), 1):
            bl = L.get("body", [])
            body = (f"<p>{rich(bl[0], rid)}</p>" if bl else "") + (("<details><summary>More</summary>" + "".join(f"<p>{rich(x, rid)}</p>" for x in bl[1:]) + "</details>") if len(bl) > 1 else "")
            jp = f' <span lang="ja">{esc(L["jp"])}</span>' if L.get("jp") else ""
            labels.append(f'''
        <li class="label glass" data-anchor="{esc(L["anchor"])}" data-from="{L["from"]}" data-to="{L["to"]}" data-side="{L.get("side", "right")}">
          <p class="label__k"><b>{i}</b>{esc(L["kicker"])}</p>
          <h3>{esc(L["title"])}{jp}</h3>{body}
        </li>''')
        cards = "".join(card_html(C, rid, i) for i, C in enumerate(cards_list))
        works_html = f'<div class="works">{"".join(room_works)}</div>' if room_works else ""
        line = ""
        if r.get("line"):
            Lr = r["line"]
            line = f'<p class="scrub__line" data-from="{Lr.get("from", 0)}" data-to="{Lr.get("to", 0)}">{rich(Lr["text"], rid)}</p>'
        rules = ""
        if r.get("rules"):
            rules = '<div class="rules" id="rules" aria-label="The rules, written on the back of the kimono"><ol>' + "".join(f"<li>{rich(x, rid)}</li>" for x in r["rules"]) + "</ol></div>"
        your = ""
        if typ == "answer":
            your = '<p class="your-answer glass glass--pill" data-your-answer hidden></p>'
        closing = ""
        if r.get("closing"):
            closing = f'<p class="answer__closing">{esc(r["closing"])}</p>'
        weight = r.get("length")
        if not weight:
            weight = 0
            for s in segs:
                weight += (s[2] - s[1]) * 1.75 if s[0] == "f" else (s[3] - s[2] + 0.6) * 95
            weight = max(160, round(weight))
        guide = guide_button(rid, (narr or {}).get("title", f"Audio guide · Stop {n}")) if narr else ""
        sections.append(f'''
  <section class="scrub scrub--{typ}" id="{rid}" data-room data-title="{esc(rail_title)}" data-seg='{json.dumps(segs)}' data-audio="{rid}" style="--len:{weight}">
    <div class="scrub__pin">
      {head_html(r, eyebrow)}
      <ol class="labels">{"".join(labels)}
      </ol>
      <svg class="leaders" aria-hidden="true"></svg>
      {cards}
      {works_html}
      {rules}
      {line}
      {your}
      {closing}
      <div class="scrub__guide">{guide}</div>
    </div>
  </section>''')

    # citations vs claims
    have_all = {}
    for r in rooms:
        for c in r.get("claims", []):
            have_all.setdefault(r["id"], set()).add((str(src_label(c["src"])), norm_page(str(c["page"]))))
    for rid, cs in room_cites.items():
        for (n, pg) in cs:
            ok = (n, pg) in have_all.get(rid, set()) or any(n == a and (pg in b or b in pg) for a, b in have_all.get(rid, set()))
            if not ok:
                err(f"{rid}: citation [{n}] {pg} has no claim row in this room")

    # ---------- page ----------
    tpl = (ROOT / "content/page.html").read_text()
    used = sorted({int(src_label(c["src"])) for c in claims_all if str(src_label(c["src"])).isdigit()})
    bib = []
    for k in used:
        s = SOURCES["list"].get(str(k))
        if s:
            bib.append(f'<li id="src-{k}"><span class="num">[{k}]</span>{s["html"]}</li>')
    page = (tpl.replace("{{ROOMS}}", "\n".join(sections))
               .replace("{{WORKS}}", "")
               .replace("{{BIBLIOGRAPHY}}", "\n        ".join(bib))
               .replace("{{BUILT}}", datetime.date.today().isoformat()))
    (ROOT / "site/index.html").write_text(page)

    # ---------- narration script ----------
    old = json.loads((ROOT / "audio/script.json").read_text()) if (ROOT / "audio/script.json").exists() else {}
    script = {"voice": "Alice", "model": "tts-elevenlabs-turbo-v2-5", "respell": RESPELL, "chapters": script_chapters}
    (ROOT / "audio/script.json").write_text(json.dumps(script, indent=1, ensure_ascii=False))

    # ---------- ledger ----------
    write_ledger(rooms, claims_all)

    for w in warnings:
        print("warn:", w)
    for p in problems:
        print("FAIL:", p)
    print(f"{len(rooms)} rooms, {len(claims_all)} claims, {sum(1 for x in sections if 'class="work ' in x)} rooms with works, {len(problems)} problems, {len(warnings)} warnings")
    if problems and STRICT:
        sys.exit(1)


def write_ledger(rooms, claims):
    L = ["# Kimono exhibition (v3): claims ledger", "",
         "One row per claim shown on screen or spoken in the audio guide. Every quote was read in the source",
         "during the build session and is 25 words or fewer (Japanese: the original words, with a translation",
         "marked Tr.). Generated from `content/rooms/*.json` by `tools/build_site.py`; edit the room files, not this.",
         "", "## Sources", "", "| No. | Source |", "|---|---|"]
    for k, s in sorted(SOURCES["list"].items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 999):
        L.append(f"| {k} | {s['text']} |")
    L += ["", "Museum object facts (titles, dates, materials) come from The Metropolitan Museum of Art collection",
          "records (collectionapi.metmuseum.org), cited as museum records, not as scholarship.", ""]
    n = 0
    for r in rooms:
        rows = r.get("claims", [])
        if not rows:
            continue
        L += [f"## Room {r.get('n', 0)} · {r.get('title', r['id'])}", "",
              "| # | Claim | Src | Page | Quote | Scope | Where |", "|---|---|---|---|---|---|---|"]
        for c in rows:
            n += 1
            cell = lambda s: str(s).replace("|", "\\|").replace("\n", " ")
            L.append(f"| {n} | {cell(c.get('text', ''))} | {cell(src_label(c['src']))} | {cell(c['page'])} | \"{cell(c.get('quote', ''))}\" | {cell(c.get('scope', ''))} | {cell(c.get('where', ''))} |")
        L.append("")
    dropped = [(r["id"], d) for r in rooms for d in r.get("dropped", [])]
    if dropped:
        L += ["## Claims dropped for lack of a source read this session", ""]
        for rid, d in dropped:
            L.append(f"- ({rid}) {d}")
        L.append("")
    (ROOT / "kimono-sources.md").write_text("\n".join(L))


if __name__ == "__main__":
    main()
