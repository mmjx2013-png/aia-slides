"""The AI trading desk: code builds the briefs and enforces the risk rules;
the analysts and the portfolio manager are Claude models (run as subagents).

Roles
- News analyst (sonnet): reads headlines, writes one flag per ticker.
- Chart analyst (sonnet): reads the indicator table, writes a short view per ticker.
- Portfolio manager (opus): reads both notes + the portfolio, returns target weights.
- Risk manager (this code): caps every PM answer; it cannot be talked out of it.
"""
import json
from pathlib import Path

import pandas as pd

import indicators as I
import news as N

ROOT = Path(__file__).parent
PROMPTS = ROOT / "prompts"
MAX_POS, MAX_W = 10, 0.20

# Columns shown in percent (x100, 1 decimal); the rest are rounded to 1 decimal.
PCT = {"ret_1w", "ret_1m", "ret_3m", "ret_6m", "ret_12m", "mom_12_1", "dist_sma10",
       "dist_sma20", "dist_sma50", "dist_sma100", "dist_sma200", "dist_ema20",
       "sma50_over_200", "sma200_slope_20d", "macd_pct", "macd_hist_pct",
       "ichi_tenkan_kijun", "ichi_above_cloud", "roc10", "vol20", "vol60", "atr14_pct",
       "bb_width", "dd_52w_high", "from_52w_low", "rel_ret_3m"}


def indicator_frames(P, idx_df):
    frames = {}
    for t in P["close"].columns:
        df = pd.DataFrame({k: P[src][t] for k, src in
                           (("open", "open"), ("high", "high"), ("low", "low"),
                            ("close", "close"), ("volume", "volume"), ("adjclose", "adj"))}
                          ).dropna(subset=["close"])
        frames[t] = I.compute(df, idx_df["close"])
    ix = idx_df.copy()
    ix["adjclose"] = ix["close"]
    ix["volume"] = ix["volume"].fillna(0)
    frames["SET50_INDEX"] = I.compute(ix)
    return frames


def indicator_table(frames, day):
    rows = {t: f.loc[day] for t, f in frames.items() if day in f.index}
    df = pd.DataFrame(rows).T
    for c in df.columns:
        df[c] = (df[c] * 100 if c in PCT else df[c]).round(1)
    return df.to_csv()


def news_brief(day, tickers, lookback_days=7, live=False):
    """Headlines published BEFORE `day` (the decision date's next calendar day
    for live runs, the decision date itself for past tests)."""
    before = (pd.Timestamp(day) + pd.Timedelta(days=1 if live else 0)).strftime("%Y-%m-%d")
    after = (pd.Timestamp(day) - pd.Timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    parts = ["## Market"]
    parts.append(N.brief(N.market_news(10) if live else N.market_news(10, after, before)))
    for t in tickers:
        items = N.ticker_news(t, after, before, n=5)
        if items:
            parts.append(f"## {t}\n" + N.brief(items))
    return "\n".join(parts)


def portfolio_text(cash, holdings, prices, avg_cost, equity, peak):
    lines = [f"Equity {equity:,.0f} THB, cash {cash:,.0f} ({cash / equity:.0%}), "
             f"drawdown from peak {equity / peak - 1:+.1%}"]
    for t, n in sorted(holdings.items()):
        px = prices[t]
        lines.append(f"{t}: {n} sh, weight {n * px / equity:.1%}, "
                     f"P&L vs avg cost {px / avg_cost.get(t, px) - 1:+.1%}")
    return "\n".join(lines) if holdings else lines[0] + "\nNo positions."


def risk_check(answer, universe):
    """Turn the PM's JSON into safe target weights. Returns (weights, notes)."""
    notes = []
    raw = answer.get("targets", {}) if isinstance(answer, dict) else {}
    w = {}
    for t, x in raw.items():
        t = str(t).upper().replace(".BK", "")
        try:
            x = float(x)
        except (TypeError, ValueError):
            notes.append(f"dropped {t}: weight not a number"); continue
        if t not in universe:
            notes.append(f"dropped {t}: not in universe"); continue
        if x <= 0:
            continue
        if x > MAX_W:
            notes.append(f"{t} capped {x:.0%} -> {MAX_W:.0%}"); x = MAX_W
        w[t] = x
    if len(w) > MAX_POS:
        keep = sorted(w, key=w.get, reverse=True)[:MAX_POS]
        notes.append(f"kept the {MAX_POS} largest of {len(w)} positions")
        w = {t: w[t] for t in keep}
    s = sum(w.values())
    if s > 1:
        notes.append(f"weights summed to {s:.2f}; scaled to 1.00")
        w = {t: x / s for t, x in w.items()}
    return w, notes


def parse_json(path):
    """Read a model's JSON answer, tolerating code fences around it."""
    txt = Path(path).read_text().strip()
    if txt.startswith("```"):
        txt = txt.strip("`").split("\n", 1)[1]
    a, b = txt.find("{"), txt.rfind("}")
    return json.loads(txt[a:b + 1])
