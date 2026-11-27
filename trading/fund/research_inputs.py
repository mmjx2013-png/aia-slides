"""Inputs for the finalist memos (code only): for each finalist write research/inputs/<TICKER>.md with
- the screen row and XBRL numbers (from screen.csv), price stats from the boss's pack;
- the latest 10-K: accession, filing date, and text excerpts of Item 7 (MD&A) and Item 1A (Risk Factors), from EDGAR;
- the latest 10-Q accession and date, if newer;
- the last 30 days of Google News headlines, labelled by the ultrafast Venice model (topic / gold-style impact replaced by
  stock impact: positive / negative / neutral).
PAPER research. EDGAR with the generic research User-Agent (edgar.py).
  python3 research_inputs.py [TICKER ...]
"""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

import numpy as np
import pandas as pd

import edgar as E
import prices as P

HERE = E.HERE
OUT = HERE / "research" / "inputs"
MDA_CHARS, RISK_CHARS = 24_000, 14_000          # ~6k and ~3.5k tokens


def doc_text(cik, accn, primary):
    url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accn.replace('-', '')}/{primary}"
    f = E.CACHE / f"doc_{accn}.txt"
    if f.exists():
        return f.read_text(), url
    wait = 0.25 - (time.time() - E._last[0])
    if wait > 0:
        time.sleep(wait)
    E._last[0] = time.time()
    with urllib.request.urlopen(urllib.request.Request(url, headers=E.UA), timeout=60) as r:
        raw = r.read().decode("utf-8", "ignore")
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", html.unescape(t))
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(t)
    return t, url


def section(t, start_pats, end_pats, n):
    """The longest real 10-K item: a start heading that is followed by its own end heading (the table of contents gives
    short hits, cross-references like 'see Item 1A, Risk Factors' never reach an end heading). Cut to n characters."""
    best = ""
    for sp in start_pats:
        for m in re.finditer(sp, t, re.I):
            rest = t[m.start():]
            ends = [x.start() + 60 for ep in end_pats for x in [re.search(ep, rest[60:], re.I)] if x]
            if not ends:
                continue                                   # no closing heading: a cross-reference, not the section
            chunk = rest[:min(ends)]
            if re.match(r"Item\s*\d{1,2}[A-C]?\s*,", chunk, re.I):
                continue                                   # "Item 1A, 'Risk Factors'": a citation, not the heading
            if re.search(r"\b\d{1,3}\s+(Table of Contents\s+)?(Item|PART)\b", chunk[:250], re.I):
                continue                                   # table of contents: heading, page number, next heading
            if re.search(r"(see|in|under|and|our|of|“|\")\W{0,3}$", t[max(0, m.start() - 14):m.start()], re.I):
                continue                                   # a cross-reference in running text, not the heading
            if len(chunk) > len(best):
                best = chunk
    return best[:n]


def latest(subs, forms):
    r = subs["filings"]["recent"]
    for i, f in enumerate(r["form"]):
        if f in forms:
            return dict(form=f, accn=r["accessionNumber"][i], filed=r["filingDate"][i], primary=r["primaryDocument"][i],
                        period=r.get("reportDate", [""] * len(r["form"]))[i])
    return None


def headlines(name, ticker, days=30, n=15):
    q = f'"{name.split(",")[0].split(" Inc")[0]}" OR {ticker} stock'
    u = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": f"{q} when:{days}d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "paper-desk/1.0"}), timeout=15) as r:
            root = ET.fromstring(r.read())
    except Exception as e:
        return [f"(headline fetch failed: {type(e).__name__})"]
    items = sorted(((parsedate_to_datetime(it.findtext("pubDate")), (it.findtext("title") or "").strip()) for it in root.iter("item")),
                   reverse=True)[:n]
    lab = {x["i"]: x for x in classify(ticker, [t for _, t in items])}
    return [f"- {d.strftime('%Y-%m-%d')}: {t[:150]}" + (f" [{lab[i]['topic']}, {lab[i]['impact']} {lab[i]['confidence']:.1f}]" if i in lab else "")
            for i, (d, t) in enumerate(items)]


def classify(ticker, titles):
    """One ultrafast Venice call: topic and the likely impact on THIS stock, for each headline."""
    sys.path.insert(0, str(HERE.parent / "swing"))
    import venice
    schema = {"type": "object", "additionalProperties": False, "required": ["items"], "properties": {"items": {"type": "array", "items": {
        "type": "object", "additionalProperties": False, "required": ["i", "topic", "impact", "confidence"],
        "properties": {"i": {"type": "integer"}, "topic": {"type": "string", "enum": ["earnings", "guidance", "product", "competition", "legal",
                       "macro", "analyst", "management", "capital return", "other"]},
                       "impact": {"type": "string", "enum": ["positive", "negative", "neutral"]}, "confidence": {"type": "number"}}}}}}
    body = {"model": venice.PRIMARY, "temperature": 0, "max_tokens": 40 * len(titles) + 60,
            "messages": [{"role": "system", "content": "You label news headlines for a stock analyst. JSON only."},
                         {"role": "user", "content": f"For each numbered headline about {ticker}, give the topic and its likely impact on {ticker}'s "
                          "share price (positive/negative/neutral) with confidence 0-1.\n" + "\n".join(f"{i}. {t}" for i, t in enumerate(titles))}],
            "response_format": {"type": "json_schema", "json_schema": {"name": "labels", "strict": True, "schema": schema}},
            "venice_parameters": {"include_venice_system_prompt": False, "disable_thinking": True}}
    try:
        r = venice._req("/chat/completions", body, timeout=30)
        return json.loads(r["choices"][0]["message"]["content"])["items"]
    except Exception:
        return []


def stats(ticker):
    df = P.load(ticker)
    if df is None:
        return "no prices"
    a = df["adj"]
    r = a.pct_change().dropna()
    def ret(n):
        return a.iloc[-1] / a.iloc[-1 - n] - 1 if len(a) > n else np.nan
    dd = (a / a.cummax() - 1)
    return (f"last close {df['close'].iloc[-1]:.2f} on {df.index[-1].date()}; total return 1m {100 * ret(21):+.0f}%, 6m {100 * ret(126):+.0f}%, "
            f"1y {100 * ret(252):+.0f}%, 3y {100 * ret(756):+.0f}%; volatility {100 * r.iloc[-252:].std() * np.sqrt(252):.0f}%/y; "
            f"drawdown from 5y high {100 * dd.iloc[-1]:.0f}%; worst 5y drawdown {100 * dd.min():.0f}%")


def build(ticker, row):
    cik = int(row["cik"])
    subs = E.submissions(cik)
    k = latest(subs, ("10-K", "10-K/A"))
    q = latest(subs, ("10-Q",))
    t, url = doc_text(cik, k["accn"], k["primary"])
    mda = section(t, [r"Item\s*7\W{0,4}\s*Management.{0,5}s\s+Discussion"], [r"Item\s*7A\W", r"Item\s*8\W{0,4}\s*Financial Statements"], MDA_CHARS)
    risk = section(t, [r"Item\s*1A\W{0,4}\s*Risk\s+Factors"], [r"Item\s*1B\W", r"Item\s*1C\W", r"Item\s*2\W{0,4}\s*Properties"], RISK_CHARS)
    keep = ["composite", "s_quality", "s_growth", "s_balance", "s_dilution", "s_valuation", "s_momentum", "mom_12_1", "roic", "roe",
            "fcf_margin", "fcf_margin_avg", "fcf_margin_std", "rev_cagr", "fcf_cagr", "net_debt_fcf", "net_debt_ebitda", "dilution",
            "fcf_yield", "fcf_yield_norm", "ev_ebit", "ev_ebit_norm", "ev_ebit_vs_hist", "revenue", "fcf", "mkt_cap", "fy_end", "flag",
            "cyclical_normalized"]
    nums = "\n".join(f"- {c}: {row[c]:.4g}" if isinstance(row[c], (float, int, np.floating)) and row[c] == row[c] else f"- {c}: {row[c]}"
                     for c in keep if c in row.index)
    txt = f"""# Research inputs: {ticker} ({row['name']}), {row['industry']}; industry group {row['group']}
Prepared by code on {pd.Timestamp.now():%Y-%m-%d}. Sources: SEC EDGAR (XBRL companyfacts, the filings below), Yahoo price pack, Google News.

## Filings
- Latest 10-K: accession {k['accn']}, filed {k['filed']}, period {k['period']}: {url}
- Latest 10-Q: {f"accession {q['accn']}, filed {q['filed']}, period {q['period']}" if q else 'none'}

## Screen numbers (XBRL, fiscal year ending {row['fy_end']}; ratios as fractions)
{nums}

## Price stats
{stats(ticker)}

## 10-K Item 7, MD&A (excerpt, first {MDA_CHARS} characters of the section)
{mda or '(section not found by the parser)'}

## 10-K Item 1A, Risk factors (excerpt, first {RISK_CHARS} characters)
{risk or '(section not found by the parser)'}

## Headlines, last 30 days (Google News; labels by a fast model)
{chr(10).join(headlines(row['name'], ticker))}
"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{ticker}.md").write_text(txt)
    return len(txt) // 4, bool(mda), bool(risk)


if __name__ == "__main__":
    fin = pd.read_csv(HERE / "finalists.csv")
    scr = pd.read_csv(HERE / "screen.csv").set_index("ticker")
    want = sys.argv[1:] or list(fin["ticker"])
    for tk in want:
        try:
            print(tk, build(tk, scr.loc[tk]))
        except Exception as e:
            print(tk, "FAILED", type(e).__name__, e)
