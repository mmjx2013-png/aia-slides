# Writers' brief: "Kimono: a garment, or a set of rules?" (v3, online exhibition)

You write one or more ROOMS of an online museum exhibition. Each room is one JSON file in
`content/rooms/<id>.json`. A build script turns them into the website, the narration
(ElevenLabs "Alice" via the Venice API), the captions and the claims ledger. Write only your
own files.

## The exhibition

Tone: the interpretation in an expensive museum. The object comes first. Restrained, precise,
warm, never cute, never gimmicky, no exclamation marks, no rhetorical "Imagine...", no "delve",
no "tapestry", no "testament". British spelling (colour, standardised). Short sentences.
Specific nouns. Every room earns one small surprise.

The setting (decided by the user): a bright, reconstructed Edo-period shoin-style reception
hall, rendered in Blender and scrubbed by scroll: tatami, shoji glowing with daylight, wooden
posts, a gold-leaf alcove wall. Light backgrounds throughout. The hall is "a reconstructed
Edo-period shoin-style room, not a specific building": never claim more about the room than
that, and make no claim about its architecture. One long plaster wall of the hall is the
"display wall", where photographs of real museum objects (The Met, public domain) hang, one per
bay; the visitor walks along it.

The spine question, asked at the entrance and answered ONLY in the last room: "Is a kimono a
garment, or a set of rules?" Answer (room 10): both. Rooms 1-9 must not give the answer away;
they may sharpen the question.

Rooms and who writes them:

| n | id | type | theme | what the visitor sees | writer |
|---|---|---|---|---|---|
| 0 | threshold | threshold | Welcome | frame 0: a rolled bolt of cloth on the tatami, the long bright hall beyond | A |
| 1 | bolt | scrub 0-329 | Structure: from bolt to T | A the bolt unrolls across the tatami (0-119); B cut lines draw themselves and the eight pieces glide into a flat layout (120-209); C a rod lifts the strips, seams are sewn, a flat T hangs on a rack, back toward us (210-329) | A |
| 2 | parts | scrub 329-419 | Structure: the parts, the front, re-making | D the camera turns 180 degrees round the T to its front: collar, okumi, left-over-right overlap (330-419) | A |
| 3 | cloth | wall S1, from 420 to 491 | Fabric and season | three stills of a weaving room (a floor loom by a window; warp threads and shuttle; a finished bolt) given as `stills`, then the camera turns to the display wall: photographs of real robes | B |
| 4 | pattern | wall S1 (continues) | Pattern and its coding | the same wall, further along | B |
| 5 | dressing | scrub 492-683 | Kitsuke | walk to a bare full-body mannequin in front of the gold alcove (492-563); E the layers build (564-683): juban from 564, kimono left over right ~580, ohashori ~596, obi ~612, obi-age ~628, obi-jime ~644, knot at the back ~660 | B |
| 6 | body | scrub 684-845 then wall S2 | Body language | F the camera turns to the mannequin's back (684-773): knot, nape, hem; then returns to the display wall (774-845): prints showing kimono worn and put on | B |
| 7 | family | wall S2 (continues) | The kimono family | the wall: garments of the family | C |
| 8 | history | wall S2 (continues) | Four centuries | the wall: prints, a modern kimono | C |
| 9 | abroad | wall S2 (continues) | Relatives and influence | the wall: dressing gown, tea gown, banyan; other robes only with a sourced comparison | C |
| 10 | answer | scrub 846-983 | Garment or rules: both | the camera walks back down the hall and settles on the back of the T on its rack (846-953); G (954-983) the site writes "the rules" on the back | C |

For a wall room that starts with a camera move, give "from" and "to" (cloth: 420, 491; body is
type "scrub" with from 684, to 845 AND "stop": "S2" with photos; the build handles both).
Room 3 may add `"stills": [{"file": "weave_1", "caption": "..."}]` (captions <= 90 characters,
describing only what is visible; no sourced claim needed for a description of the picture, but
any fact about weaving needs a source).

## Sources (final numbers; cite ONLY these, ONLY from text actually read this session)

Research notes with verified quotes are in the scratchpad
`/tmp/claude-0/-home-user-aia-slides/d08b3256-05de-5c3d-9318-a3845ce8df89/scratchpad/research/`:
`core.md` (sources 4, 5, 6: rows 1-63 = the v2 ledger also in /home/user/aia-slides/kimono-sources.md; rows 101-253 new),
`new-jstage.md` (labels J1-J14), `new-tsa.md` (labels S1-S9), and `gaps.md` (labels G1-G15: the kimono family,
formality, crests, Heian origins, Edo clothing laws, East Asian relatives; its bibliography says which are refereed).
Map the temporary labels to these numbers:

| No. | Source | temp label |
|---|---|---|
| 4 | Becke 2022, PhD thesis, Sheffield (furisode at the coming-of-age day) | 4 |
| 5 | Fukai, "Japonism in Fashion", Kyoto Costume Institute | 5 |
| 6 | Druet 2024, Mutual Images 12 (seasons) | 6 |
| 7 | Maruyama, Tauchi, Kubo 2017, Bulletin of JSSD 63(5) (form and making-over) | J1 = S9 |
| 8 | Maruyama, Tauchi, Kubo 2020, Bulletin of JSSD 66(3) (kimono-ness, doll kimono) | J13 |
| 9 | Notsu, Mizunashi 1969, J. Japan Society of Clothing 13(1) (measurements) | J3 |
| 10 | Koide 2012, J. Home Economics of Japan 63(9) (kosode design styles) | S1 |
| 11 | Sakamoto 2018, Kansei Engineering 16(1) (kimono and the West) | S2 |
| 12 | Druet 2021, Mutual Images 10 (rental and second-hand shops) | S3 |
| 13 | Suzuki 2022, Japanese Research in Business History 39 (Edo fabric dealers) | S4 |
| 14 | Goto 2023, Tokyo Kasei Gakuin bulletin 63 (meisen in magazines) | S6 |
| 15 | Shiba 2018, JHEE conference abstract 61 (meisen) | S7 |
| 16 | Sasai 2010, J. Home Economics of Japan 61(4) (British tea gowns) | S8 |
| 17 | Iwasaki 2005, J. Japan Society of Clothing 49(1) (origins of the kimono; a lecture) | J11 |
| 18 | Sato, Tamura 2014, Sen'i Gakkaishi 70(6) (obi position, posture) | J2 |
| 19 | Mitsuno, Nago 2015, J. Japan Society of Clothing 58(2) (ohashori slippage) | J7 |
| 20 | Okabe, Ito 2005, J. Japan Society of Clothing 49(1) (comfort; a lecture) | J9 |
| 21 | Okabe, Ohtsuki, Ito 2006, J. Japan Society of Clothing 50(1) (clothing pressure) | J14 |
| 22 | Kamiya et al. 1976, J. Home Economics of Japan 27(8) (the collar in dressing) | J12 |
| 23 | Sasamoto 1986, J. Home Economics of Japan 37(8) (gait in kimono) | J6 |
| 24 | Kazukane, Sasamoto 2005, J. Japan Society of Clothing 49(1) (summer kimono microclimate) | J5 |
| 25 | Araki 2022, Regional Activation Studies 17(1) (iromuji, formality, prices) | J8 |
| 26 | Tamura 2011, J. Textile Engineering 57(6) (students and coming-of-age dress) | J4 |
| 27 | Masumoto et al. 2007, J. Home Economics of Japan 58(12) (students, Japan and Thailand) | J10 |
| 28 | Nesterova, Spitsyna 2012, JSSD special issue (weak; avoid) | S5 |
| 29 | Furukawa 2021 (hōmonfuku, Meiji to early Shōwa) | G1 |
| 30 | Saitō 1979 (kosode in the Heian era: underwear to outerwear) | G2 |
| 31 | Imamura 2005 (kimono then and now; a lecture) | G3 |
| 32 | Fukui 1970 (family crests on clothes) | G4 |
| 33 | Okamoto, Numata, Kōyama 2008 (the magazine Utsukushii Kimono, report 1) | G5 |
| 34 | Kōyama, Okamoto 2009 (Utsukushii Kimono, report 2, 1953-1972) | G6 |
| 35 | Mori 2008 (clothes of the samurai; invited essay) | G7 |
| 36 | Mizukami 2008 (townspeople's kimono, late Edo to early Meiji; invited essay) | G8 |
| 37 | Yokogawa 2008 (haori; invited essay) | G9 |
| 38 | Dōmae 2015 (wedding dress "mitsugasane"; college bulletin) | G10 |
| 39 | Nishimura 1980 (clothing laws of the Edo period) | G11 |
| 40 | Yang, Kimata, Satō 2024 (hanfu) | G12 |
| 41 | Tamura 2005 (Asian ethnic dress; a lecture) | G13 |
| 42 | Satō 2003 (Ryukyu bingata; commentary) | G14 |
| 43 | Nakano 2006 (attus in nishiki-e; museum bulletin) | G15 |
| Met | The Metropolitan Museum of Art collection records (object facts only: title, date, culture, medium, size, accession number) | |

Not readable, never cite: Dalby (only as "Becke, citing Dalby"), the Met exhibition book, SciELO.

Rules (non-negotiable):
- Every factual statement on screen OR in the narration must be backed by a claim row in your
  room's `claims` array with source number, page, a VERBATIM quote of 25 words or fewer
  (for Japanese sources: the original Japanese, roughly 60 characters or fewer, and an English
  translation marked "Tr."), and a scope note. Copy quotes exactly from the research notes.
- Respect scope. Becke is about the furisode at the coming-of-age day and about guides and
  magazines; say so where it matters ("in furisode magazines", "guides say"). A survey of 40
  students in one city is exactly that. Reported views say who reports whom.
- If you cannot source something, leave it out. Do not soften an unsourced claim into a vague
  one. List what you wanted but could not source in `dropped`.
- Quote marks on screen: <q>...</q> around verbatim words; they must appear verbatim in the
  claim's quote. Citation tokens: write {4:p.10} or {7:pp.76-77} right after the statement;
  the build turns them into linked "[4] p.10". Japanese sources: quote in English as your
  translation only in narration; on screen, paraphrase (no <q>) and cite.
- Met records: object labels use only what the record says (see assets/photo-wishlist.json).
  Never call an object an example of a pattern style or a garment type unless its record says
  so.

## The narration (audio guide)

One audio stop per room, 35-75 seconds (about 90-190 words), voice "Alice" (a calm British
female voice). It is heard while the visitor looks, so:
- It NEVER reads what is on screen. It adds what the screen does not show: context, a person,
  a number, a consequence, a way of looking ("Look at the left front...").
- Spoken style: short sentences, one idea each; no citations, no brackets, no lists, no
  abbreviations; numbers as a listener needs them ("about thirty-six centimetres").
- It may quote a source aloud only rarely and briefly ("one guide puts it simply: ...").
- It ends on a turn that leads to the next room, never on a summary.
- Japanese terms: give "say" with a phonetic respelling for the TTS where needed
  (kitsuke -> "kee-tsoo-keh", ohashori -> "oh-hah-show-ree", furisode -> "foo-ree-soh-deh",
  obi -> "oh-bee", juban -> "joo-bahn", okumi -> "oh-koo-mee", haori -> "hah-oh-ree",
  hakama -> "hah-kah-mah", uchikake -> "oo-chee-kah-keh", yukata -> "yoo-kah-tah",
  kosode -> "koh-soh-deh", komon -> "koh-mohn", meisen -> "may-sen", awase -> "ah-wah-seh",
  hitoe -> "hee-toh-eh", tanmono -> "tahn-moh-noh", koromogae -> "koh-roh-moh-gah-eh").
  "show" keeps the correct romaji (with macrons where the source uses them).
- For scrub rooms give each cue a `frame` (full-rate frame, ascending, inside the room's range):
  the picture the visitor should be looking at when the sentence starts. For wall rooms give
  each cue a `photo` index (0-based) instead.

## On-screen text limits (the build fails if text does not fit at 1920x1080, 1440x900, 390x844)

- `title` (rail/bar) <= 22 characters; `heading` <= 34; `intro` <= 150.
- Scrub labels: `kicker` <= 18, `title` <= 34, `body` 1-2 paragraphs, together <= 240 characters
  of visible text (citations excluded). 3-6 labels per scrub room; label time windows must not
  overlap; each visible for at least 25 frames; give the anchor name (anchor names: roll, cloth_free_end, cut_1..cut_5, piece_sleeve_l, piece_sleeve_r, piece_body_l,
  piece_body_r, piece_okumi, piece_collar, rod, seam_centre_back, seam_sleeve_l, seam_side_l, sleeve_l_centre,
  sleeve_r_centre, collar_front, overlap_front, hem_front; for rooms 5-6 use form_juban_collar, form_overlap, form_ohashori, form_obi,
  form_obiage, form_obijime, form_knot, form_nape, form_hem, form_sleeve) and side "left" or
  "right" (the side of the screen the card sits on; pick the side away from the garment's
  centre of interest).
- `line` (optional, one per scrub room): a closing sentence shown large at the end, <= 70 chars.
- Wall photo labels: `title` exactly the Met title; `meta` "Japan · Edo period · ca. 1660s"
  style from the record; `material` from the record (shorten with "..." only at the end);
  `insight` <= 170 characters, sourced. 4-7 photos per wall room, ordered as a walk.
- `cards` (wall rooms, optional, 0-2): glass cards that sit beside the wall: `title` <= 34,
  `body` <= 300 characters. A card of kind "calendar" or "table" may carry `rows` (see schema).

## JSON schema (one file per room)

```json
{
  "id": "bolt", "n": 1, "type": "scrub", "theme": "Structure",
  "title": "One bolt", "heading": "One bolt of cloth", "intro": "Before it is a garment it is a roll ...",
  "from": 0, "to": 329,
  "labels": [
    {"anchor": "roll", "from": 14, "to": 104, "side": "right", "kicker": "The bolt",
     "title": "One roll, one width", "jp": "反物", "body": ["The cloth <q>comes in a standardised width</q> {4:p.10}."]}
  ],
  "line": {"from": 316, "to": 329, "text": "So where does the shape come from?"},
  "stop": "S1",
  "photos": [
    {"objectID": 76731, "label": {"title": "Robe (Kosode) with Fishing Net and Characters", "meta": "Japan · Edo period · probably ca. 1660s",
      "material": "Silk and metallic thread embroidery, tied resist dyeing on satin damask", "insight": "... {4:p.11}"}}
  ],
  "cards": [{"kind": "text", "title": "...", "body": ["..."]},
            {"kind": "table", "title": "...", "head": ["", "Lined", "Unlined"], "rows": [["Months", "Oct-May {6:p.20}", "Jun-Sep {6:p.20}"]]}],
  "narration": {"title": "Stop 1 · One bolt", "cues": [{"show": "Watch the cloth, not the labels.", "say": "optional respelt text", "frame": 0}]},
  "claims": [{"text": "The bolt has a standard width.", "src": 4, "page": "p.10", "quote": "comes in a standardised width", "scope": "general", "where": "label 1"}],
  "dropped": ["Crest counts by formality: no source read."]
}
```
Fields that do not apply to a room type are omitted. Validate your JSON (python3 -m json.tool).
