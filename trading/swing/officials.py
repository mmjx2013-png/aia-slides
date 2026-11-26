"""Official release sources for the news executor. PAPER desk helper.

BEA (PCE, GDP, personal income/outlays): https://www.bea.gov/news/current-releases
Federal Reserve (FOMC statement / rate):  https://www.federalreserve.gov/feeds/press_all.xml
BLS (CPI, NFP, ...): answers 403 to automated requests -> NOT used; those events keep the headline path
and the price-reaction fallback.
Polled every 3 s from T-1 to T+3 min only. On a new release link: fetch that page (same host), extract the
figure in CODE (regex on the official wording); only if that fails, ask the ultrafast Venice model.
"""
import html
import re
import time
import urllib.request

BEA = "https://www.bea.gov/news/current-releases"
FED = "https://www.federalreserve.gov/feeds/press_all.xml"
UA = {"User-Agent": "paper-desk/1.0"}


def source_for(title):
    t = title.lower()
    if any(k in t for k in ("pce", "gdp", "personal income", "personal spending")):
        return "BEA"
    if any(k in t for k in ("federal funds rate", "fomc", "monetary policy statement")):
        return "FED"
    return None                                     # BLS and others: headlines only


def _get(url, timeout=6):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def text(page):
    t = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page, flags=re.S)))
    return re.sub(r"\s+", " ", t)


def links(src):
    """Current release links on the official index page."""
    if src == "BEA":
        return [("https://www.bea.gov" + h, x.strip()) for h, x in
                re.findall(r'<a[^>]+href="(/news/20\d\d/[^"]+)"[^>]*>([^<]{5,200})</a>', _get(BEA))]
    b = _get(FED)
    return [(l, t) for t, l in re.findall(r"<item>\s*<title>(.*?)</title>\s*<link><!\[CDATA\[(.*?)\]\]></link>", b, re.S)]


def _frac(s):
    """'3-3/4' -> 3.75, '4' -> 4.0, '4.25' -> 4.25."""
    m = re.match(r"(\d+)(?:-(\d)/(\d))?$", s)
    if m and "." not in s:
        return int(m.group(1)) + (int(m.group(2)) / int(m.group(3)) if m.group(2) else 0)
    return float(s)


def extract(title, page_text):
    """Code-first figure for one calendar title from an official page's text, or None."""
    t, tl = page_text, title.lower()
    sign = {"increased": 1, "rose": 1, "decreased": -1, "fell": -1, "declined": -1}
    if "pce" in tl and "m/m" in tl:
        m = re.search(r"From the preceding month, the PCE price index for \w+ (increased|decreased|rose|fell|declined|was unchanged)"
                      r"(?: (-?\d+\.\d) percent)?\s*\.?\s*Excluding food and energy, the PCE price index (?:also )?"
                      r"(increased|decreased|rose|fell|declined|was unchanged)(?: (-?\d+\.\d) percent)?", t)
        if m:
            verb, num = (m.group(3), m.group(4)) if "core" in tl else (m.group(1), m.group(2))
            return 0.0 if verb == "was unchanged" else sign[verb] * float(num)
    if "gdp" in tl:
        m = re.search(r"Real gross domestic product \(GDP\s*\) (increased|decreased) at an annual rate of (\d+\.\d) percent", t)
        if m:
            return sign[m.group(1)] * float(m.group(2))
    if "federal funds rate" in tl:
        m = re.search(r"target range for the federal funds rate (?:at|to) (\d+(?:-\d/\d)?|\d+\.\d+) to (\d+(?:-\d/\d)?|\d+\.\d+) percent", t)
        if m:
            return _frac(m.group(2))                  # the upper bound, as the calendar quotes it
    return None


def relevant(title, url):
    """Does this release page carry this calendar figure? (avoids a useless model call)"""
    t, u = title.lower(), url.lower()
    if "pce" in t or "personal" in t:
        return "personal-income" in u
    if "gdp" in t:
        return "gdp" in u
    return True


class Poller:
    """One per event: baseline the index at the first poll, then report new release pages."""

    def __init__(self, src):
        self.src, self.base, self.done = src, None, set()

    def poll(self):
        """Returns [(url, link_title, page_text, fetch_s)] for releases that appeared since the baseline."""
        t0 = time.time()
        cur = links(self.src)
        if self.base is None:
            self.base = {u for u, _ in cur}
            return []
        out = []
        for u, lt in cur:
            if u in self.base or u in self.done:
                continue
            self.done.add(u)
            if self.src == "FED" and "fomc statement" not in lt.lower() and "federal reserve issues fomc" not in lt.lower():
                continue
            out.append((u, lt, text(_get(u)), round(time.time() - t0, 2)))
        return out
