"""Phase 1: run every strategy in-sample, pick ONE by in-sample Sharpe, then
run everything out-of-sample once and write reports/phase1.md + equity.png."""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import strategies as S
from data import load_panels
from engine import COST, Result, metrics, simulate
from universe import INDEX, TICKERS

OUT = Path(__file__).parent / "reports"
IS = ("2016-01-01", "2023-12-31")
OOS = ("2024-01-01", "2099-12-31")
DD = 0.15  # drawdown stop: 15% below peak -> cash for 21 trading days

idx, P, missing = load_panels(INDEX, TICKERS)
P = S.prepare(P)
ic = idx["close"]

# name -> (family, factory). A factory builds a fresh decide() for each run.
VARIANTS = {
    "Momentum 6m top5":        ("Momentum", lambda: S.momentum(P, 126, 5)),
    "Momentum 6m top10":       ("Momentum", lambda: S.momentum(P, 126, 10)),
    "Momentum 12m top10":      ("Momentum", lambda: S.momentum(P, 252, 10)),
    "Trend SMA200 (EW all)":   ("Trend",    lambda: S.trend(P, ic, 200)),
    "Trend SMA100 (EW all)":   ("Trend",    lambda: S.trend(P, ic, 100)),
    "Trend SMA200 + Mom12m10": ("Trend",    lambda: S.trend(P, ic, 200, S.momentum(P, 252, 10))),
    "MeanRev 5d top5":         ("MeanRev",  lambda: S.mean_reversion(P, 5, 5)),
    "MeanRev 5d top10":        ("MeanRev",  lambda: S.mean_reversion(P, 5, 10)),
    "MeanRev 10d top10":       ("MeanRev",  lambda: S.mean_reversion(P, 10, 10)),
    "LowVol 60d top10":        ("LowVol",   lambda: S.low_vol(P, 60, 10)),
    "LowVol 250d top10":       ("LowVol",   lambda: S.low_vol(P, 250, 10)),
    "LowVol 250d top15":       ("LowVol",   lambda: S.low_vol(P, 250, 15)),
}


def index_bh(start, end, capital=100_000.0):
    """SET50 price index, bought once (one-side cost). Dividends NOT included."""
    s = ic[(ic.index >= start) & (ic.index <= end)]
    eq = capital * (1 - COST) * s / s.iloc[0]
    return Result("SET50 index B&H (price only)", eq, trades=[None], costs=capital * COST,
                  traded_value=capital)


def run_period(period, names):
    rows, curves = [], {}
    for b in (index_bh(*period),
              simulate("Equal-weight SET50 stocks B&H (with dividends)",
                       S.buy_and_hold_equal(P), P, *period)):
        rows.append({"family": "Benchmark", **metrics(b)}); curves[b.name] = b.equity
    for n in names:
        fam, make = VARIANTS[n]
        for stop in (None, DD):
            label = n + (" +DDstop" if stop else "")
            r = simulate(label, make(), P, *period, dd_stop=stop)
            rows.append({"family": fam, **metrics(r)}); curves[label] = r.equity
            if period == OOS:
                trades[label] = r.trades
    return pd.DataFrame(rows), curves


def fmt(df):
    t = df.copy()
    for c in ("total", "cagr", "maxdd", "vol"):
        t[c] = (t[c] * 100).map("{:+.1f}%".format)
    t["sharpe"] = t["sharpe"].map("{:.2f}".format)
    t["turnover"] = t["turnover"].map("{:.1f}x/yr".format)
    t["costs"] = t["costs"].map("{:,.0f}".format)
    t = t.rename(columns={"total": "Total", "cagr": "CAGR", "maxdd": "Max DD", "vol": "Vol",
                          "sharpe": "Sharpe", "trades": "Trades", "turnover": "Turnover",
                          "costs": "Costs THB", "stops": "DD stops"})
    return t.to_markdown(index=False)


if __name__ == "__main__":
    trades = {}
    is_df, is_curves = run_period(IS, list(VARIANTS))
    cand = is_df[is_df.family != "Benchmark"]
    best = cand.sort_values("sharpe", ascending=False).iloc[0]["strategy"]
    print("Chosen in-sample:", best)
    # Out-of-sample: run every variant once, exactly as defined above.
    oos_df, oos_curves = run_period(OOS, list(VARIANTS))
    is_df.to_csv(OUT / "phase1_in_sample.csv", index=False)
    oos_df.to_csv(OUT / "phase1_out_of_sample.csv", index=False)
    pd.DataFrame([(k, *t) for k, v in trades.items() for t in v],
                 columns=["strategy", "date", "ticker", "side", "shares", "price", "cost"]
                 ).to_csv(OUT / "phase1_oos_trades.csv", index=False)

    # Chart: growth of 100,000 THB; OOS restarts from cash on 2024-01-02 and
    # is chained onto the in-sample end value so the lines are continuous.
    bm = ["SET50 index B&H (price only)", "Equal-weight SET50 stocks B&H (with dividends)"]
    fig, ax = plt.subplots(figsize=(11, 5.5), dpi=150)
    colors = {best: "#c2410c", bm[0]: "#475569", bm[1]: "#0f766e"}
    for k in [best] + bm:
        a, b = is_curves[k], oos_curves[k]
        chained = pd.concat([a, b / b.iloc[0] * a.iloc[-1]])
        ax.plot(chained.index, chained.values, lw=2 if k == best else 1.4,
                color=colors[k], label=("Chosen: " + k) if k == best else k)
    ax.axvspan(pd.Timestamp(OOS[0]), oos_curves[best].index[-1], color="#e5e7eb", alpha=0.6,
               lw=0, label="Out-of-sample (2024 → today)")
    ax.set_title("Paper backtest, SET50 stocks, after costs (0.22% per side)", loc="left")
    ax.set_ylabel("Portfolio value (THB, start 100,000)")
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
    ax.grid(alpha=0.3); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=9, loc="upper left")
    fig.tight_layout(); fig.savefig(OUT / "equity.png")

    with open(OUT / "_tables.md", "w") as f:
        f.write(f"Chosen (best in-sample Sharpe): **{best}**\n\n")
        f.write(f"Tickers missing from Yahoo: {missing or 'none'}\n\n")
        f.write(f"Data: {idx.index[0].date()} to {idx.index[-1].date()}\n\n")
        f.write("### In-sample 2016-2023\n\n" + fmt(is_df) + "\n\n")
        f.write(f"### Out-of-sample 2024-01-01 to {idx.index[-1].date()}\n\n" + fmt(oos_df) + "\n")
    print(open(OUT / "_tables.md").read())
