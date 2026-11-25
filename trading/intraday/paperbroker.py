"""Paper broker for the intraday PAXG desk. PAPER ONLY: nothing connects to an exchange.

- An order fills at the OPEN of the first 1m bar that starts after the decision,
  at open +/- (0.25 half spread + 0.10 slippage) USD/oz. Exits pay the same.
- Stop and target are checked on every 1m bar. If both are touched in one bar,
  the STOP is assumed. A gap through the stop fills at the bar open.
- Flat at the 03:30 Bangkok bar open; daily loss limit closes at the bar close.
- Shadow books replay the same entries/exits at 1x/10x/30x notional, with
  liquidation when equity <= 50% of used margin (checked on the bar's worst price).
State lives in <dir>/state.json; the watcher process owns it. The desk only writes
<dir>/pending_order.json, which the broker consumes at the next bar.
"""
import time
from pathlib import Path

import risk
from common import bkk, jappend, jdump, jlines
import json


class Broker:
    def __init__(self, d):
        self.d = Path(d)
        self.d.mkdir(parents=True, exist_ok=True)
        f = self.d / "state.json"
        self.s = json.loads(f.read_text()) if f.exists() else dict(
            equity=risk.CAPITAL, pos=None, day=None, day_start=risk.CAPITAL, halted=None,
            last_t=None, start_t=None, start_px=None, last_range=None, last_atr1=None,
            shadows={str(L): dict(eq=risk.CAPITAL, qty=0.0, dead=None) for L in risk.SHADOW_LEVS})

    # ------------------------------------------------------------ helpers
    def log(self, kind, t_ms, **kw):
        jappend(self.d / "journal.jsonl", dict(kind=kind, t=str(bkk(t_ms))[:19], **kw))

    def mtm(self, px):
        p = self.s["pos"]
        return self.s["equity"] + (p["dir"] * p["qty"] * (px - p["entry"]) if p else 0.0)

    def save(self):
        jdump(self.d / "state.json", self.s)

    # ------------------------------------------------------------ orders
    def _take_order(self, b):
        f = self.d / "pending_order.json"
        if not f.exists():
            return
        o = json.loads(f.read_text())
        if o["created_ms"] > b["t"]:
            return                                          # decided after this bar opened
        f.unlink()
        if b["t"] - o["created_ms"] > risk.ORDER_TTL_MS:
            return self.log("REJECT", b["t"], event=o["event"], reason="stale order (not filled within 5 min)")
        ok, why = risk.entry_gate(self.s, b["t"])
        if not ok:
            return self.log("REJECT", b["t"], event=o["event"], reason=why)
        d, eq = o["dir"], self.s["equity"]
        stop_dist = o["stop_atr"] * o["atr5"]
        qty, capped = risk.size(eq, b["o"], stop_dist, o["risk_pct"])
        px = b["o"] + d * risk.COST
        self.s["pos"] = dict(dir=d, qty=qty, entry=px, stop=px - d * stop_dist,
                             target=px + d * o["target_r"] * stop_dist, t=b["t"], event=o["event"])
        risk_usd = qty * (stop_dist + 2 * risk.COST)
        self.log("FILL", b["t"], event=o["event"], side="BUY" if d > 0 else "SELL", qty=round(qty, 3),
                 px=round(px, 2), stop=round(px - d * stop_dist, 2),
                 target=round(px + d * o["target_r"] * stop_dist, 2),
                 lev=round(qty * b["o"] / eq, 2), risk_pct=round(100 * risk_usd / eq, 3),
                 lev_capped=capped, why=o.get("why", ""))
        for L, sh in self.s["shadows"].items():
            if not sh["dead"]:
                sh["qty"], sh["entry"] = float(L) * sh["eq"] / b["o"], px

    def _close(self, b, raw_px, reason):
        p = self.s["pos"]
        px = raw_px - p["dir"] * risk.COST
        pnl = p["dir"] * p["qty"] * (px - p["entry"])
        self.s["equity"] += pnl
        for sh in self.s["shadows"].values():
            if not sh["dead"] and sh["qty"]:
                sh["eq"] += p["dir"] * sh["qty"] * (px - sh["entry"])
                sh["qty"] = 0.0
        self.log("EXIT", b["t"], event=p["event"], reason=reason, px=round(px, 2), pnl=round(pnl, 2),
                 equity=round(self.s["equity"], 2), minutes=int((b["t"] - p["t"]) / 60_000))
        self.s["pos"] = None

    def _shadow_liq(self, b, d):
        for L, sh in self.s["shadows"].items():
            if sh["dead"] or not sh["qty"]:
                continue
            margin = sh["qty"] * sh["entry"] / float(L)
            worst = b["l"] if d > 0 else b["h"]
            if sh["eq"] + d * sh["qty"] * (worst - sh["entry"]) <= risk.STOP_OUT * margin:
                liq = sh["entry"] + (risk.STOP_OUT * margin - sh["eq"]) / (d * sh["qty"])
                px = b["o"] if (d > 0 and b["o"] < liq) or (d < 0 and b["o"] > liq) else liq
                sh["eq"] = max(sh["eq"] + d * sh["qty"] * (px - risk.COST * d - sh["entry"]), 0.0)
                sh["qty"], sh["dead"] = 0.0, str(bkk(b["t"]))[:16]
                self.log("LIQUIDATED", b["t"], book=f"{L}x", px=round(px, 2))

    # ------------------------------------------------------------ one bar
    def on_bar(self, b):
        """b: dict(t=open ms, o, h, l, c, atr1, rng). Bars must arrive in order."""
        if self.s["last_t"] is not None and b["t"] <= self.s["last_t"]:
            return
        s = self.s
        if s["start_t"] is None:
            s["start_t"], s["start_px"] = b["t"], b["o"]
        day = risk.bkk_day(b["t"])
        if day != s["day"]:
            s["day"], s["day_start"] = day, self.mtm(b["o"])
        if s["pos"] and risk.in_flat_window(b["t"]):
            self._close(b, b["o"], "flat by 03:30 Bangkok")
        self._take_order(b)
        p = s["pos"]
        if p:
            d = p["dir"]
            self._shadow_liq(b, d)
            stop_hit = b["l"] <= p["stop"] if d > 0 else b["h"] >= p["stop"]
            tgt_hit = b["h"] >= p["target"] if d > 0 else b["l"] <= p["target"]
            if stop_hit:                                    # stop wins a same-bar tie
                gap = (b["o"] < p["stop"]) if d > 0 else (b["o"] > p["stop"])
                self._close(b, b["o"] if gap else p["stop"], "stop")
            elif tgt_hit:
                gap = (b["o"] > p["target"]) if d > 0 else (b["o"] < p["target"])
                self._close(b, b["o"] if gap else p["target"], "target")
        if s["pos"] and self.mtm(b["c"]) <= s["day_start"] * (1 - risk.DAILY_LOSS):
            self._close(b, b["c"], "daily loss limit 3%")
            s["halted"] = day
        elif not s["pos"] and s["equity"] <= s["day_start"] * (1 - risk.DAILY_LOSS):
            s["halted"] = day
        s["last_t"], s["last_range"], s["last_atr1"] = b["t"], b["rng"], b["atr1"]
        sh = {L: round(x["eq"] + (self.s["pos"]["dir"] * x["qty"] * (b["c"] - x["entry"])
                                  if self.s["pos"] and x["qty"] else 0), 2)
              for L, x in s["shadows"].items()}
        with open(self.d / "equity.csv", "a") as f:
            if f.tell() == 0:
                f.write("t,equity,px," + ",".join(f"x{L}" for L in sh) + "\n")
            f.write(f"{b['t']},{self.mtm(b['c']):.2f},{b['c']:.2f}," + ",".join(f"{v:.2f}" for v in sh.values()) + "\n")


def write_order(d, event, dec, created_ms=None):
    """Called by the desk after the model decided to enter. Risk clamps applied here
    and again at the fill. Returns the order dict."""
    o = risk.clamp(dec)
    o.update(event=event["id"], atr5=event["atr5"], why=str(dec.get("why", ""))[:200],
             created_ms=int(created_ms if created_ms is not None else time.time() * 1000))
    jdump(Path(d) / "pending_order.json", o)
    return o
