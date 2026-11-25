"""Headlines for the news analyst. Headlines and short snippets only, cached.

Sources (allowed on this network):
- Google News RSS, Thai edition, one query per ticker, with before:/after:
  date filters so a past decision never sees later news.
- kaohoon.com/feed and bangkokpost.com business RSS: latest items only, so
  they are used for the LIVE daily run, never for past (backtest) dates.
"""
import hashlib, html, re, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

CACHE = Path(__file__).parent / "data" / "news"
UA = "Mozilla/5.0 (compatible; paper-trading-research/0.1)"
MARKET_FEEDS = ["https://www.kaohoon.com/feed",
                "https://www.bangkokpost.com/rss/data/business.xml"]


def _get(url, max_age=None):
    """Fetch with a disk cache. max_age=None: cache forever (past queries)."""
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".xml")
    if p.exists() and (max_age is None or time.time() - p.stat().st_mtime < max_age):
        return p.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
            p.write_bytes(body)
            time.sleep(1.5)  # keep requests sparse
            return body
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(10 * (i + 1))
    print(f"news: failed {url[:80]}: {err}")
    return b""


def _clean(s, n=160):
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    return re.sub(r"\s+", " ", s).strip()[:n]


def _parse(body):
    items = []
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return items
    for it in root.iter("item"):
        t = it.findtext("pubDate")
        try:
            when = parsedate_to_datetime(t) if t else None
        except (TypeError, ValueError):
            when = None
        items.append(dict(title=_clean(it.findtext("title"), 200),
                          snippet=_clean(it.findtext("description")),
                          when=when))
    return items


def ticker_news(ticker, after, before, n=5):
    """Freshest n headlines about `ticker` published in [after, before).
    Dates are 'YYYY-MM-DD'. `before` is the decision date: nothing later."""
    q = f"{ticker} หุ้น after:{after} before:{before}"
    url = ("https://news.google.com/rss/search?q=" + urllib.parse.quote(q)
           + "&hl=th&gl=TH&ceid=TH:th")
    live = before >= time.strftime("%Y-%m-%d")
    items = _parse(_get(url, max_age=3600 if live else None))
    items = [i for i in items if i["when"] is None or i["when"].strftime("%Y-%m-%d") < before]
    items.sort(key=lambda i: i["when"].timestamp() if i["when"] else 0, reverse=True)
    return items[:n]


def market_news(n=10, after=None, before=None):
    """General market headlines. For past dates use Google News (SET index query);
    for today use the two RSS feeds."""
    if before:
        q = f"ตลาดหุ้นไทย SET after:{after} before:{before}"
        url = ("https://news.google.com/rss/search?q=" + urllib.parse.quote(q)
               + "&hl=th&gl=TH&ceid=TH:th")
        items = [i for i in _parse(_get(url)) if i["when"] is None
                 or i["when"].strftime("%Y-%m-%d") < before]
    else:
        items = [i for u in MARKET_FEEDS for i in _parse(_get(u, max_age=3600))]
    items.sort(key=lambda i: i["when"].timestamp() if i["when"] else 0, reverse=True)
    return items[:n]


def brief(items):
    """Compact text: one line per headline, date + title (+ short snippet)."""
    out = []
    for i in items:
        d = i["when"].strftime("%m-%d") if i["when"] else "--"
        s = i["snippet"] if i["snippet"] and i["title"][:30] not in i["snippet"] else ""
        out.append(f"{d} {i['title']}" + (f" | {s[:100]}" if s else ""))
    return "\n".join(out)
