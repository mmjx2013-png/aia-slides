"""Synthetic checks of the swing broker and the code re-check of Opus's answers. PAPER ONLY.
  python3 test_swing.py"""
import json
import tempfile
from pathlib import Path

import pandas as pd

import env  # noqa: F401
import calendar_guard
import rules as R
from broker import Broker, write_pending
import desk

T0 = int(pd.Timestamp("2026-11-24 07:00", tz="UTC").value // 10**6)   # Tue 14:00 Bangkok
M = 60_000
ok = fail = 0


def check(name, cond):
    global ok, fail
    ok, fail = ok + bool(cond), fail + (not cond)
    print(("PASS " if cond else "FAIL ") + name)


def bar(i, o, h=None, l=None, c=None, t0=T0):
    return dict(t=t0 + i * M, o=o, h=max(o, h or o), l=min(o, l or o), c=c or o)


def fresh(**kw):
    kw.setdefault("profile", R.ONE_PCT)
    return Broker(tempfile.mkdtemp(), capital=10_000, **kw)


def journal(b, kind):
    return [json.loads(x) for x in (b.d / "journal.jsonl").read_text().splitlines() if json.loads(x)["kind"] == kind] \
        if (b.d / "journal.jsonl").exists() else []


def opened(b, d=1, stop=3990, target=4030, lev=10, i=0, px=4000):
    write_pending(b.d, "open", T0 + i * M, id="t", dir=d, stop=stop, target=target, lev=lev, p_target=0.6)
    b.on_bar(bar(i, px))


R.CALENDAR = False

# 1 fill at the next open +0.35, sized by 1% risk; stop wins a same-bar tie
b = fresh()
write_pending(b.d, "open", T0 + 30_000, id="t", dir=1, stop=3990, target=4030, lev=10, p_target=0.6)
b.on_bar(bar(0, 4000))
check("no fill on the bar that opened before the decision", b.s["pos"] is None)
b.on_bar(bar(1, 4000))
p = b.s["pos"]
check("fill at next open + cost", p and abs(p["entry"] - 4000.35) < 1e-9)
check("1% risk size", abs(p["qty"] - 100 / (10 + 0.7)) < 1e-9)
b.on_bar(bar(2, 4000, h=4040, l=3980))
e = journal(b, "EXIT")[-1]
check("stop wins a same-bar tie", e["reason"] == "stop" and abs(e["px"] - (3990 - 0.35)) < 0.01)
check("loss is 1% of equity", abs(b.s["equity"] - 9900) < 0.01)

# 2 gap through the stop fills at the open
b = fresh()
opened(b)
b.on_bar(bar(1, 3980, h=3985, l=3975))
check("gap through stop fills at open", abs(journal(b, "EXIT")[-1]["px"] - (3980 - 0.35)) < 0.01)

# 3 target, then breakeven
b = fresh()
opened(b, d=-1, stop=4010, target=3970)
b.on_bar(bar(1, 3990, l=3960))
check("short target", journal(b, "EXIT")[-1]["reason"] == "target")
b = fresh()
opened(b)
b.on_bar(bar(1, 4005, h=4011))
check("breakeven armed after +1R", b.s["pos"]["stop"] == b.s["pos"]["entry"])
b.on_bar(bar(2, 4001, l=3999))
check("breakeven stop exit", journal(b, "EXIT")[-1]["reason"] == "breakeven stop")

# 4 tighten and close
b = fresh()
opened(b)
write_pending(b.d, "tighten", T0 + M, id="x", stop=3995)
b.on_bar(bar(1, 4002))
check("tighten applied", b.s["pos"]["stop"] == 3995)
write_pending(b.d, "tighten", T0 + 2 * M, id="x", stop=3992)
b.on_bar(bar(2, 4002))
check("loosening rejected", b.s["pos"]["stop"] == 3995 and journal(b, "REJECT"))
write_pending(b.d, "close", T0 + 3 * M, id="x")
b.on_bar(bar(3, 4003))
check("PM close at open", journal(b, "EXIT")[-1]["reason"] == "PM close" and b.s["pos"] is None)

# 5 max hold, weekend close, no weekend entry
# (with no weekend holds a trade can last at most Mon 05:00 -> Sat 03:30, under 5 days: test the
# mechanism with a 1-day limit)
keep, R.MAX_HOLD_MS = R.MAX_HOLD_MS, 86400_000
b = fresh()
opened(b, stop=3900, target=4100)
b.on_bar(bar(1440 - 1, 4001))
check("still open just under the max hold", b.s["pos"] is not None)
b.on_bar(bar(1440, 4001))
check("closed at the max hold", journal(b, "EXIT")[-1]["reason"] == "max hold 5 days")
R.MAX_HOLD_MS = keep
fri = int(pd.Timestamp("2026-11-27 20:00", tz="UTC").value // 10**6)       # Sat 03:00 Bangkok
b = fresh()
write_pending(b.d, "open", fri, id="t", dir=1, stop=3900, target=4100, lev=3, p_target=0.6)
b.on_bar(bar(0, 4000, t0=fri))
check("no entry on Saturday", b.s["pos"] is None and journal(b, "REJECT"))
thu = fri - 24 * 3600_000
b = fresh()
write_pending(b.d, "open", thu, id="t", dir=1, stop=3900, target=4100, lev=3, p_target=0.6)
b.on_bar(bar(0, 4000, t0=thu))
b.on_bar(bar(24 * 60 + 29, 4001, t0=thu))
check("held at Sat 03:29", b.s["pos"] is not None)
b.on_bar(bar(24 * 60 + 30, 4001, t0=thu))
check("flat at Sat 03:30 Bangkok", journal(b, "EXIT")[-1]["reason"].startswith("weekend"))

# 6 leverage: min(chosen, 1% risk); clamp 1..10
b = fresh()
opened(b, stop=3990, target=4030, lev=2)
check("leverage cap binds on a wide stop", abs(b.s["pos"]["qty"] - 2 * 10_000 / 4000) < 1e-9 and journal(b, "FILL")[-1]["binding"] == "leverage")
check("clamp 15 -> 10, 0 -> 1", R.clamp_lev(15)[0] == 10 and R.clamp_lev(0)[0] == 1)

# 7 halts and kill switch (hold 10x notional, stop far away)
b = fresh(shadows=())
b.s.update(day=R.day_key(T0), day_start=10_320.0)
opened(b, stop=3900, target=5000, lev=10)
b.on_bar(bar(1, 4000, c=3999))
check("daily halt at -3%", b.s["pos"] is None and b.s["halted_day"] == R.day_key(T0) and journal(b, "HALT"))
write_pending(b.d, "open", T0 + 2 * M, id="t2", dir=1, stop=3900, target=4200, lev=3, p_target=0.6)
b.on_bar(bar(2, 3990))
check("no entry while halted", b.s["pos"] is None)
b = fresh(shadows=())
b.s.update(peak=11_200.0)
opened(b, stop=3000, target=5000, lev=1)
b.on_bar(bar(1, 4000, c=3999))
check("kill switch at -10% from peak", b.s["killed"] and journal(b, "KILL"))
check("kill switch blocks entries", b.entry_block(T0 + 5 * M).startswith("kill"))
b = fresh(shadows=())
b.s.update(week=R.week_key(T0), week_start=10_650.0, day=R.day_key(T0), day_start=10_000.0)
opened(b, stop=3000, target=5000, lev=1)
b.on_bar(bar(1, 4000, c=3999))
check("weekly halt at -6%", b.s["halted_week"] == R.week_key(T0))

# 8 shadow liquidation at 30x on a -2% move
b = fresh()
opened(b, stop=3000, target=5000, lev=1)
b.on_bar(bar(1, 3950, l=3910))
check("30x shadow liquidated, 1x alive", b.s["shadows"]["30"]["dead"] and not b.s["shadows"]["1"]["dead"])

# 9 stale order
b = fresh()
write_pending(b.d, "open", T0, id="t", dir=1, stop=3990, target=4030, lev=3, p_target=0.6)
b.on_bar(bar(20, 4000))
check("order older than 15 min rejected", b.s["pos"] is None and "stale" in journal(b, "REJECT")[-1]["reason"])

# 10 the code re-check of Opus's open
f = dict(px=4000.0, atr1h=8.0, atr4h=16.0, atr1d=40.0, trend4="up", levels={"prev day low": 3995.0, "round 50 above": 4050.0},
         asof_ms=T0)
b = fresh()
good = dict(action="open", dir="long", stop=3980, target=4040, leverage=5, p_target=0.6)
o, why = desk.check_open(good, f, b, T0)
check("good long passes", o is not None and o["lev"] == 5)
check("p 0.50 rejected", "p_target" in desk.check_open(dict(good, p_target=0.5), f, b, T0)[1])
check("rr 1.4 rejected", "reward" in desk.check_open(dict(good, target=4029), f, b, T0)[1])
check("stop under 0.5 ATR(1h) rejected", "stop distance" in desk.check_open(dict(good, stop=3997, target=4020), f, b, T0)[1])
sh = dict(good, dir="short", stop=4020, target=3960)
check("counter-trend without a case rejected", "mean-reversion" in desk.check_open(sh, f, b, T0)[1])
check("counter-trend far from a level rejected", "key level" in desk.check_open(dict(sh, mean_reversion_case="x"), dict(f, levels={"a": 3900.0}), b, T0)[1])
check("counter-trend at a level passes", desk.check_open(dict(sh, mean_reversion_case="fade prev day low"), f, b, T0)[0] is not None)

# 11 calendar: close 5 min before a USD High event; no entry within 2 h before it
R.CALENDAR = True
ev_t = T0 + 90 * M
calendar_guard._mem.update(mtime="test", events=[(ev_t, "Test CPI", "USD", "High")], span=(T0 - 86400_000, T0 + 86400_000))
calendar_guard.events = lambda: calendar_guard._mem
check("entry blocked 90 min before an event", "calendar" in (R.calendar_block(T0) or ""))
check("entry allowed 3 h before", R.calendar_block(ev_t - 3 * 3600_000) is None)
b = fresh()
R.CALENDAR = False
opened(b, stop=3900, target=4100)
R.CALENDAR = True
b.on_bar(bar(84, 4001))
check("held 6 min before", b.s["pos"] is not None)
b.on_bar(bar(85, 4001))
check("closed 5 min before the event", journal(b, "EXIT")[-1]["reason"].startswith("calendar"))

# 12 main profile: 2% risk, halts -5% / -8%, kill -15%
R.CALENDAR = False
b = fresh(profile=R.MAIN)
opened(b)
check("main book risks 2%", abs(b.s["pos"]["qty"] - 200 / (10 + 0.7)) < 1e-9)
b = fresh(profile=R.MAIN, shadows=())
b.s.update(day=R.day_key(T0), day_start=10_480.0)
opened(b, stop=3900, target=5000, lev=10)
check("main book not halted at -4.6%", b.s["halted_day"] is None)
b = fresh(profile=R.MAIN, shadows=())
b.s.update(day=R.day_key(T0), day_start=10_530.0)
opened(b, stop=3900, target=5000, lev=10)
check("main book halts at -5%", b.s["halted_day"] == R.day_key(T0))
b = fresh(profile=R.MAIN, shadows=())
b.s.update(peak=11_500.0)
opened(b, stop=3900, target=5000, lev=1)
check("main kill switch not at -13%", not b.s["killed"])
b.s.update(peak=11_800.0)
b.on_bar(bar(1, 4000, c=3999))
check("main kill switch at -15%", b.s["killed"])

# 13 the 70 USD followers
from follower import Follower
b = fresh(profile=R.MAIN)
td = tempfile.mkdtemp()
b.followers = [Follower(Path(td) / "p", "real70_paxg"), Follower(Path(td) / "x", "real70_xau_minlot")]
opened(b, stop=3900, target=4300)
fp, fx = b.followers
check("paxg follower: 2% risk at a wide stop, under 1x", abs(fp.s["pos"]["qty"] * (abs(fp.s["pos"]["entry"] - 3900) + 0.002 * fp.s["pos"]["entry"]) - 1.4) < 0.01)
check("xau follower trades exactly 1 oz", fx.s["pos"]["qty"] == 1.0 and abs(fx.s["pos"]["entry"] - 4000.30) < 1e-9)
b.on_bar(bar(1, 3995, l=3945))          # AI stop 3900 not hit; the CFD is stopped out at 50% margin (equity 20)
check("xau follower stopped out at 50% margin and dead", fx.s["dead"] and fx.s["pos"] is None and abs(fx.s["equity"] - 20) < 0.01)
write_pending(b.d, "close", T0 + 2 * M, id="c")
b.on_bar(bar(2, 3960))
check("paxg follower exits with the AI", fp.s["pos"] is None and 68 < fp.s["equity"] < 70)
write_pending(b.d, "open", T0 + 3 * M, id="t2", dir=1, stop=3950, target=4030, lev=3, p_target=0.6)
b.on_bar(bar(3, 3960))
check("dead xau account stays flat", fx.s["pos"] is None and b.s["pos"] is not None)

# 14 aggr30: 20% risk, max 10x, stop-out at 50% margin
b = fresh(profile=R.MAIN)
b.followers = [Follower(Path(td) / "a", "aggr30")]
opened(b, stop=3900, target=4300)
fa = b.followers[0]
check("aggr30 risks 20% at a wide stop", abs(fa.s["pos"]["qty"] - 14 / (100 + 0.7)) < 1e-9)
b = fresh(profile=R.MAIN)
b.followers = [Follower(Path(td) / "a2", "aggr30")]
opened(b, stop=3990, target=4030)
fa = b.followers[0]
check("aggr30 capped at 10x on a tight stop", abs(fa.s["pos"]["qty"] - 700 / 4000) < 1e-9)
fa.bar(bar(1, 3995, l=3992), False)
check("aggr30 alive after a small dip", not fa.s["dead"])
fa.bar(bar(2, 3700), False)                 # a gap: 10x on -7.5% leaves equity under 50% of margin
check("aggr30 stopped out on a gap and dead", fa.s["dead"] and fa.s["pos"] is None and fa.s["equity"] < 35)

# 16 owner follow books: long only, and the daily 21:02 follower
from follower import Daily2100
b = fresh(profile=R.MAIN)
b.followers = [Follower(Path(td) / "lo", "real70_paxg")]
opened(b, d=-1, stop=4010, target=3970)
check("real70_paxg does not short", b.followers[0].s["pos"] is None)
dd = Daily2100(tempfile.mkdtemp())
line = dd.daily(T0, 4000.0, dict(dir=1, stop=3950.0))
q = dd.s["pos"]["qty"]
check("daily: AI long -> BUY with 2% risk to the AI stop", line.startswith("REAL70: BUY") and abs(q * (4020 - 3950 * 0.995) - 1.4) < 1e-6)
check("daily: AI long again -> HOLD, stop only tightens", dd.daily(T0 + 86400_000, 4010.0, dict(dir=1, stop=3990.0)).startswith("REAL70: HOLD (stop 3990.00)")
      and dd.daily(T0 + 2 * 86400_000, 4010.0, dict(dir=1, stop=3960.0)).startswith("REAL70: HOLD (stop 3990.00)"))
dd.bar(bar(0, 3995, l=3985), False)
check("daily: exits on its stop between runs", dd.s["pos"] is None and journal(dd, "EXIT")[-1]["px"] == round(3990 * 0.995, 2))
check("daily: AI short -> STAY CASH", dd.daily(T0 + 3 * 86400_000, 4000.0, dict(dir=-1, stop=4050.0)).startswith("REAL70: STAY CASH"))
dd.daily(T0 + 4 * 86400_000, 4000.0, dict(dir=1, stop=3950.0))
check("daily: AI flat -> SELL ALL", dd.daily(T0 + 5 * 86400_000, 4001.0, None).startswith("REAL70: SELL ALL"))

# 17 withdrawal policy
from follower import withdraw
dw = Daily2100(tempfile.mkdtemp())
dw.s["equity"] = 100.0
check("skim 25% above the high-water mark", abs(withdraw(dw, T0) - 7.5) < 1e-9 and dw.s["hwm"] == 92.5 and dw.s["locked"] == 7.5)
dw.s["equity"] = 150.0
got = withdraw(dw, T0)
check("2x milestone: the 70 stake, then skim on the rest", abs(got - (70 + 0)) < 1e-9 and dw.s["equity"] == 80.0)
dw.s["equity"] = 160.0
check("milestone fires only once", abs(withdraw(dw, T0) - 0.25 * (160 - 92.5)) < 1e-9)
dw.s["equity"] = 400.0
withdraw(dw, T0)
check("10,000 THB milestone takes 30%", "10,000 THB: withdraw 30%" in dw.s["milestones"])
dw.s["pos"] = dict(dir=1, qty=0.01, entry=4000, stop=3900, t=T0)
dw.s["equity"] = 999.0
check("no withdrawal while a position is open", withdraw(dw, T0) == 0.0)

# 18 Venice unit normalisation (no network)
import venice
check("142000 for a '150K' forecast -> 142", venice.normalize(142000, "150K") == 142.0 and venice.normalize(142, "150K") == 142)
check("bps and fraction-percent normalised", venice.normalize(0.25, "25bps") == 25.0 and abs(venice.normalize(0.031, "3.1%") - 3.1) < 1e-9)
check("sanity: 142 vs 150K ok, 4.0 vs 0.3% rejected", venice.sane(142, "150K", "120K") and not venice.sane(4.0, "0.3%", "0.3%"))

# 19 official-source extraction (BEA / Fed wording, offline)
import officials as O
pce = ("From the preceding month, the PCE price index for October increased 0.3 percent . Excluding food and energy, "
       "the PCE price index also increased 0.4 percent.")
check("BEA core PCE and headline PCE m/m", O.extract("Core PCE Price Index m/m", pce) == 0.4 and O.extract("PCE Price Index m/m", pce) == 0.3)
check("BEA GDP", O.extract("Prelim GDP q/q", "Real gross domestic product (GDP ) increased at an annual rate of 4.3 percent in the third") == 4.3)
check("Fed upper bound with fractions", O.extract("Federal Funds Rate", "maintain the target range for the federal funds rate at 3-3/4 to 4 percent") == 4)
check("BLS has no official source (403): headlines only", O.source_for("CPI m/m") is None and O.source_for("Non-Farm Employment Change") is None)

# 20 shock action: block entries 30 min; tighten a wrong-side stop, never widen
import shocks as SHK
b = fresh(profile=R.MAIN)
opened(b, stop=3980, target=4100)                       # long, entry 4000.35, 1R = 20.35
note = SHK.act(b, dict(t_ms=T0 + 2 * M, t="x", dir=-1, px=4010.0))
check("shock against a long: stop to max(entry, px - 0.5R)", abs(b.s["pos"]["stop"] - max(4000.35, 4010 - 0.5 * 20.35)) < 1e-9)
check("shock blocks entries for 30 min", "shock" in b.entry_block(T0 + 10 * M) or b.s["pos"])
b2 = fresh(profile=R.MAIN)
opened(b2, stop=3980, target=4100)
SHK.act(b2, dict(t_ms=T0 + 2 * M, t="x", dir=1, px=4010.0))
check("shock with the position: stop untouched", b2.s["pos"]["stop"] == 3980)
b2.s["pos"]["stop"] = 4005.0
SHK.act(b2, dict(t_ms=T0 + 3 * M, t="x", dir=-1, px=4006.0))
check("shock never widens a stop", b2.s["pos"]["stop"] == 4005.0)
b3 = fresh(profile=R.MAIN)
b3.s["shock_until"] = T0 + 30 * M
check("entry blocked during the shock window", "shock" in b3.entry_block(T0 + 5 * M) and b3.entry_block(T0 + 31 * M) is None)

# 15 confidence sizing
check("risk from p: 0.55 1%, 0.60 1.5%, 0.65 2%, 0.75+ 3%", [round(R.risk_from_p(p), 4) for p in (0.55, 0.6, 0.65, 0.75, 0.9)] == [0.01, 0.015, 0.02, 0.03, 0.03])
check("kelly: p_cal 0.40, R 2 -> f 0.10, risk 1.25% (eighth)", abs(R.kelly_risk(0.40, 2)[0] - 0.0125) < 1e-9)
check("kelly: skip when f <= 0", R.kelly_risk(0.30, 2)[0] is None)
check("kelly: clamp 0.5%..3%", R.kelly_risk(0.34, 2)[0] == 0.005 and R.kelly_risk(0.9, 3)[0] == 0.03)
b = fresh(profile=R.MAIN)
write_pending(b.d, "open", T0, id="t", dir=1, stop=3990, target=4030, lev=10, p_target=0.7, risk=0.025)
b.on_bar(bar(0, 4000))
check("order's own risk used", abs(b.s["pos"]["qty"] - 250 / 10.7) < 1e-9)

print(f"test_swing: {ok}/{ok + fail} checks passed")
