"""Fundamental screen of US large caps from SEC EDGAR (code only). Writes screen.csv. PAPER research.

Universe: every filer in the SEC frames for annual revenue (CY2025, falling back to CY2024), US address, with a
ticker. The top 200 by revenue are kept, then each one's companyfacts gives up to 4 fiscal years of 10-K data. Only
values filed on or before the as-of date are used (point in time by filing date).
Scores, as percentile ranks within the universe (financials and REITs are flagged: FCF/ROIC do not fit them):
  quality   ROIC (NOPAT / (equity + debt - cash)), ROE, FCF margin, stability (-std of FCF margin)
  growth    3y revenue CAGR, 3y FCF CAGR
  balance   -(net debt / FCF)
  dilution  -(3y change in diluted shares)
  valuation FCF yield and EV/EBIT vs its own history: NEEDS PRICES (not on the allowed hosts yet); left blank
composite = mean of the available group scores.
  python3 screen.py [--asof 2026-11-27] [--n 200]
"""
import argparse
import math
import time

import numpy as np
import pandas as pd

import edgar as E

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
}
FLOW = {"rev", "ni", "opinc", "ocf", "capex", "shares"}


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


def metrics(cik, asof):
    f = E.facts(cik)
    if not f:
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
    sh = s["shares"]
    sh_ends = [e for e in ends if e in sh]
    return dict(
        fy_end=last, revenue=at("rev"), net_income=at("ni"), fcf=fcf[last], op_income=opinc,
        roic=(opinc * 0.79 / ic) if ic and ic == ic and ic > 0 and opinc == opinc else np.nan,
        roe=at("ni") / eq if eq and eq == eq and eq > 0 else np.nan,
        fcf_margin=fcf[last] / at("rev") if at("rev") else np.nan,
        fcf_margin_std=float(np.std(margin)) if len(margin) >= 3 else np.nan,
        rev_cagr=cagr(at("rev", ends[0]), at("rev"), yrs),
        fcf_cagr=cagr(fcf[ends[0]], fcf[last], yrs),
        net_debt_fcf=(debt - cash) / fcf[last] if fcf[last] and fcf[last] > 0 else np.nan,
        dilution=(sh[sh_ends[-1]] / sh[sh_ends[0]] - 1) if len(sh_ends) >= 2 and sh[sh_ends[0]] else np.nan,
        years=len(ends),
    )


def pct(x, higher_better=True):
    r = x.rank(pct=True)
    return r if higher_better else 1 - r + 1 / len(x)


def main(asof, n):
    t0 = time.time()
    uni = universe(n)
    rows = []
    for cik, rev, name, tk in uni:
        m = metrics(cik, asof)
        sub = E.submissions(cik) or {}
        sic = str(sub.get("sic", "") or "")
        if m:
            rows.append(dict(ticker=tk, cik=cik, name=name, sic=sic, industry=sub.get("sicDescription", ""), **m))
    df = pd.DataFrame(rows)
    fin = df["sic"].str[:2].isin([str(i) for i in range(60, 68)])
    df["financial_or_reit"] = fin
    q = pd.concat([pct(df["roic"]), pct(df["roe"]), pct(df["fcf_margin"]), pct(df["fcf_margin_std"], False)], axis=1).mean(axis=1)
    g = pd.concat([pct(df["rev_cagr"]), pct(df["fcf_cagr"])], axis=1).mean(axis=1)
    b = pct(df["net_debt_fcf"], False)
    dl = pct(df["dilution"], False)
    df["s_quality"], df["s_growth"], df["s_balance"], df["s_dilution"] = q, g, b, dl
    df["s_valuation"] = np.nan                                   # needs prices
    df["composite"] = df[["s_quality", "s_growth", "s_balance", "s_dilution", "s_valuation"]].mean(axis=1, skipna=True)
    df.loc[fin, "composite"] = np.nan                            # FCF/ROIC metrics do not fit banks/insurers/REITs
    df = df.sort_values("composite", ascending=False)
    cols = ["ticker", "name", "industry", "composite", "s_quality", "s_growth", "s_balance", "s_dilution", "s_valuation", "roic", "roe",
            "fcf_margin", "fcf_margin_std", "rev_cagr", "fcf_cagr", "net_debt_fcf", "dilution", "revenue", "fcf", "fy_end", "years", "sic",
            "financial_or_reit", "cik"]
    df[cols].to_csv(HERE / "screen.csv", index=False, float_format="%.4g")
    print(f"screen: {len(df)} names ({int(fin.sum())} financials/REITs unscored), as of {asof}, {time.time() - t0:.0f} s")
    print(df[cols[:9]].head(25).to_string(index=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--asof", default=pd.Timestamp.now().strftime("%Y-%m-%d"))
    ap.add_argument("--n", type=int, default=200)
    a = ap.parse_args()
    main(a.asof, a.n)
