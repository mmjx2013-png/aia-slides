"""Code-only books that mirror the AI book's trades (same entry and exit times and prices) in the
owner's REAL account size: 70 USD. PAPER ONLY, 0 tokens.

real70_paxg        LONG ONLY (cash when the AI is short or flat). PAXG spot, fractional qty, no leverage (notional <= 1x equity), 0.10% fee per side
                   on top of the desk's fill price; size = min(2% risk at the stop, 1x equity).
real70_xau_minlot  XAU CFD, always exactly 0.01 lot = 1 oz (the broker minimum; 1 USD P&L per 1 USD move),
                   0.30 USD/oz spread per side, margin 1:100, stop-out when equity <= 50% of margin
                   (checked on each bar's worst price). A stopped-out (or under-margined) account stays dead.
aggr30             the owner's "+30% a week" target in practice: 20% of equity at risk per trade, notional capped
                   at 10x, the main book's fill prices (0.35/oz per side), margin = notional / 10, stop-out at 50%
                   margin level; dead stays dead.
PAXG prices stand in for XAU (about 1:1).
"""
import json
from pathlib import Path

from common import bkk, jappend, jdump

CAPITAL = 70.0
SPECS = {
    "real70_paxg": dict(kind="spot", fee=0.001, risk=0.02, long_only=True),
    "real70_xau_minlot": dict(kind="cfd", qty=1.0, spread=0.30, margin=0.01, stop_out=0.50),
    "aggr30": dict(kind="lev", risk=0.20, lev=10, cost=0.35, stop_out=0.50),
}
TARGET_WEEK = 0.30


class Follower:
    def __init__(self, d, name):
        self.d, self.name, self.k = Path(d), name, SPECS[name]
        self.d.mkdir(parents=True, exist_ok=True)
        f = self.d / "state.json"
        self.s = json.loads(f.read_text()) if f.exists() else dict(equity=CAPITAL, peak=CAPITAL, maxdd=0.0, pos=None, dead=None)

    def log(self, kind, t, **kw):
        jappend(self.d / "journal.jsonl", dict(kind=kind, t=str(bkk(t))[:19], t_ms=int(t), **kw))

    def save(self):
        jdump(self.d / "state.json", self.s)

    def mtm(self, px):
        p = self.s["pos"]
        return self.s["equity"] + (p["dir"] * p["qty"] * (px - p["entry"]) if p else 0.0)

    def open(self, t, d, raw, stop, fill):
        """raw = bar open; fill = the AI's fill price (raw +/- 0.35); stop = the AI's stop."""
        s, k = self.s, self.k
        if s["dead"] or s["pos"] or (k.get("long_only") and d < 0):
            return
        eq = s["equity"]
        if k["kind"] == "spot":
            px = fill * (1 + d * k["fee"])
            qty = min(k["risk"] * eq / (abs(px - stop) + 2 * k["fee"] * px), eq / px)
        elif k["kind"] == "lev":
            px = fill
            qty = min(k["risk"] * eq / (abs(raw - stop) + 2 * k["cost"]), k["lev"] * eq / raw)
        else:
            px, qty = raw + d * k["spread"], k["qty"]
            if eq < qty * raw * k["margin"]:
                s["dead"] = str(bkk(t))[:16]
                return self.log("DEAD", t, reason=f"equity {eq:.2f} below the margin {qty * raw * k['margin']:.2f} for 1 oz")
        s["pos"] = dict(dir=d, qty=qty, entry=px, t=t)
        risk = qty * abs(px - stop)
        self.log("FILL", t, side="BUY" if d > 0 else "SELL", qty=round(qty, 5), px=round(px, 2),
                 notional=round(qty * raw, 2), risk_usd=round(risk, 2), risk_pct=round(100 * risk / eq, 1))

    def close(self, t, raw, fill, reason):
        p = self.s["pos"]
        if not p:
            return
        k = self.k
        px = fill * (1 - p["dir"] * k["fee"]) if k["kind"] == "spot" else fill if k["kind"] == "lev" else raw - p["dir"] * k["spread"]
        self._settle(t, px, reason)

    def _settle(self, t, px, reason):
        p, s = self.s["pos"], self.s
        pnl = p["dir"] * p["qty"] * (px - p["entry"])
        s["equity"] = max(s["equity"] + pnl, 0.0)
        s["pos"] = None
        self.log("EXIT", t, reason=reason, px=round(px, 2), pnl=round(pnl, 2), equity=round(s["equity"], 2))

    def bar(self, b, write):
        s, p, k = self.s, self.s["pos"], self.k
        if p and k["kind"] in ("cfd", "lev"):
            margin = p["qty"] * p["entry"] * (k["margin"] if k["kind"] == "cfd" else 1 / k["lev"])
            cost = k["spread"] if k["kind"] == "cfd" else k["cost"]
            worst = b["l"] if p["dir"] > 0 else b["h"]
            if self.mtm(worst - p["dir"] * cost) <= k["stop_out"] * margin:
                lvl = p["entry"] + (k["stop_out"] * margin - s["equity"]) / (p["dir"] * p["qty"])
                raw = b["o"] if (p["dir"] > 0 and b["o"] < lvl) or (p["dir"] < 0 and b["o"] > lvl) else lvl
                self._settle(b["t"], raw, "broker stop-out (margin level 50%)")
                s["dead"] = str(bkk(b["t"]))[:16]
                self.log("STOP_OUT", b["t"], equity=round(s["equity"], 2))
        m = self.mtm(b["c"])
        s["peak"] = max(s["peak"], m)
        s["maxdd"] = max(s["maxdd"], 100 * (1 - m / s["peak"]) if s["peak"] else 0)
        if write:
            with open(self.d / "equity.csv", "a") as f:
                if f.tell() == 0:
                    f.write("t,equity,px\n")
                f.write(f"{b['t']},{m:.2f},{b['c']:.2f}\n")


class Daily2100:
    """real70_follow_2100: what the owner can do by hand with REAL 70 USD (we stay paper): once a day at
    the 21:02 run, look at the AI main book. Long -> buy (or hold); flat or short -> sell to cash. LONG ONLY,
    no leverage, fill at the 21:02 PAXG price + 0.5% fee per side, size = min(2% risk to the AI's current
    stop, 100% of equity). Between runs it exits on its stop (checked on 1m bars; a gap fills at the open).
    The stop is the AI's stop at the last run (the owner moves the stop order once a day, tighter only)."""
    FEE, RISK = 0.005, 0.02

    def __init__(self, d):
        self.d = Path(d)
        self.d.mkdir(parents=True, exist_ok=True)
        f = self.d / "state.json"
        self.s = json.loads(f.read_text()) if f.exists() else dict(equity=CAPITAL, peak=CAPITAL, maxdd=0.0, pos=None,
                                                                    dead=None, last_run=None)

    log, save, mtm = Follower.log, Follower.save, Follower.mtm

    def open(self, *a):      # ignores the AI's intraday fills: it acts only at the daily run
        pass

    def close(self, *a):
        pass

    def bar(self, b, write):
        s, p = self.s, self.s["pos"]
        if p and b["l"] <= p["stop"]:
            raw = min(b["o"], p["stop"])
            self._exit(b["t"], raw, "stop (owner's stop order)")
        m = self.mtm(b["c"])
        s["peak"] = max(s["peak"], m)
        s["maxdd"] = max(s["maxdd"], 100 * (1 - m / s["peak"]))
        if write:
            with open(self.d / "equity.csv", "a") as f:
                if f.tell() == 0:
                    f.write("t,equity,px\n")
                f.write(f"{b['t']},{m:.2f},{b['c']:.2f}\n")

    def _exit(self, t, raw, reason):
        p, s = self.s["pos"], self.s
        px = raw * (1 - self.FEE)
        pnl = p["qty"] * (px - p["entry"])
        s["equity"] += pnl
        s["pos"] = None
        self.log("EXIT", t, reason=reason, px=round(px, 2), pnl=round(pnl, 2), equity=round(s["equity"], 2))

    def daily(self, t, px, ai_pos):
        """The 21:02 decision at price px. Returns the owner's instruction line."""
        s, p = self.s, self.s["pos"]
        s["last_run"] = str(bkk(t))[:16]
        if ai_pos and ai_pos["dir"] > 0:
            stop = float(ai_pos["stop"])
            if p:
                if stop > p["stop"]:
                    self.log("STOP_MOVE", t, old=round(p["stop"], 2), new=round(stop, 2))
                    p["stop"] = stop
                line = f"REAL70: HOLD (stop {p['stop']:.2f})"
            elif stop < px:
                buy = px * (1 + self.FEE)
                qty = min(self.RISK * s["equity"] / (buy - stop * (1 - self.FEE)), s["equity"] / buy)
                s["pos"] = dict(dir=1, qty=qty, entry=buy, stop=stop, t=t)
                self.log("FILL", t, side="BUY", qty=round(qty, 5), px=round(buy, 2), usd=round(qty * px, 2), stop=round(stop, 2))
                line = f"REAL70: BUY {qty * px:.2f} USD (stop {stop:.2f})"
            else:
                line = "REAL70: STAY CASH"
        elif p:
            self._exit(t, px, "daily run: AI not long")
            line = "REAL70: SELL ALL"
        else:
            line = "REAL70: STAY CASH"
        self.log("DAILY", t, px=round(px, 2), ai=("long" if ai_pos and ai_pos["dir"] > 0 else "short" if ai_pos else "flat"),
                 instruction=line, equity=round(self.mtm(px), 2))
        self.save()
        return line + f"; follower book equity {self.mtm(px):.2f} USD (start 70)"
