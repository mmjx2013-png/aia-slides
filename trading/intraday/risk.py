"""Risk rules for the intraday PAXG paper desk, enforced in code.

No model output can override these: the broker re-checks them at the fill.
PAPER ONLY.
"""
import calendar_guard
from common import bkk

CAPITAL = 10_000.0
RISK_MAX = 0.01            # max fraction of equity lost if the stop is hit (incl. costs)
DAILY_LOSS = 0.03          # halt for the rest of the Bangkok day at -3% from day start
MAX_LEV = 3.0              # default notional cap (take-every-setup and 15m candidate books)
AI_LEV_MAX = 10           # the AI desk's chosen leverage is clamped to 1..10 (owner rule)
VOL_GUARD = 4.0            # no entry if last 1m range > 4x ATR14(1m)
HALF_SPREAD = 0.25         # USD/oz: 0.50 spread, half paid each side
SLIPPAGE = 0.10            # USD/oz each side  -> round trip 0.70 USD/oz
STOP_ATR = (1.0, 3.0, 1.5)  # stop = k x ATR14(5m): min, max, default  (mandatory)
TARGET_R = (1.0, 4.0, 2.0)  # target = r x stop distance: min, max, default
RISK_PCT = (0.25, 1.0, 1.0)  # % of equity at risk: min, max, default
FLAT_FROM, OPEN_FROM = (3, 30), (14, 0)   # Bangkok: flat and no entries in [03:30, 14:00)
SHADOW_LEVS = (1, 3, 10, 30)  # same decisions replayed at these leverages
STOP_OUT = 0.50            # shadow liquidation: equity <= 50% of used margin (as phase 1)
ORDER_TTL_MS = 5 * 60_000  # an order not filled within 5 min of its decision is dropped
COST = HALF_SPREAD + SLIPPAGE
BREAKEVEN_AT_R = 1.0        # move the stop to entry after +1R (setup search: +0.02 R median, better in 64% of variants)
CALENDAR_GUARD = True       # set False only for historical replays without a calendar


def in_flat_window(t_ms):
    b = bkk(t_ms)
    return FLAT_FROM <= (b.hour, b.minute) < OPEN_FROM


def is_weekend(t_ms):
    """Gold (COMEX) is shut Fri 17:00 New York -> Sun 18:00 New York, i.e. about
    Sat 04:00 -> Mon 05:00 Bangkok. PAXG keeps trading, but we do not."""
    b = bkk(t_ms)
    return (b.weekday() == 5 and b.hour >= 4) or b.weekday() == 6 or (b.weekday() == 0 and b.hour < 5)


def bkk_day(t_ms):
    return bkk(t_ms).strftime("%Y-%m-%d")


def _clip(x, lo_hi_def):
    lo, hi, d = lo_hi_def
    try:
        x = float(x)
    except (TypeError, ValueError):
        return d
    return min(max(x, lo), hi)


def clamp_lev(x):
    """Opus's leverage -> integer 1..AI_LEV_MAX. Returns (lev, requested)."""
    try:
        req = float(x)
    except (TypeError, ValueError):
        return None, x
    return int(min(max(round(req), 1), AI_LEV_MAX)), req


def clamp(dec):
    """Model decision -> legal order parameters."""
    lev, req = clamp_lev(dec.get("leverage")) if "leverage" in dec else (None, None)
    return dict(dir=1 if str(dec.get("dir", "")).lower().startswith("l") else -1, leverage=lev, leverage_req=req,
                stop_atr=_clip(dec.get("stop_atr"), STOP_ATR),
                target_r=_clip(dec.get("target_r"), TARGET_R),
                risk_pct=_clip(dec.get("risk_pct"), RISK_PCT))


def entry_gate(state, t_ms):
    """(ok, reason) for opening a new position at bar time t_ms."""
    if state.get("pos"):
        return False, "position already open"
    if state.get("halted") == bkk_day(t_ms):
        return False, "daily loss limit hit: halted for the Bangkok day"
    if is_weekend(t_ms):
        return False, "weekend: no trading Sat/Sun Bangkok"
    if CALENDAR_GUARD:
        why = calendar_guard.entry_block(t_ms)
        if why:
            return False, why
    if in_flat_window(t_ms):
        return False, "outside entry hours (flat 03:30-14:00 Bangkok)"
    rng, atr = state.get("last_range"), state.get("last_atr1")
    if rng is not None and atr and rng > VOL_GUARD * atr:
        return False, f"volatility guard: 1m range {rng:.2f} > {VOL_GUARD}x ATR {atr:.2f}"
    if state.get("equity", 0) <= 0:
        return False, "no equity"
    return True, "ok"


def size(equity, px, stop_dist, risk_pct, lev=None):
    """Ounces = min(qty at `lev` x equity, qty at risk_pct of equity with this stop). lev None -> MAX_LEV."""
    q_risk = risk_pct / 100 * equity / (stop_dist + 2 * COST)
    q_lev = (lev or MAX_LEV) * equity / px
    return (q_lev, True) if q_lev < q_risk else (q_risk, False)
