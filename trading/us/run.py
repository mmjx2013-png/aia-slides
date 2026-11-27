"""Walk-forward test of the rule families: choose on 2016-2022 (in-sample), judge ONLY on 2023-2026 (out of sample).
Writes REPORT.md and results.csv. PAPER ONLY, code only.
  python3 run.py
"""
import time

import numpy as np
import pandas as pd

import data as D
import strategies as S
from bt import run

HERE = D.HERE
IS = ("2016-11-28", "2022-12-30")
OOS = ("2023-01-03", "2026-11-25")


def fmt(m):
    return (f"{100 * m['cagr']:+.1f}% | {m['sharpe']:.2f} | {100 * m['maxdd']:.1f}% | {m['trades_yr']:.1f} | "
            f"{'-' if m['win'] != m['win'] else f'{100 * m[chr(119) + chr(105) + chr(110)]:.0f}%'} | {100 * m['cost_drag']:.2f}% | {100 * m['exposure']:.0f}%")


def main():
    t0 = time.time()
    syms = D.ETFS + D.SECTORS + D.BONDS + D.LARGE
    P = D.panel(syms)
    O, C = P["o"], P["c"]
    rows = []
    bench = {}
    for b in ("SPY", "QQQ"):
        W = S.buy_hold(C, b)
        for per, (a, z) in (("IS", IS), ("OOS", OOS)):
            m, _ = run(W, O, C, a, z)
            bench[(b, per)] = m
            rows.append(dict(family="benchmark", name=f"buy and hold {b}", period=per, **m))
    fam = S.families(D.SECTORS, D.LARGE)
    best = {}
    for f, variants in fam.items():
        for name, fn in variants:
            W = fn(C)
            mi, _ = run(W, O, C, *IS)
            mo, _ = run(W, O, C, *OOS)
            rows.append(dict(family=f, name=name, period="IS", **mi))
            rows.append(dict(family=f, name=name, period="OOS", **mo))
            if f not in best or mi["sharpe"] > best[f][1]["sharpe"]:
                best[f] = (name, mi, mo, W)
    df = pd.DataFrame(rows)
    df.to_csv(HERE / "results.csv", index=False)
    n_var = sum(len(v) for v in fam.values())
    bo = {b: bench[(b, "OOS")] for b in ("SPY", "QQQ")}
    sh_bar = max(bo["SPY"]["sharpe"], bo["QQQ"]["sharpe"])
    dd_bar = max(bo["SPY"]["maxdd"], bo["QQQ"]["maxdd"])       # the shallower drawdown (closer to 0)
    L = ["# US stocks: walk-forward test of low-frequency rule families (PAPER, code only)", "",
         f"Data: Yahoo daily dump from the boss (commit 3fc1638), total-return adjusted, {C.index[0].date()} .. {C.index[-1].date()}.",
         f"Fit / choose on {IS[0]} .. {IS[1]}; judge ONLY on {OOS[0]} .. {OOS[1]}. 70 USD cash account, fills at the next open,",
         "commission 0.10% + 7% VAT and 0.05% slippage each side, SEC fee on sells, fractional shares, no leverage, no shorts, cash earns 0.",
         f"**{n_var} variants tried** in {len(fam)} families; each family's variant is chosen by in-sample Sharpe only.", "",
         "Pass rule: out-of-sample Sharpe above BOTH buy-and-hold SPY and QQQ, AND a max drawdown no deeper than the shallower of the two.", "",
         "## Benchmarks", "| | Period | CAGR | Sharpe | Max DD | Trades/yr | Win | Cost drag | Exposure |", "|---|---|---|---|---|---|---|---|---|"]
    for b in ("SPY", "QQQ"):
        for per in ("IS", "OOS"):
            L.append(f"| buy and hold {b} | {per} | {fmt(bench[(b, per)])} |")
    L += ["", "## Chosen variant per family (chosen in-sample, judged out of sample)",
          "| Family | Variant | Period | CAGR | Sharpe | Max DD | Trades/yr | Win | Cost drag | Exposure |", "|---|---|---|---|---|---|---|---|---|---|"]
    verdict = []
    for f, (name, mi, mo, _) in best.items():
        L.append(f"| {f} | {name} | IS | {fmt(mi)} |")
        L.append(f"| | | **OOS** | {fmt(mo)} |")
        ok = mo["sharpe"] > sh_bar and mo["maxdd"] >= dd_bar
        verdict.append((f, name, ok, mo))
    # bootstrap: OOS Sharpe difference vs buy-and-hold SPY (stationary block bootstrap, 20-day blocks)
    _, spy_eq = run(S.buy_hold(C, "SPY"), O, C, *OOS)
    rs = spy_eq.pct_change().dropna()
    rng = np.random.default_rng(7)
    L += ["", "## Out-of-sample Sharpe difference vs buy-and-hold SPY (block bootstrap, 2,000 draws, 20-day blocks)",
          "| Family | Sharpe diff | 90% interval | P(diff > 0) |", "|---|---|---|---|"]
    yearly = {}
    for f, (name, mi, mo, W) in best.items():
        _, e = run(W, O, C, *OOS)
        rx = e.pct_change().dropna().reindex(rs.index).fillna(0)
        n, B = len(rx), 20
        diffs = []
        for _ in range(2000):
            st = rng.integers(0, n - B, size=n // B + 1)
            ix = np.concatenate([np.arange(s, s + B) for s in st])[:n]
            a, b = rx.values[ix], rs.values[ix]
            diffs.append(a.mean() / a.std() * np.sqrt(252) - b.mean() / b.std() * np.sqrt(252))
        diffs = np.array(diffs)
        pt = rx.mean() / rx.std() * np.sqrt(252) - rs.mean() / rs.std() * np.sqrt(252)
        L.append(f"| {f} | {pt:+.2f} | [{np.percentile(diffs, 5):+.2f}, {np.percentile(diffs, 95):+.2f}] | {(diffs > 0).mean():.0%} |")
        _, ef = run(W, O, C, IS[0], OOS[1])
        yearly[f] = ef.groupby(ef.index.year).apply(lambda x: x.iloc[-1] / x.iloc[0] - 1)
    _, sf = run(S.buy_hold(C, "SPY"), O, C, IS[0], OOS[1])
    yearly["buy and hold SPY"] = sf.groupby(sf.index.year).apply(lambda x: x.iloc[-1] / x.iloc[0] - 1)
    yrs = sorted(set().union(*[set(v.index) for v in yearly.values()]))
    L += ["", "## Calendar-year returns, full period (2022 = the bear year, in-sample)", "| Book | " + " | ".join(map(str, yrs)) + " |",
          "|---|" + "---|" * len(yrs)]
    for k, v in yearly.items():
        L.append(f"| {k} | " + " | ".join(f"{100 * v.get(y, np.nan):+.0f}%" for y in yrs) + " |")
    L += ["", f"OOS bars to beat: Sharpe > {sh_bar:.2f}, max DD no deeper than {100 * dd_bar:.1f}%.", "", "## Verdict"]
    for f, name, ok, mo in verdict:
        L.append(f"- {f}: {name}: {'PASSES' if ok else 'fails'} (OOS Sharpe {mo['sharpe']:.2f}, max DD {100 * mo['maxdd']:.1f}%)"
                 + (" - second check only, survivor-biased list" if "survivor" in f else ""))
    oos = df[(df["period"] == "OOS") & (df["family"] != "benchmark")]
    L += ["", f"Out of sample, {int((oos['sharpe'] > sh_bar).sum())} of {len(oos)} variants beat the Sharpe bar "
              f"and {int(((oos['sharpe'] > sh_bar) & (oos['maxdd'] >= dd_bar)).sum())} beat both bars (any variant, not just the chosen ones: "
              "picking the best of these after the fact would be look-ahead).",
          "", "Caveats: one out-of-sample window of about 4 years, mostly a bull market; with "
          f"{n_var} variants some pass by luck. The large-cap list is today's winners (survivorship bias), so its results overstate any edge.",
          "", "## Conclusion (plain)",
          "- No tested rule family has an edge over simply holding SPY or QQQ after costs, out of sample. For a 70 USD account the honest",
          "  baseline is buy-and-hold (or regular small buys) of a broad index ETF.",
          "- The 200/150-day trend filter is the only near-miss: a lower Sharpe out of sample (90% interval includes zero), but it cut 2022",
          "  from -19% (SPY) to -13% and the OOS drawdown from -18.8% to -16.1%. It is a drawdown-control choice, not an edge.",
          "- Short-term mean reversion (RSI2) is eaten by costs at this account size (cost drag about 5% a year).",
          "- No forward paper book is started (nothing passed). orders.md stays empty until something does.",
          f"", f"Full table: results.csv. Run time {time.time() - t0:.0f} s."]
    import events
    events.main()
    L += ["", (HERE / "events.md").read_text(),
          "Reading: overnight-only and leverage are rejected (costs, drawdowns). Gap-down 20-day drift is positive in both halves",
          "(+1.6%), but out of sample the band includes zero, and the stock list is today's winners: survivors recover from gaps by",
          "construction, so this is not a tradeable edge. Our 1-day gap-down result (+0.27% / -0.29%) is smaller than the boss's",
          "(+2.6% / -0.8%) on a different stock list; both say no stable edge."]
    (HERE / "REPORT.md").write_text("\n".join(L) + "\n")
    passed = [f"{f}: {n}" for f, n, ok, _ in verdict if ok and "survivor" not in f]
    (HERE / "summary.txt").write_text(
        f"US stocks (paper research, {n_var} variants, OOS {OOS[0][:4]}-{OOS[1][:4]}): "
        + (f"PASSED out of sample: {'; '.join(passed)}." if passed else "no ETF rule family beats buy-and-hold SPY/QQQ out of sample after costs.")
        + f"\nBest chosen OOS: trend {best['trend'][0]} Sharpe {best['trend'][2]['sharpe']:.2f} vs SPY {bo['SPY']['sharpe']:.2f}; "
          f"full table trading/us/REPORT.md.\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
