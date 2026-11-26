"""Headlines for the swing brief: Google News RSS, last 3 days, published before the wake only.
PAPER desk helper."""
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

QUERIES = [("gold", "gold price"), ("Fed", "Federal Reserve OR Powell OR FOMC"), ("USD", "US dollar OR Treasury yields")]


def headlines(asof_ms, days=3, per_day=(4, 2, 2)):
    """Newest titles per query, spread over the days: 4 from the last 24 h, then 2 per earlier day."""
    out, seen = [], set()
    for lab, q in QUERIES:
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
            {"q": f"{q} when:{days}d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "paper-desk/1.0"}), timeout=15) as r:
                root = ET.fromstring(r.read())
        except Exception as e:
            out.append(f"[{lab}] fetch failed: {type(e).__name__}")
            continue
        items = []
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            ts = parsedate_to_datetime(it.findtext("pubDate")).timestamp() * 1000
            if asof_ms - days * 86400_000 <= ts <= asof_ms and title.lower() not in seen:
                items.append((ts, title))
        items.sort(reverse=True)
        pick = []
        for k, n in enumerate(per_day):
            pick += [x for x in items if k * 86400_000 <= asof_ms - x[0] < (k + 1) * 86400_000][:n]
        lines = []
        for ts, t in pick:
            seen.add(t.lower())
            h = (asof_ms - ts) / 3600_000
            lines.append(f"- {h:.0f} h ago: {t[:140]}")
        out.append(f"[{lab}]\n" + "\n".join(lines) if lines else f"[{lab}] none")
    return "\n".join(out)
