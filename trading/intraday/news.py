"""Headlines for the Opus brief: Google News RSS, last 3 hours before the setup only
(nothing published after the setup bar closed). PAPER desk helper."""
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

QUERIES = ["gold price", "Fed OR Powell OR dollar OR Treasury yields"]


def headlines(close_ms, hours=3, n=10):
    out = []
    for q in QUERIES:
        url = ("https://news.google.com/rss/search?" +
               urllib.parse.urlencode({"q": f"{q} when:{hours + 1}h", "hl": "en-US", "gl": "US", "ceid": "US:en"}))
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "paper-desk/1.0"}), timeout=15) as r:
                root = ET.fromstring(r.read())
        except Exception as e:
            out.append(f"[{q}] news fetch failed: {type(e).__name__}")
            continue
        items = []
        for it in root.iter("item"):
            ts = parsedate_to_datetime(it.findtext("pubDate")).timestamp() * 1000
            if close_ms - hours * 3_600_000 <= ts <= close_ms:
                items.append((ts, it.findtext("title")))
        items.sort(reverse=True)
        out.append(f"[{q}] {len(items)} headlines in the last {hours} h" +
                   "".join(f"\n- {int((close_ms - ts) / 60000)} min ago: {t}" for ts, t in items[:n]))
    return "\n".join(out)
