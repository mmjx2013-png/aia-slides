"""Swing paper broker for PAXG. PAPER ONLY: nothing connects to an exchange.

Driven by REPLAYING closed 1m bars at each wake, so stops, targets, breakeven, forced closes and
halts are exact without live monitoring. Every decision is written as <dir>/pending.json with its
decision time; it executes at the OPEN of the first 1m bar that starts at or after that time.

- Fill = bar open +/- 0.35 USD/oz (half spread 0.25 + slippage 0.10); exits pay the same.
- Stop wins a same-bar tie with the target; a gap through a level fills at the bar open.
- Breakeven: after +1R the stop moves to entry, from the next bar.
- Forced closes at the bar open: 5 min before any USD High event, Sat 03:30 Bangkok (no weekend
  holds), after 5 days held.
- Risk profile (rules.MAIN / rules.ONE_PCT): risk per trade, daily halt (rest of the Bangkok day),
  weekly halt (rest of the week), kill switch from the equity peak (flat for good; the desk sends the ERROR).
- Shadow books take the same entries and exits at fixed 1x/3x/10x/30x notional, with
  liquidation when equity <= 50% of used margin (checked on the bar's worst price).
"""
import json
from pathlib import Path

import rules as R
from common import bkk, jappend, jdump


class Broker:
    def __init__(self, d, capital=R.CAPITAL, shadows=R.SHADOW_LEVS, profile=R.MAIN):
        self.d = Path(d)
        self.k = profile
        self.followers = []                                  # follower.Follower books (code only)
        self.d.mkdir(parents=True, exist_ok=True)
        f = self.d / "state.json"
        self.s = json.loads(f.read_text()) if f.exists() else dict(
            equity=capital, peak=capital, pos=None, day=None, day_start=capital, week=None,
            week_start=capital, halted_day=None, halted_week=None, killed=None, last_t=None,
            start_t=None, start_px=None, shadows={str(L): dict(eq=capital, qty=0.0, entry=None, dead=None)
                                                    for L in shadows})

    # ------------------------------------------------------------ helpers
    def log(self, kind, t_ms, **kw):
        jappend(self.d / "journal.jsonl", dict(kind=kind, t=str(bkk(t_ms))[:19], t_ms=int(t_ms), **kw))

    def mtm(self, px):
        p = self.s["pos"]
        return self.s["equity"] + (p["dir"] * p["qty"] * (px - p["entry"]) if p else 0.0)

    def save(self):
        jdump(self.d / "state.json", self.s)
        for f in self.followers:
            f.save()

    def pending(self):
        f = self.d / "pending.json"
        return json.loads(f.read_text()) if f.exists() else None

    def entry_block(self, t_ms):
        s = self.s
        if s["killed"]:
            return f"kill switch: -{100 * self.k['kill']:.0f}% from peak, desk stopped"
        if s["pos"]:
            return "position already open"
        if s["halted_day"] == R.day_key(t_ms):
            return f"daily loss limit -{100 * self.k['daily']:.0f}%: halted for the Bangkok day"
        if s["halted_week"] == R.week_key(t_ms):
            return f"weekly loss limit -{100 * self.k['weekly']:.0f}%: halted for the week"
        if R.no_entry_time(t_ms):
            return "weekend: no entries Sat 00:00 - Mon 05:00 Bangkok"
        return R.calendar_block(t_ms)

    # ------------------------------------------------------------ actions
    def _open(self, b, o):
        why = self.entry_block(b["t"])
        d = o["dir"]
        px = b["o"] + d * R.COST
        if not why and ((d > 0 and not o["stop"] < b["o"] < o["target"]) or (d < 0 and not o["target"] < b["o"] < o["stop"])):
            why = f"open {b['o']:.2f} is already past the stop {o['stop']:.2f} or target {o['target']:.2f}"
        if why:
            return self.log("REJECT", b["t"], id=o["id"], reason=why)
        eq = self.s["equity"]
        dist = abs(b["o"] - o["stop"])
        risk = o.get("risk") or self.k["risk"]                # per-order risk (p-sized / Kelly books) or the profile's
        qty, binding = R.size(eq, b["o"], dist, o.get("lev", R.BASE_LEV), risk)
        self.s["pos"] = dict(dir=d, qty=qty, entry=px, stop=o["stop"], stop0=o["stop"], target=o["target"],
                             t=b["t"], id=o["id"], be=False, p=o.get("p_target"))
        self.log("FILL", b["t"], id=o["id"], side="BUY" if d > 0 else "SELL", qty=round(qty, 4), px=round(px, 2),
                 stop=o["stop"], target=o["target"], lev=round(qty * b["o"] / eq, 2), lev_chosen=o.get("lev"),
                 lev_requested=o.get("lev_req"), binding=binding, risk_rule=o.get("risk_rule"),
                 risk_pct=round(100 * qty * (dist + 2 * R.COST) / eq, 3), p_target=o.get("p_target"))
        for f in self.followers:
            f.open(b["t"], d, b["o"], o["stop"], px)
        for L, sh in self.s["shadows"].items():
            if not sh["dead"]:
                sh["qty"], sh["entry"] = float(L) * sh["eq"] / b["o"], px

    def _close(self, b, raw_px, reason):
        p = self.s["pos"]
        px = raw_px - p["dir"] * R.COST
        pnl = p["dir"] * p["qty"] * (px - p["entry"])
        for f in self.followers:
            f.close(b["t"], raw_px, px, reason)
        r_mult = p["dir"] * (px - p["entry"]) / (abs(p["entry"] - p["stop0"]) + R.COST)
        self.s["equity"] += pnl
        for sh in self.s["shadows"].values():
            if not sh["dead"] and sh["qty"]:
                sh["eq"] += p["dir"] * sh["qty"] * (px - sh["entry"])
                sh["qty"] = 0.0
        self.log("EXIT", b["t"], id=p["id"], reason=reason, px=round(px, 2), pnl=round(pnl, 2), r=round(r_mult, 3),
                 equity=round(self.s["equity"], 2), hours=round((b["t"] - p["t"]) / 3600_000, 1), p_target=p.get("p"))
        self.s["pos"] = None

    def _take_pending(self, b):
        o = self.pending()
        if not o or o["created_ms"] > b["t"]:
            return
        (self.d / "pending.json").unlink()
        if b["t"] - o["created_ms"] > R.ORDER_TTL_MS:
            return self.log("REJECT", b["t"], id=o["id"], reason="stale: no bar within 15 min of the decision")
        p, a = self.s["pos"], o["action"]
        if a == "open":
            return self._open(b, o)
        if not p:
            return self.log("REJECT", b["t"], id=o["id"], reason=f"{a}: no open position")
        if a == "close":
            return self._close(b, b["o"], "PM close")
        if a == "tighten":
            ns, d = o["stop"], p["dir"]
            if (d > 0 and p["stop"] < ns < b["o"]) or (d < 0 and b["o"] < ns < p["stop"]):
                self.log("TIGHTEN", b["t"], id=o["id"], old=round(p["stop"], 2), new=ns)
                p["stop"] = ns
            else:
                self.log("REJECT", b["t"], id=o["id"], reason=f"tighten to {ns}: not between stop {p['stop']:.2f} and price {b['o']:.2f}")

    def _shadow_liq(self, b, d):
        for L, sh in self.s["shadows"].items():
            if sh["dead"] or not sh["qty"]:
                continue
            margin = sh["qty"] * sh["entry"] / float(L)
            worst = b["l"] if d > 0 else b["h"]
            if sh["eq"] + d * sh["qty"] * (worst - sh["entry"]) <= R.STOP_OUT * margin:
                liq = sh["entry"] + (R.STOP_OUT * margin - sh["eq"]) / (d * sh["qty"])
                px = b["o"] if (d > 0 and b["o"] < liq) or (d < 0 and b["o"] > liq) else liq
                sh["eq"] = max(sh["eq"] + d * sh["qty"] * (px - R.COST * d - sh["entry"]), 0.0)
                sh["qty"], sh["dead"] = 0.0, str(bkk(b["t"]))[:16]
                self.log("LIQUIDATED", b["t"], book=f"{L}x", px=round(px, 2))

    # ------------------------------------------------------------ one bar
    def on_bar(self, b):
        """b: dict(t=open ms, o, h, l, c). Bars must arrive in order; repeats are ignored."""
        s = self.s
        if s["last_t"] is not None and b["t"] <= s["last_t"]:
            return
        if s["start_t"] is None:
            s["start_t"], s["start_px"] = b["t"], b["o"]
        day, week = R.day_key(b["t"]), R.week_key(b["t"])
        if day != s["day"]:
            s["day"], s["day_start"] = day, self.mtm(b["o"])
        if week != s["week"]:
            s["week"], s["week_start"] = week, self.mtm(b["o"])
        if s["pos"]:
            ev = R.calendar_close(b["t"])
            if ev:
                self._close(b, b["o"], f"calendar: close before {ev}")
            elif R.weekend_close(b["t"]):
                self._close(b, b["o"], "weekend: flat by Sat 03:30 Bangkok")
            elif b["t"] - s["pos"]["t"] >= R.MAX_HOLD_MS:
                self._close(b, b["o"], "max hold 5 days")
        self._take_pending(b)
        p = s["pos"]
        if p:
            d = p["dir"]
            self._shadow_liq(b, d)
            stop_hit = b["l"] <= p["stop"] if d > 0 else b["h"] >= p["stop"]
            tgt_hit = b["h"] >= p["target"] if d > 0 else b["l"] <= p["target"]
            if stop_hit:                                    # stop wins a same-bar tie
                gap = (b["o"] < p["stop"]) if d > 0 else (b["o"] > p["stop"])
                self._close(b, b["o"] if gap else p["stop"], "breakeven stop" if p["be"] and p["stop"] == p["entry"] else "stop")
            elif tgt_hit:
                gap = (b["o"] > p["target"]) if d > 0 else (b["o"] < p["target"])
                self._close(b, b["o"] if gap else p["target"], "target")
            elif R.BREAKEVEN_AT_R and not p["be"]:          # takes effect from the NEXT bar
                one_r = abs(p["entry"] - p["stop0"]) * R.BREAKEVEN_AT_R
                if (b["h"] >= p["entry"] + one_r) if d > 0 else (b["l"] <= p["entry"] - one_r):
                    p["be"] = True
                    if (d > 0 and p["stop"] < p["entry"]) or (d < 0 and p["stop"] > p["entry"]):
                        p["stop"] = p["entry"]
                        self.log("BREAKEVEN", b["t"], id=p["id"], stop=round(p["entry"], 2))
        m = self.mtm(b["c"])
        if not s["killed"] and m <= s["peak"] * (1 - self.k["kill"]):
            if s["pos"]:
                self._close(b, b["c"], f"kill switch -{100 * self.k['kill']:.0f}% from peak")
            s["killed"] = str(bkk(b["t"]))[:16]
            self.log("KILL", b["t"], equity=round(s["equity"], 2), peak=round(s["peak"], 2))
        if m <= s["day_start"] * (1 - self.k["daily"]) and s["halted_day"] != day:
            if s["pos"]:
                self._close(b, b["c"], f"daily loss limit -{100 * self.k['daily']:.0f}%")
            s["halted_day"] = day
            self.log("HALT", b["t"], scope="day", equity=round(s["equity"], 2))
        if m <= s["week_start"] * (1 - self.k["weekly"]) and s["halted_week"] != week:
            if s["pos"]:
                self._close(b, b["c"], f"weekly loss limit -{100 * self.k['weekly']:.0f}%")
            s["halted_week"] = week
            self.log("HALT", b["t"], scope="week", equity=round(s["equity"], 2))
        m = self.mtm(b["c"])
        s["peak"] = max(s["peak"], m)
        s["last_t"] = b["t"]
        bk = bkk(b["t"])
        for f in self.followers:
            f.bar(b, bk.minute % 15 == 14 or bool(f.s["pos"]))
        if bk.minute % 15 == 14 or s["pos"] or p:            # every 15 min, and every bar while in a trade
            sh = {L: round(x["eq"] + (s["pos"]["dir"] * x["qty"] * (b["c"] - x["entry"]) if s["pos"] and x["qty"] else 0), 2)
                  for L, x in s["shadows"].items()}
            with open(self.d / "equity.csv", "a") as f:
                if f.tell() == 0:
                    f.write("t,equity,px" + "".join(f",x{L}" for L in sh) + "\n")
                f.write(f"{b['t']},{m:.2f},{b['c']:.2f}" + "".join(f",{v:.2f}" for v in sh.values()) + "\n")


def write_pending(d, action, created_ms, **kw):
    o = dict(action=action, created_ms=int(created_ms), **kw)
    jdump(Path(d) / "pending.json", o)
    return o
