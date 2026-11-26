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
                best[f] = (name, mi, mo)
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
    for f, (name, mi, mo) in best.items():
        L.append(f"| {f} | {name} | IS | {fmt(mi)} |")
        L.append(f"| | | **OOS** | {fmt(mo)} |")
        ok = mo["sharpe"] > sh_bar and mo["maxdd"] >= dd_bar
        verdict.append((f, name, ok, mo))
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
          f"", f"Full table: results.csv. Run time {time.time() - t0:.0f} s."]
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
