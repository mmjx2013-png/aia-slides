"""Synthetic checks of the paper broker and risk rules (no network). python3 test_broker.py"""
import tempfile

import pandas as pd

import risk
risk.CALENDAR_GUARD = False   # synthetic bars: calendar tested separately
from paperbroker import Broker, write_order

T0 = int(pd.Timestamp("2026-11-24 08:00", tz="UTC").value // 10**6)   # 15:00 Bangkok


def bar(i, o, h, l, c):
    return dict(t=T0 + i * 60_000, o=o, h=h, l=l, c=c, atr1=1.0, rng=h - l)


def fresh(order_dir="long", stop_atr=1.0, target_r=2.0, atr5=2.0):
    d = tempfile.mkdtemp()
    b = Broker(d)
    b.on_bar(bar(0, 3500, 3501, 3499, 3500))
    write_order(d, dict(id="e1", atr5=atr5), dict(dir=order_dir, stop_atr=stop_atr, target_r=target_r),
                created_ms=T0 + 60_000)
    return b, d


def kinds(d):
    import json
    return [json.loads(x) for x in open(f"{d}/journal.jsonl")]


# 1. both stop and target inside one bar -> stop
b, d = fresh()
b.on_bar(bar(1, 3500, 3510, 3490, 3500))
ex = [x for x in kinds(d) if x["kind"] == "EXIT"][0]
assert ex["reason"] == "stop", ex
# 2. fill is at next open plus costs; 3x cap binds (stop 2 USD on 3500 => risk sizing > 3x)
f = [x for x in kinds(d) if x["kind"] == "FILL"][0]
assert abs(f["px"] - (3500 + risk.COST)) < 1e-9 and f["lev_capped"] and f["lev"] <= 3.0, f
# 3. gap through stop fills at open
b, d = fresh()
b.on_bar(bar(1, 3500, 3500.5, 3499.8, 3500))
b.on_bar(bar(2, 3490, 3491, 3489, 3490))
ex = [x for x in kinds(d) if x["kind"] == "EXIT"][0]
assert ex["reason"] == "stop" and abs(ex["px"] - (3490 - risk.COST)) < 1e-9, ex
# 4. target
b, d = fresh(order_dir="short")
b.on_bar(bar(1, 3500, 3500.2, 3495, 3496))
ex = [x for x in kinds(d) if x["kind"] == "EXIT"][0]
assert ex["reason"] == "target" and ex["pnl"] > 0, ex
# 5. order decided after the bar opened does not fill on that bar
d = tempfile.mkdtemp(); b = Broker(d)
b.on_bar(bar(0, 3500, 3501, 3499, 3500))
write_order(d, dict(id="e2", atr5=2.0), dict(dir="long"), created_ms=T0 + 60_000 + 1)
b.on_bar(bar(1, 3500, 3501, 3499, 3500)); assert b.s["pos"] is None
b.on_bar(bar(2, 3500, 3501, 3499.9, 3500)); assert b.s["pos"] is not None
# 6. flat window: 03:30 Bangkok bar closes the position; no entries until 14:00
t330 = int(pd.Timestamp("2026-11-24 20:30", tz="UTC").value // 10**6)
assert risk.in_flat_window(t330) and not risk.in_flat_window(t330 - 60_000)
b.on_bar(dict(t=t330, o=3500, h=3500.1, l=3499.9, c=3500, atr1=1.0, rng=.2))
assert b.s["pos"] is None and kinds(d)[-1]["reason"].startswith("flat")
# 7. volatility guard rejects
d = tempfile.mkdtemp(); b = Broker(d)
b.on_bar(dict(bar(0, 3500, 3510, 3490, 3500), atr1=2.0))      # range 20 > 4 x 2
write_order(d, dict(id="e3", atr5=2.0), dict(dir="long"), created_ms=T0 + 60_000)
b.on_bar(bar(1, 3500, 3501, 3499, 3500))
assert b.s["pos"] is None and "volatility" in kinds(d)[-1]["reason"]
# 8. 30x shadow liquidates on a big adverse bar while the live book is stopped
b, d = fresh(stop_atr=3.0, atr5=20.0)                            # stop 60 USD away
b.on_bar(bar(1, 3500, 3501, 3440, 3445))
assert b.s["shadows"]["30"]["dead"] and not b.s["shadows"]["10"]["dead"], b.s["shadows"]
# 9. daily loss halt
d = tempfile.mkdtemp(); b = Broker(d)
b.on_bar(bar(0, 3500, 3501, 3499, 3500)); b.s["equity"] = 9600.0
b.on_bar(bar(1, 3500, 3501, 3499, 3500))
b2 = Broker(d); b2.s = b.s
assert b.s["halted"] == risk.bkk_day(T0), b.s
ok, why = risk.entry_gate(b.s, T0 + 120_000); assert not ok and "daily loss" in why
# 10. clamps
o = risk.clamp(dict(dir="short", stop_atr=0.1, target_r=9, risk_pct=5))
assert o == dict(dir=-1, stop_atr=1.0, target_r=4.0, risk_pct=1.0), o
# 11. breakeven at +1R (option): after the trigger bar, a return to entry exits at about -cost
risk.BREAKEVEN_AT_R = 1.0
b, d = fresh()                                    # long, stop 2 USD, target 4 USD
b.on_bar(bar(1, 3500, 3502.6, 3499.9, 3502))      # +1R touched (entry 3500.35 + 2), no exit
assert b.s["pos"]["be"] and abs(b.s["pos"]["stop"] - b.s["pos"]["entry"]) < 1e-9
b.on_bar(bar(2, 3502, 3502.1, 3500.0, 3500.2))
ex = [x for x in kinds(d) if x["kind"] == "EXIT"][0]
assert ex["reason"] == "stop" and -0.35 * 3 < ex["pnl"] / b.s["equity"] * 0 + ex["pnl"] / 8.57 < 0, ex
risk.BREAKEVEN_AT_R = None
print("test_broker: 11/11 checks passed")
