"""Feedback loop for the AI swing desk (code only; PAPER). Cheap: no LLM calls here.

1. resolve(): every DECISION's best_idea (holds included) is resolved on 1m bars from the decision time up to NOW:
   target first, stop first (a tie counts as the stop), or "neither" after 72 h (R marked at the 72 h close).
   Stored in learn/ideas.csv with MFE/MAE in R and context tags: 4h trend, distance to the nearest key level in
   ATR(4h), Bangkok session, ADX(4h), and whether a USD High event fell within 6 h.
2. p_cal(p): calibrated probability. With fewer than 30 resolved ideas, each p bucket is shrunk toward the base
   rate: p_cal = (n * hit + 10 * base) / (n + 10), where the base rate is itself shrunk toward a 0.30 prior the same way. From 30 resolved ideas on, isotonic regression (pool adjacent
   violators). The entry gate and risk sizing use p_cal, never raw p; both are logged.
3. block(): the track-record block for the Opus brief (<= 350 tokens): calibration by bucket, the last 8 resolved
   ideas, and up to 3 lessons that pass the code check (n >= 5 and a hit-rate gap >= 20 points).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

import env  # noqa: F401
from common import bkk, jlines, load_cache

HERE = env.HERE
LEARN = HERE / "learn"
IDEAS = LEARN / "ideas.csv"
LESSONS = LEARN / "lessons.json"
INDICATORS = LEARN / "indicator_summary.txt"   # written by trading/intraday/research/indicator_scorecard.py
JOURNAL = HERE / "data" / "books" / "ai" / "journal.jsonl"
BRIEFS = HERE / "data" / "books" / "ai" / "briefs"
COST = 0.35
HORIZON_MS = 72 * 3_600_000
BUCKETS = ((0.0, 0.35, "<0.35"), (0.35, 0.45, "0.35-0.45"), (0.45, 0.55, "0.45-0.55"), (0.55, 1.01, ">0.55"))
PRIOR_BASE = 0.30          # before any resolved idea: the earlier replay's realised target-first rate (0.25), rounded up
SHRINK_K, ISO_MIN = 10, 30


def session(t_ms):
    h = bkk(t_ms).hour + bkk(t_ms).minute / 60
    return "Asia 07-14" if 7 <= h < 14 else "Europe 14-20" if 14 <= h < 20 else "US 20-03:30" if (h >= 20 or h < 3.5) else "late 03:30-07"


def tags(t_ms, wid, px):
    f = BRIEFS / f"{wid}.json"
    facts = json.loads(f.read_text()) if f.exists() else {}
    atr4 = facts.get("atr4h")
    lv = facts.get("levels") or {}
    near = min((abs(v - px) for v in lv.values()), default=np.nan)
    adx = np.nan
    try:
        from brief import trend
        from market import frames
        adx = trend(frames(t_ms)["4h"])["adx"]
    except Exception:
        pass
    news = False
    try:
        import newsdesk
        news = any(abs(t - t_ms) <= 6 * 3_600_000 for t, _ in newsdesk.groups())
    except Exception:
        pass
    return dict(trend4=facts.get("trend4", ""), sr_atr=round(near / atr4, 2) if atr4 and near == near else np.nan,
                session=session(t_ms), adx4=round(adx, 1) if adx == adx else np.nan, news6h=news)


def resolve_one(m1, t_ms, d, entry, stop, tgt, now_ms):
    x = m1[(m1["t"] > t_ms) & (m1["t"] <= t_ms + HORIZON_MS)]
    risk = abs(entry - stop) + 2 * COST
    mfe = mae = 0.0
    for t, h, l, c in zip(x["t"].values, x["h"].values, x["l"].values, x["c"].values):
        mfe = max(mfe, d * ((h if d > 0 else l) - entry) / risk)
        mae = min(mae, d * ((l if d > 0 else h) - entry) / risk)
        hs, ht = (l <= stop, h >= tgt) if d > 0 else (h >= stop, l <= tgt)
        if hs:
            return "stop", -1.0, mfe, mae, int(t)
        if ht:
            return "target", (abs(tgt - entry) - 2 * COST) / risk, mfe, mae, int(t)
    if now_ms - t_ms >= HORIZON_MS and len(x):
        return "neither", d * (x["c"].iloc[-1] - entry) / risk - 2 * COST / risk, mfe, mae, int(x["t"].iloc[-1])
    return "open", np.nan, mfe, mae, None


def resolve(now_ms=None, m1=None):
    """Update learn/ideas.csv; returns the DataFrame."""
    m1 = load_cache() if m1 is None else m1
    now_ms = int(m1["t"].iloc[-1]) + 60_000 if now_ms is None else now_ms
    old = pd.read_csv(IDEAS) if IDEAS.exists() else pd.DataFrame()
    done = set(old.loc[old["outcome"] != "open", "id"]) if len(old) else set()
    rows = [r for _, r in old.iterrows() if r["id"] in done] if len(old) else []
    rows = [dict(r) for r in rows]
    for j in jlines(JOURNAL):
        if j.get("kind") != "DECISION" or j["id"] in done:
            continue
        bi = (j.get("answer") or {}).get("best_idea") or {}
        try:
            d = 1 if str(bi["dir"]).lower().startswith("l") else -1
            p, stop, tgt = float(bi["p_target"]), float(bi["stop"]), float(bi["target"])
        except (KeyError, TypeError, ValueError):
            continue
        if not ((d > 0 and stop < j["px"] < tgt) or (d < 0 and tgt < j["px"] < stop)):
            continue
        out, r, mfe, mae, t_end = resolve_one(m1, j["t_ms"], d, j["px"], stop, tgt, now_ms)
        rows.append(dict(id=j["id"], t=j["t"], t_ms=j["t_ms"], dir="long" if d > 0 else "short", entry=j["px"], stop=stop, target=tgt,
                         p=p, outcome=out, r=round(r, 3) if r == r else np.nan, mfe_r=round(mfe, 2), mae_r=round(mae, 2),
                         resolved=str(bkk(t_end))[:16] if t_end else "", **tags(j["t_ms"], j["id"], j["px"])))
    df = pd.DataFrame(rows).sort_values("t_ms") if rows else pd.DataFrame()
    LEARN.mkdir(parents=True, exist_ok=True)
    df.to_csv(IDEAS, index=False)
    return df


def _resolved(df=None):
    df = pd.read_csv(IDEAS) if df is None and IDEAS.exists() else df
    if df is None or not len(df):
        return pd.DataFrame(columns=["p", "outcome"])
    return df[df["outcome"].isin(["target", "stop", "neither"])]


def _pav(p, y):
    """Isotonic (non-decreasing) fit of hit rate on stated p, by pool-adjacent-violators on the UNIQUE p values
    (weighted by count). Returns (unique p, fitted rate)."""
    g = pd.DataFrame({"p": p, "y": np.asarray(y, float)}).groupby("p")["y"].agg(["sum", "count"]).reset_index()
    blocks = [[r.p, r["sum"], r["count"]] for _, r in g.iterrows()]          # [first p, hits, n]
    xs = [[b[0]] for b in blocks]
    i = 0
    while i < len(blocks) - 1:
        if blocks[i][1] / blocks[i][2] > blocks[i + 1][1] / blocks[i + 1][2]:
            blocks[i][1] += blocks[i + 1][1]
            blocks[i][2] += blocks[i + 1][2]
            xs[i] += xs.pop(i + 1)
            blocks.pop(i + 1)
            i = max(i - 1, 0)
        else:
            i += 1
    ps = [x for grp in xs for x in grp]
    fit = [b[1] / b[2] for b, grp in zip(blocks, xs) for _ in grp]
    return np.asarray(ps), np.asarray(fit)


def p_cal(p, df=None):
    """(calibrated p, rule) for a stated p."""
    r = _resolved(df)
    hit = (r["outcome"] == "target").astype(float)
    n_all = len(r)
    base = (hit.sum() + SHRINK_K * PRIOR_BASE) / (n_all + SHRINK_K)      # the base rate itself is shrunk to the prior
    if n_all >= ISO_MIN:
        xs, fit = _pav(r["p"].values, hit.values)
        return float(np.interp(p, xs, fit)), f"isotonic on {n_all} resolved ideas"
    lo, hi, lab = next(b for b in BUCKETS if b[0] <= p < b[1])
    b = r[(r["p"] >= lo) & (r["p"] < hi)]
    nb, hb = len(b), (b["outcome"] == "target").mean() if len(b) else 0.0
    return float((nb * hb + SHRINK_K * base) / (nb + SHRINK_K)), f"bucket {lab}: ({nb} x {hb:.2f} + {SHRINK_K} x base {base:.2f}) / ({nb} + {SHRINK_K})"


def lessons(df=None):
    """Stored lessons (from the weekly Sonnet proposal) that pass the code check on the current data."""
    if not LESSONS.exists():
        return []
    r = _resolved(df)
    keep = []
    for L in json.loads(LESSONS.read_text()):
        q = r.query(L["filter"]) if L.get("filter") else r.iloc[:0]
        rest = r.drop(q.index)
        if len(q) >= 5 and len(rest):
            gap = (q["outcome"] == "target").mean() - (rest["outcome"] == "target").mean()
            if abs(gap) >= 0.20:
                keep.append(f"{L['text']} ({(q['outcome'] == 'target').sum()}/{len(q)} hit target vs {100 * (rest['outcome'] == 'target').mean():.0f}% otherwise)")
    return keep[:3]


def block(df=None):
    """Track-record block for the Opus brief (<= 350 tokens)."""
    df = pd.read_csv(IDEAS) if df is None and IDEAS.exists() else df
    ind = INDICATORS.read_text().strip() if INDICATORS.exists() else ""
    if df is None or not len(df):
        return "## Your track record\n- No resolved ideas yet." + (f"\n- {ind}" if ind else "")
    r = _resolved(df)
    hit = (r["outcome"] == "target")
    L = [f"## Your track record (best_idea of every answer, resolved on 1m bars; {len(r)} resolved, {int((df['outcome'] == 'open').sum())} open)",
         "Stated p vs realised target-first rate; the code gates and sizes on the CALIBRATED p:",
         "| bucket | n | stated | realised | calibrated |", "|---|---|---|---|---|"]
    for lo, hi, lab in BUCKETS:
        b = r[(r["p"] >= lo) & (r["p"] < hi)]
        if len(b):
            L.append(f"| {lab} | {len(b)} | {b['p'].mean():.2f} | {(b['outcome'] == 'target').mean():.2f} | {p_cal(b['p'].mean(), df)[0]:.2f} |")
    L.append("Last resolved:")
    for _, x in r.tail(8).iterrows():
        tag = f"{x['session']}, 4h {x['trend4']}, S/R {x['sr_atr']} ATR"
        L.append(f"- {x['t'][5:16]} {x['dir']} p {x['p']:.2f}: {x['outcome']} {x['r']:+.1f}R (MFE {x['mfe_r']:+.1f}R; {tag})")
    les = lessons(df)
    if les:
        L += ["Lessons (each checked on >= 5 cases):", *[f"- {s}" for s in les]]
    if ind:
        L.append(f"- {ind}")
    return "\n".join(L)


def status_lines(df=None):
    df = pd.read_csv(IDEAS) if df is None and IDEAS.exists() else df
    r = _resolved(df)
    if not len(r):
        return "Learning: no resolved Opus ideas yet."
    hit = (r["outcome"] == "target").mean()
    return (f"Learning: {len(r)} Opus best ideas resolved: stated p {r['p'].mean():.2f}, realised target-first {hit:.2f}, avg R {r['r'].mean():+.2f}; "
            f"calibration rule now: {p_cal(0.6, df)[1]} -> p 0.60 counts as {p_cal(0.6, df)[0]:.2f}.\n"
            f"Gate and sizing use p_cal; at today's numbers an entry needs p_cal >= 0.55, so the desk stays flat until Opus's ideas start hitting."
            + (f"\n{INDICATORS.read_text().strip()} (table: learn/indicator_scorecard.md)" if INDICATORS.exists() else ""))


if __name__ == "__main__":
    d = resolve()
    print(d[["t", "dir", "p", "outcome", "r", "mfe_r", "session", "trend4", "sr_atr", "adx4", "news6h"]].to_string() if len(d) else "none")
    print(block(d))
    print(status_lines(d))
