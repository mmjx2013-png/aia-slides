"""Gold Phase 1: rule yardsticks, leverage study, Monte Carlo goal check.
Writes reports/gold_tables.md, gold_equity.png, gold_leverage.png, gold_mc.csv."""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import gold as G

OUT = Path(__file__).parent / "reports"
IS = ("2017-01-01", "2023-12-31")
OOS = ("2024-01-01", "2099-12-31")
LEVS = (1, 3, 10, 30, 100)
CAP_USD = 10_000.0
TARGET = 1_000_000.0
N_PATHS, BLOCK, DAYS = 10_000, 21, 252

d = G.daily()
h = G.hourly()
fx = json.loads((G.GD / "USDTHB_daily.json").read_text())["chart"]["result"][0]["meta"]["regularMarketPrice"]
SIGS = G.rules(d)


def pct(x):
    return f"{x * 100:+.1f}%"


def row(name, st):
    return {"strategy": name, "final USD": f"{st['final']:,.0f}", "total": pct(st["total"]),
            "CAGR": pct(st["cagr"]), "max DD": pct(st["maxdd"]), "vol": pct(st["vol"]),
            "Sharpe": f"{st['sharpe']:.2f}", "trades": st["trades"],
            "costs USD": f"{st['costs']:,.0f}", "financing USD": f"{st['financing']:,.0f}",
            "liquidated": st["liquidated"], "days under water": st["days_under_water"]}


def run_daily(sig, period, lev=1):
    bars = d[(d.index >= period[0]) & (d.index <= period[1])]
    res = G.simulate(bars, G.daily_fills(sig, d).reindex(bars.index), lev, CAP_USD)
    return res, G.stats(res, CAP_USD)


# ---- 1) rules at 1x, in-sample then out-of-sample ----------------------
tabs, curves = {}, {}
for per, lab in ((IS, "is"), (OOS, "oos")):
    rows = []
    for name, sig in SIGS.items():
        res, st = run_daily(sig, per)
        rows.append({**row(name, st), "_sharpe": st["sharpe"]})
        curves[(lab, name)] = res["equity"]
    tabs[lab] = pd.DataFrame(rows)
cand = tabs["is"][~tabs["is"].strategy.str.startswith("Buy")]
BEST = cand.sort_values("_sharpe", ascending=False).iloc[0]["strategy"]

# ---- 2) leverage study on 1h bars (Jul 2024 -> today) ------------------
lev_rows, lev_curves = [], {}
h0 = h.index[0]
for name in ("Buy & hold (long 1x)", BEST):
    sig = SIGS[name][SIGS[name].index >= h0.normalize() - pd.Timedelta(days=1)]
    fills = G.hourly_fills(sig, h)
    bars = h[h.index >= fills.index[0]]
    for L in LEVS:
        res = G.simulate(bars, fills, L, CAP_USD)
        st = G.stats(res, CAP_USD)
        lev_rows.append({"decisions": name.replace(" (long 1x)", ""), "leverage": f"{L}x",
                         **{k: v for k, v in row(name, st).items() if k != "strategy"}})
        lev_curves[(name, L)] = res["equity"]

# ---- 3) Monte Carlo: block bootstrap of daily (return, worst intraday move) --


def daily_records(sig):
    """1x daily return of the strategy (after spread on switch days) and the
    worst intraday move against the position, both from the previous close."""
    pos = sig.shift(1).reindex(d.index).fillna(0.0)          # held during day t
    c, lo, hi = d["close"], d["low"], d["high"]
    r = pos * (c / c.shift() - 1)
    switch = (pos != pos.shift()).astype(float) * (pos - pos.shift()).abs()
    r -= switch * G.SPREAD / c.shift()
    adverse = np.where(pos > 0, pos * (lo / c.shift() - 1),
                       np.where(pos < 0, -pos * (hi / c.shift() - 1) * -1, 0.0))
    adverse = np.minimum(adverse, 0.0)
    df = pd.DataFrame({"r": r, "a": adverse, "pos": pos.abs()}).dropna()
    return df[df.index >= IS[0]]


def monte_carlo(rec, L, rng):
    r, a, p = rec["r"].to_numpy(), rec["a"].to_numpy(), rec["pos"].to_numpy()
    n = len(r)
    starts = rng.integers(0, n - BLOCK, size=(N_PATHS, DAYS // BLOCK + 1))
    idx = (starts[:, :, None] + np.arange(BLOCK)).reshape(N_PATHS, -1)[:, :DAYS]
    R, A, P = r[idx], a[idx], p[idx]
    fin = (G.FIN * L * P * 1.45 / 365) if L > 1 else 0.0       # ~1.45 calendar days per trading day
    liq_day = (L * A <= -G.STOP_OUT)                            # equity hits 50% of margin
    growth = 1 + L * R - fin
    growth = np.where(liq_day, (1 - G.STOP_OUT) * 0.98, growth)  # stop-out fill, a bit of slippage
    alive = np.cumprod(~liq_day, axis=1).astype(bool)
    first_dead = np.where(alive.all(axis=1), DAYS, (~alive).argmax(axis=1))
    growth = np.where(np.arange(DAYS)[None, :] > first_dead[:, None], 1.0, growth)
    path = np.cumprod(np.maximum(growth, 0.0), axis=1)
    return path, first_dead < DAYS


rng = np.random.default_rng(42)
mc_rows = []
for name in ("Buy & hold (long 1x)", BEST):
    rec = daily_records(SIGS[name])
    for L in LEVS:
        path, liq = monte_carlo(rec, L, rng)
        final, peak, low = path[:, -1], path.max(axis=1), path.min(axis=1)
        for cap_lab, cap in (("100k THB", 100_000 / fx), ("10k USD", 10_000.0)):
            need = TARGET / cap
            mc_rows.append({
                "decisions": name.replace(" (long 1x)", ""), "leverage": f"{L}x", "start": cap_lab,
                "start USD": f"{cap:,.0f}", "multiple needed": f"{need:,.0f}x",
                "P(end >= 1M USD)": f"{(final >= need).mean():.2%}",
                "P(touch 1M any time)": f"{(peak >= need).mean():.2%}",
                "P(liquidated)": f"{liq.mean():.1%}",
                "P(ruin: liquidated or -90%)": f"{(liq | (low <= 0.10)).mean():.1%}",
                "median end USD": f"{np.median(final) * cap:,.0f}",
                "5th pct USD": f"{np.percentile(final, 5) * cap:,.0f}",
                "95th pct USD": f"{np.percentile(final, 95) * cap:,.0f}",
                "best path USD": f"{final.max() * cap:,.0f}"})
mc = pd.DataFrame(mc_rows)
mc.to_csv(OUT / "gold_mc.csv", index=False)

# ---- charts --------------------------------------------------------------
fig, ax = plt.subplots(figsize=(11, 5.5), dpi=150)
for name, col in (("Buy & hold (long 1x)", "#b45309"), (BEST, "#1d4ed8")):
    a, b = curves[("is", name)], curves[("oos", name)]
    ch = pd.concat([a, b / b.iloc[0] * a.iloc[-1]])
    ax.plot(ch.index, ch.values, color=col, lw=2 if name == BEST else 1.4,
            label=("Chosen rule: " + name) if name == BEST else "Gold buy & hold (1x)")
ax.axvspan(pd.Timestamp(OOS[0]), d.index[-1], color="#e5e7eb", alpha=0.6, lw=0,
           label="Out-of-sample (2024 → today)")
ax.set_yscale("log")
ax.set_title("Gold (GC=F), paper, 1x, after spread — growth of 10,000 USD", loc="left")
ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
ax.grid(alpha=0.3, which="both"); ax.spines[["top", "right"]].set_visible(False)
ax.legend(frameon=False, fontsize=9, loc="upper left"); fig.tight_layout()
fig.savefig(OUT / "gold_equity.png"); plt.close(fig)

fig, axs = plt.subplots(1, 2, figsize=(13, 5), dpi=150, sharey=True)
cols = dict(zip(LEVS, ["#0f172a", "#1d4ed8", "#7c3aed", "#db2777", "#dc2626"]))
for ax, name in zip(axs, ("Buy & hold (long 1x)", BEST)):
    for L in LEVS:
        e = lev_curves[(name, L)]
        ax.plot(e.index, e.clip(lower=1).values, color=cols[L], lw=1.3, label=f"{L}x")
        dead = e.index[(e == e.iloc[-1]).to_numpy()][0] if e.iloc[-1] < CAP_USD * 0.5 else None
    ax.set_yscale("log"); ax.set_title(("Buy & hold" if name.startswith("Buy") else name)
                                       + ": 10,000 USD at each leverage (1h bars)", loc="left", fontsize=10)
    ax.axhline(CAP_USD, color="#94a3b8", lw=0.8, ls="--")
    ax.grid(alpha=0.3, which="both"); ax.spines[["top", "right"]].set_visible(False)
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
import matplotlib.dates as mdates
for ax in axs:
    ax.xaxis.set_major_locator(mdates.MonthLocator(bymonth=(1, 7)))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
axs[0].legend(frameon=False, fontsize=9, title="Leverage"); fig.tight_layout()
fig.savefig(OUT / "gold_leverage.png"); plt.close(fig)

with open(OUT / "gold_tables.md", "w") as f:
    f.write(f"Data: GC=F daily {d.index[0].date()} to {d.index[-1].date()}; 1h from {h.index[0]:%Y-%m-%d}.\n")
    f.write(f"USD/THB used: {fx:.2f} (Yahoo THB=X, 25 Nov 2026). 100,000 THB = {100_000 / fx:,.0f} USD.\n\n")
    f.write(f"Chosen rule (best in-sample Sharpe, buy & hold excluded): **{BEST}**\n\n")
    for lab, title in (("is", "In-sample 2017-2023 (1x, daily)"), ("oos", f"Out-of-sample 2024 to {d.index[-1].date()} (1x, daily)")):
        f.write(f"### {title}\n\n" + tabs[lab].drop(columns="_sharpe").to_markdown(index=False) + "\n\n")
    f.write(f"### Leverage study, 1h bars, {h.index[0]:%Y-%m-%d} to {h.index[-1]:%Y-%m-%d}, start 10,000 USD\n\n")
    f.write(pd.DataFrame(lev_rows).to_markdown(index=False) + "\n\n")
    f.write(f"### Monte Carlo goal check: {N_PATHS:,} paths x 1 year, {BLOCK}-day blocks from 2017-2026 daily history\n\n")
    f.write(mc.to_markdown(index=False) + "\n")
print(open(OUT / "gold_tables.md").read())
