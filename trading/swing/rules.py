"""Swing desk rules, enforced in code (owner / portfolio-manager decisions). PAPER ONLY."""
import env  # noqa: F401
import calendar_guard
from common import bkk

CAPITAL = 10_080.23          # carried over from the retired intraday AI desk
# Risk profiles: the main AI book (from 2026-11-26) and the 1%-risk shadow on the same decisions.
# Size never depends on Opus's p_target.
MAIN = dict(name="2% risk", risk=0.02, daily=0.05, weekly=0.08, kill=0.15)
ONE_PCT = dict(name="1% risk", risk=0.01, daily=0.03, weekly=0.06, kill=0.10)
P_RISK = ((0.55, 0.01), (0.65, 0.02), (0.75, 0.03))   # main book (from 2026-11-26 15:10): risk linear in Opus's p, cap 3%
KELLY_FRACTION, KELLY_MIN, KELLY_MAX, P_OFFSET, CAL_MIN_N = 0.25, 0.005, 0.04, 0.15, 20
LEV_MAX = 10                 # Opus picks 1..10; size = min(lev x equity, risk size)
BASE_LEV = 3                 # code books (take every 4h signal)
MAX_HOLD_MS = 5 * 86400_000
HALF_SPREAD, SLIPPAGE = 0.25, 0.10
COST = HALF_SPREAD + SLIPPAGE    # per side; 0.70/oz round trip
P_MIN, RR_MIN = 0.55, 1.5
EVENT_AHEAD_MS = 2 * 3600_000    # no entry if a USD High event is in the next 2 h
EVENT_CLOSE_MS = 5 * 60_000      # close 5 min before any USD High event
EVENT_AFTER_MS = 30 * 60_000     # and no entry in the 30 min after one
SHADOW_LEVS = (1, 3, 10, 30)
STOP_OUT = 0.50                  # shadow liquidation: equity <= 50% of used margin
BREAKEVEN_AT_R = 1.0
ORDER_TTL_MS = 15 * 60_000
CALENDAR = True                  # False only in synthetic tests


def week_key(t_ms):
    b = bkk(t_ms)
    y, w, _ = b.isocalendar()
    return f"{y}-W{w:02d}"


def day_key(t_ms):
    return bkk(t_ms).strftime("%Y-%m-%d")


def weekend_close(t_ms):
    """Flat from Sat 03:30 Bangkok until Mon 05:00 Bangkok (no weekend holds)."""
    b = bkk(t_ms)
    wd, hm = b.weekday(), (b.hour, b.minute)
    return (wd == 5 and hm >= (3, 30)) or wd == 6 or (wd == 0 and hm < (5, 0))


def no_entry_time(t_ms):
    """No new entries from Sat 00:00 Bangkok (the Saturday wake only manages) to Mon 05:00."""
    b = bkk(t_ms)
    return b.weekday() in (5, 6) or (b.weekday() == 0 and b.hour < 5)


def _usd_high():
    m = calendar_guard.events()
    if not m or not m["events"]:
        return None
    return m, [(t, title) for t, title, cc, imp in m["events"] if cc == "USD" and imp == "High"]


def calendar_block(t_ms):
    """Reason if the calendar blocks a new entry at t_ms, else None (fail safe when missing)."""
    if not CALENDAR:
        return None
    r = _usd_high()
    if r is None:
        return "calendar unavailable (fail safe: no entries)"
    m, ev = r
    lo, hi = m["span"]
    if not (lo - 86400_000 <= t_ms <= hi + 2 * 86400_000):     # a week file runs Sun..Fri; Sat is closed anyway
        return "calendar does not cover this time (fail safe: no entries)"
    for t, title in ev:
        if t - EVENT_AHEAD_MS <= t_ms <= t + EVENT_AFTER_MS:
            return f"calendar: USD High '{title}' at {bkk(t).strftime('%a %H:%M')} Bangkok (no entry 2 h before to 30 min after)"
    return None


def calendar_close(t_ms):
    """Title of a USD High event starting within 5 min (or under way, up to 30 min after)."""
    if not CALENDAR:
        return None
    r = _usd_high()
    if r is None:
        return None
    for t, title in r[1]:
        if t - EVENT_CLOSE_MS <= t_ms <= t + EVENT_AFTER_MS:
            return title
    return None


def upcoming(t_ms, hours=24):
    r = _usd_high()
    if r is None:
        return None
    return [(t, title) for t, title in sorted(r[1]) if t_ms <= t <= t_ms + hours * 3600_000]


def clamp_lev(x):
    try:
        req = float(x)
    except (TypeError, ValueError):
        return 1, x
    return int(min(max(round(req), 1), LEV_MAX)), req


def size(equity, px, stop_dist, lev, risk):
    """Ounces = min(lev x equity / px, `risk` of equity at this stop incl. both sides' costs).
    Returns (qty, binding) where binding is 'leverage' or 'risk'."""
    q_risk = risk * equity / (stop_dist + 2 * COST)
    q_lev = lev * equity / px
    return (q_lev, "leverage") if q_lev < q_risk else (q_risk, "risk")


def risk_from_p(p):
    """Main book: 1% at p 0.55, 2% at 0.65, 3% at >= 0.75, linear in between."""
    (p0, r0), (p1, r1), (p2, r2) = P_RISK
    if p <= p0:
        return r0
    if p <= p1:
        return r0 + (p - p0) / (p1 - p0) * (r1 - r0)
    return min(r1 + (p - p1) / (p2 - p1) * (r2 - r1), r2)


def kelly_risk(p_cal, rr):
    """Quarter Kelly: f = p - (1 - p) / R; risk = 0.25 f, clamped 0.5%..4%; None when f <= 0 (skip)."""
    f = p_cal - (1 - p_cal) / rr
    if f <= 0:
        return None, f
    return min(max(KELLY_FRACTION * f, KELLY_MIN), KELLY_MAX), f


def rr_after_costs(px, stop, target):
    return (abs(target - px) - 2 * COST) / (abs(px - stop) + 2 * COST)
