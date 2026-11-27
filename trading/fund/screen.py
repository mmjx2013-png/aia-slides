"""Fundamental screen of US large caps from SEC EDGAR (code only). Writes screen.csv. PAPER research.

Universe: every filer in the SEC frames for annual revenue (CY2025, falling back to CY2024), US address, with a
ticker. The top 200 by revenue are kept, then each one's companyfacts gives up to 4 fiscal years of 10-K data. Only
values filed on or before the as-of date are used (point in time by filing date).
Scores, as percentile ranks within the universe (financials and REITs are flagged: FCF/ROIC do not fit them):
  quality   ROIC (NOPAT / (equity + debt - cash)), ROE, FCF margin, stability (-std of FCF margin)
  growth    3y revenue CAGR, 3y FCF CAGR
  balance   -(net debt / FCF)
  dilution  -(3y change in diluted shares)
  valuation FCF yield (FCF / market cap) and EV/EBIT now vs its median at the last 3 fiscal-year ends (prices from
          the boss's pack, prices.py; market cap = cover-page shares outstanding x close on the as-of date)
composite = mean of the available group scores.
  python3 screen.py [--asof 2026-11-27] [--n 200]
"""
import argparse
import math
import time

import numpy as np
import pandas as pd

import edgar as E
import prices as P

HERE = E.HERE
REV = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet",
       "RevenueFromContractWithCustomerIncludingAssessedTax"]
TAGS = {
    "rev": REV,
    "ni": ["NetIncomeLoss"],
    "opinc": ["OperatingIncomeLoss"],
    "ocf": ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
    "debt": ["LongTermDebt", "LongTermDebtNoncurrent", "DebtInstrumentCarryingAmount"],
    "debt_cur": ["LongTermDebtCurrent", "DebtCurrent", "ShortTermBorrowings"],
    "cash": ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
    "equity": ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    "shares": ["WeightedAverageNumberOfDilutedSharesOutstanding"],
    "da": ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet"],
}
# re-domiciled filers: new CIK -> old CIKs whose history is spliced in (frames skipped for them)
SPLICE = {2115436: [34088]}           # Exxon Mobil (new holding company)
# captive finance / floor-plan debt wrecks FCF and debt ratios: listed but unscored, like financials
CAPTIVE = {"GM", "F", "LAD", "AN", "GPI", "PAG", "KMX", "CAT", "DE", "PCAR", "HOG", "CNH", "ABG", "SAH", "CVNA", "TSLA"}
CAPTIVE_SIC = ("3711", "55")          # motor vehicles; auto dealers
FLOW = {"rev", "ni", "opinc", "ocf", "capex", "shares", "da"}


def universe(n):
    best = {}
    for period in ("CY2024", "CY2025"):                       # CY2025 overwrites CY2024
        for tag in REV:
            f = E.frame(tag, period)
            for x in (f or {}).get("data", []):
                if not str(x.get("loc", "")).startswith("US"):
                    continue
                k = x["cik"]
                if k not in best or period == "CY2025" and best[k][1] != "CY2025" or (best[k][1] == period and x["val"] > best[k][0]):
                    best[k] = (x["val"], period, x["entityName"])
    tick = E.tickers()
    old_to_new = {o: c for c, olds in SPLICE.items() for o in olds}
    for o, new in old_to_new.items():                           # e.g. XOM: use the old CIK's revenue, the new CIK's ticker
        if o in best and new in tick:
            best[new] = best.pop(o)
    rows = [(k, v[0], v[2], tick[k]) for k, v in best.items() if k in tick]
    rows.sort(key=lambda r: -r[1])
    return rows[:n]


def annual(facts, tags, asof, flow):
    """{fiscal-year end: value} from 10-K FY data filed <= asof. All tags are merged (companies switch tags,
    e.g. Revenues -> RevenueFromContract...); per year the most recently filed value wins, so later 10-Ks'
    restated (split-adjusted) comparatives replace the originals."""
    g = facts.get("facts", {}).get("us-gaap", {})
    out = {}
    for t in tags:
        units = g.get(t, {}).get("units", {})
        vals = units.get("USD") or units.get("shares") or []
        for v in vals:
            if v.get("form") not in ("10-K", "10-K/A") or v.get("filed", "9999") > asof:
                continue
            if flow:
                if v.get("fp") != "FY" or "start" not in v:
                    continue
                days = (pd.Timestamp(v["end"]) - pd.Timestamp(v["start"])).days
                if not 330 <= days <= 400:
                    continue
            end = v["end"]
            if end not in out or v["filed"] > out[end][1]:        # latest restatement filed by asof, across tags
                out[end] = (v["val"], v["filed"])
    return {k: v[0] for k, v in sorted(out.items())}


def cagr(a, b, yrs):
    if a is None or b is None or a <= 0 or b <= 0 or yrs <= 0:
        return np.nan
    return (b / a) ** (1 / yrs) - 1


def _merge(a, b):
    """Splice companyfacts b (old CIK) under a (new CIK)."""
    for tax, tags in b.get("facts", {}).items():
        dst = a.setdefault("facts", {}).setdefault(tax, {})
        for t, v in tags.items():
            for u, vals in v.get("units", {}).items():
                dst.setdefault(t, {"units": {}})["units"].setdefault(u, []).extend(vals)
    return a


def shares_out(f, asof):
    """Cover-page shares outstanding (all classes) from the latest filing on or before asof."""
    v = [x for x in f.get("facts", {}).get("dei", {}).get("EntityCommonStockSharesOutstanding", {}).get("units", {}).get("shares", [])
         if x.get("filed", "9999") <= asof]
    if not v:
        return np.nan
    last = max(x["filed"] for x in v)
    if (pd.Timestamp(asof) - pd.Timestamp(last)).days > 200:      # stale cover data (e.g. CMCSA stops in 2010)
        return np.nan
    acc = {x["accn"] for x in v if x["filed"] == last}
    return float(sum(x["val"] for x in v if x["filed"] == last and x["accn"] in acc))


def metrics(cik, asof, ticker=None):
    f = E.facts(cik) or {}
    for o in SPLICE.get(cik, []):
        f = _merge(f, E.facts(o) or {})
    if not f.get("facts"):
        return None
    s = {k: annual(f, v, asof, k in FLOW) for k, v in TAGS.items()}
    ends = sorted(s["rev"])[-4:]
    if len(ends) < 2:
        return None
    last = ends[-1]

    def at(k, end=last):
        d = s[k]
        if end in d:
            return d[end]
        near = [e for e in d if abs((pd.Timestamp(e) - pd.Timestamp(end)).days) <= 15]
        return d[near[0]] if near else np.nan
    fcf = {e: at("ocf", e) - (at("capex", e) if at("capex", e) == at("capex", e) else 0) for e in ends}
    margin = [fcf[e] / at("rev", e) for e in ends if at("rev", e) and fcf[e] == fcf[e]]
    debt = np.nansum([at("debt"), at("debt_cur")])
    eq, cash, opinc = at("equity"), at("cash"), at("opinc")
    cash = 0 if cash != cash else cash
    ic = eq + debt - cash if eq == eq else np.nan
    yrs = (pd.Timestamp(last) - pd.Timestamp(ends[0])).days / 365.25
    da = at("da")
    ebitda = opinc + (da if da == da else 0) if opinc == opinc else np.nan
    net_debt = debt - cash
    m_prev = fcf[ends[-2]] / at("rev", ends[-2]) if at("rev", ends[-2]) else np.nan
    m_last = fcf[last] / at("rev") if at("rev") else np.nan
    swing = (m_prev == m_prev and m_last == m_last and (m_prev * m_last <= 0 or not 0.5 <= m_last / m_prev <= 2))
    filed = max((v.get("filed", "") for t in TAGS["rev"] for v in f["facts"].get("us-gaap", {}).get(t, {}).get("units", {}).get("USD", [])
                 if v.get("form") in ("10-K", "10-K/A") and v.get("filed", "9999") <= asof), default="")
    stale = not filed or (pd.Timestamp(asof) - pd.Timestamp(filed)).days > 456
    sh = s["shares"]
    sh_ends = [e for e in ends if e in sh]
    px = P.price_at(ticker, asof) if ticker else None
    so = shares_out(f, asof)
    if so != so:
        so = at("shares")                                     # fallback: diluted weighted shares, latest 10-K
    mcap = px * so if px and so == so else np.nan
    ev_ebit = (mcap + net_debt) / opinc if opinc == opinc and opinc > 0 and mcap == mcap else np.nan
    hist = []
    for e in ends[:-1]:
        pe, se, oe = (P.price_at(ticker, e) if ticker else None), at("shares", e), at("opinc", e)
        nd = np.nansum([at("debt", e), at("debt_cur", e)]) - (at("cash", e) if at("cash", e) == at("cash", e) else 0)
        if pe and se == se and oe == oe and oe > 0:
            hist.append(min((pe * se + nd) / oe, 60.0))       # cap: a near-zero-EBIT year would dominate
    return dict(
        price=px, mkt_cap=mcap, fcf_yield=fcf[last] / mcap if mcap == mcap and mcap > 0 else np.nan, ev_ebit=ev_ebit,
        ev_ebit_vs_hist=ev_ebit / np.median(hist) if hist and ev_ebit == ev_ebit and np.median(hist) > 0 else np.nan,
        fy_end=last, revenue=at("rev"), net_income=at("ni"), fcf=fcf[last], op_income=opinc,
        roic=(opinc * 0.79 / ic) if ic and ic == ic and ic > 0 and opinc == opinc else np.nan,
        roe=at("ni") / eq if eq and eq == eq and eq > 0 else np.nan,
        fcf_margin=fcf[last] / at("rev") if at("rev") else np.nan,
        fcf_margin_std=float(np.std(margin)) if len(margin) >= 3 else np.nan,
        rev_cagr=cagr(at("rev", ends[0]), at("rev"), yrs),
        fcf_cagr=cagr(fcf[ends[0]], fcf[last], yrs),
        net_debt=net_debt, ebitda=ebitda, last_10k_filed=filed,
        net_debt_fcf=net_debt / fcf[last] if fcf[last] and fcf[last] > 0 else np.nan,
        net_debt_ebitda=net_debt / ebitda if ebitda and ebitda == ebitda and ebitda > 0 else np.nan,
        debt_equity=debt / eq if eq and eq == eq and eq > 0 else np.nan,
        flag=("; ".join(x for x in ("FCF margin moved > 2x y/y" if swing else "", "last 10-K older than 15 months" if stale else "") if x)),
        dilution=(sh[sh_ends[-1]] / sh[sh_ends[0]] - 1) if len(sh_ends) >= 2 and sh[sh_ends[0]] else np.nan,
        years=len(ends),
    )


def pct(x, higher_better=True):
    r = x.rank(pct=True)
    return r if higher_better else 1 - r + 1 / len(x)


def balance(df, cap=20.0):
    """Leverage score in [0, 1]: the WORSE of net debt / FCF and (net debt / EBITDA, else debt / equity).
    FCF <= 0 or FCF margin < 1% -> the worst score. Net cash (net debt <= 0) with real FCF -> the best.
    Otherwise the ratio is capped at `cap` and ranked, lower is better."""
    def score(ratio, bad):
        r = ratio.clip(upper=cap)
        r = r.where(df["net_debt"] > 0, -1.0)                 # net cash: best
        r = r.where(~bad, cap * 10)                           # no real FCF / earnings: worst
        return 1 - r.rank(pct=True) + 1 / len(r)
    no_fcf = (df["fcf"] <= 0) | (df["fcf_margin"] < 0.01) | df["fcf"].isna()
    s1 = score(df["net_debt_fcf"], no_fcf)
    second = df["net_debt_ebitda"].where(df["net_debt_ebitda"].notna(), df["debt_equity"])
    s2 = score(second, second.isna() & (df["net_debt"] > 0) | (df["ebitda"] <= 0))
    return pd.concat([s1, s2], axis=1).min(axis=1)


def main(asof, n):
    t0 = time.time()
    uni = universe(n)
    rows = []
    for cik, rev, name, tk in uni:
        m = metrics(cik, asof, tk)
        sub = E.submissions(cik) or {}
        sic = str(sub.get("sic", "") or "")
        if m:
            rows.append(dict(ticker=tk, cik=cik, name=name, sic=sic, industry=sub.get("sicDescription", ""), **m))
    df = pd.DataFrame(rows)
    fin = df["sic"].str[:2].isin([str(i) for i in range(60, 68)])
    cap = df["ticker"].isin(CAPTIVE) | df["sic"].str.startswith(CAPTIVE_SIC)
    df["financial_or_reit"] = fin
    df["captive_finance"] = cap & ~fin
    fin = fin | cap
    q = pd.concat([pct(df["roic"]), pct(df["roe"]), pct(df["fcf_margin"]), pct(df["fcf_margin_std"], False)], axis=1).mean(axis=1)
    g = pd.concat([pct(df["rev_cagr"]), pct(df["fcf_cagr"])], axis=1).mean(axis=1)
    b = balance(df)
    dl = pct(df["dilution"], False)
    df["s_quality"], df["s_growth"], df["s_balance"], df["s_dilution"] = q, g, b, dl
    df["s_valuation"] = pd.concat([pct(df["fcf_yield"]), pct(df["ev_ebit_vs_hist"], False)], axis=1).mean(axis=1)
    df["composite"] = df[["s_quality", "s_growth", "s_balance", "s_dilution", "s_valuation"]].mean(axis=1, skipna=True)
    df.loc[fin, "composite"] = np.nan                            # FCF/ROIC metrics do not fit banks/insurers/REITs
    df = df.sort_values("composite", ascending=False)
    cols = ["ticker", "name", "industry", "flag", "composite", "s_quality", "s_growth", "s_balance", "s_dilution", "s_valuation", "roic", "roe",
            "fcf_yield", "ev_ebit", "ev_ebit_vs_hist", "price", "mkt_cap", "fcf_margin", "fcf_margin_std", "rev_cagr", "fcf_cagr", "net_debt_fcf", "dilution", "revenue", "fcf", "fy_end", "years", "sic",
            "net_debt_ebitda", "debt_equity", "last_10k_filed", "financial_or_reit", "captive_finance", "cik"]
    df[cols].to_csv(HERE / "screen.csv", index=False, float_format="%.4g")
    print(f"screen: {len(df)} names ({int(fin.sum())} financials/REITs unscored), as of {asof}, {time.time() - t0:.0f} s")
    print(df[cols[:9]].head(25).to_string(index=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--asof", default=pd.Timestamp.now().strftime("%Y-%m-%d"))
    ap.add_argument("--n", type=int, default=200)
    a = ap.parse_args()
    main(a.asof, a.n)
