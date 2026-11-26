"""News-desk EXECUTOR (PAPER ONLY), code plus a fast Venice model. Runs from T-5 min to T+40 min.

  python3 news_exec.py run <event_id>                        live (start it at T-5 min; ~45 min)
  python3 news_exec.py sim <event_id> --actual 0.4 --at 45   replay a past release on cached 1m bars
                                                             with a simulated actual feed (a headline at T+45 s)
Live feeds: PAXGUSDT 1s klines from data-api.binance.vision every 5 s (1m if 1s fails); the calendar JSON
every 60 s (it carries no 'actual' field today, so headlines are the real source); Google News RSS for the
event headline every 15 s, parsed by Venice (strict JSON, then a code sanity check against the forecast).
The playbook (news/<id>/playbook.json) is mapped to a scenario in CODE: surprise scenarios once a confident
actual is known within no_actual_after_s, otherwise the fallback (reaction-only or stay out).
Event costs T-2..T+10 min: spread 1.50 + slippage 1.00 USD/oz per side on market fills (limit = spread only);
outside that window the desk's 0.25 + 0.10. Stops fill at the worse of the stop and the bar open.
Every timestamp is logged; latency is part of the result.
"""
import argparse
import json
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

import pandas as pd

import env  # noqa: F401
import officials
import venice
from common import bkk, load_cache
from newsdesk import NEWS, CAPITAL, RISK

KL = "https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval={iv}&limit=1000&startTime={st}"
EV_SPREAD, EV_SLIP, SPREAD, SLIP = 1.50, 1.00, 0.25, 0.10


class Exec:
    def __init__(self, event_id, sim=None):
        self.id, self.d = event_id, NEWS / event_id
        self.meta = json.loads((self.d / "event.json").read_text())
        self.pb = json.loads((self.d / "playbook.json").read_text())
        self.T = self.meta["t_ms"]
        self.sim = sim
        self.log_rows = []
        self.bars = pd.DataFrame(columns=["t", "o", "h", "l", "c", "dur"])
        self.heads, self.seen = [], set()
        self.actual = {}                  # indicator -> (value, t_obtained, source): the first source wins
        self.headline_lat = {}            # indicator -> seconds after T the headline path got it (kept for comparison)
        self.official_lat = {}            # indicator -> (seconds after T, source)
        srcs = {officials.source_for(e["title"]) for e in self.meta["events"]} - {None}
        self.pollers = {s: officials.Poller(s) for s in srcs}
        self.pos, self.trades, self.reversals = None, [], 0
        self.decided, self.decision = False, None
        self.pending = None               # (dir, scenario, t_decided)
        self.model = None
        bk = NEWS / "book.json"
        self.equity = json.loads(bk.read_text())["equity"] if bk.exists() else CAPITAL
        self.eq0 = self.equity

    # ------------------------------------------------------------ logging
    def log(self, t, kind, **kw):
        row = dict(t=str(bkk(t))[:23], t_ms=int(t), dt_s=round((t - self.T) / 1000, 1), kind=kind, **kw)
        self.log_rows.append(row)
        print(json.dumps(row), flush=True)

    # ------------------------------------------------------------ feeds
    def feed(self, now):
        if self.sim:
            m1 = self.sim["m1"]
            x = m1[(m1["t"] + 60_000 <= now) & (m1["t"] >= self.T - 10 * 60_000)]
            self.bars = pd.DataFrame(dict(t=x["t"].values, o=x["o"].values, h=x["h"].values, l=x["l"].values,
                                          c=x["c"].values, dur=60_000))
            for at, h in self.sim["heads"]:
                if self.T + at * 1000 <= now and h not in self.seen:
                    self.seen.add(h)
                    self.heads.append((self.T + at * 1000, h))
            return
        st = int(self.bars["t"].iloc[-1]) + 1000 if len(self.bars) else self.T - 10 * 60_000
        for iv, dur in (("1s", 1000), ("1m", 60_000)):
            try:
                with urllib.request.urlopen(urllib.request.Request(KL.format(iv=iv, st=st), headers={"User-Agent": "paper-desk/1.0"}), timeout=10) as r:
                    rows = [x for x in json.load(r) if x[6] < time.time() * 1000]
                new = pd.DataFrame([[x[0], *map(float, x[1:5]), dur] for x in rows], columns=["t", "o", "h", "l", "c", "dur"])
                self.bars = pd.concat([self.bars, new]).drop_duplicates("t", keep="last").sort_values("t") if len(new) else self.bars
                return
            except Exception as e:
                self.log(now, "FEED_ERROR", interval=iv, error=f"{type(e).__name__}")

    def news(self, now):
        if self.sim:
            return
        for e in self.meta["events"]:
            q = urllib.parse.urlencode({"q": f"{e['title']} when:1h", "hl": "en-US", "gl": "US", "ceid": "US:en"})
            try:
                with urllib.request.urlopen(urllib.request.Request("https://news.google.com/rss/search?" + q,
                                                                   headers={"User-Agent": "paper-desk/1.0"}), timeout=8) as r:
                    root = ET.fromstring(r.read())
            except Exception:
                continue
            for it in root.iter("item"):
                ts = parsedate_to_datetime(it.findtext("pubDate")).timestamp() * 1000
                h = it.findtext("title") or ""
                if ts >= self.T - 60_000 and h not in self.seen:
                    self.seen.add(h)
                    self.heads.append((now, h))
                    self.log(now, "HEADLINE", published=str(bkk(ts))[:19], title=h[:160])

    def calendar(self, now):
        if self.sim:
            return
        import calendar_guard
        ok, _ = calendar_guard.refresh(force=True)
        if not ok:
            return
        for e in json.loads((calendar_guard.CACHE / "calendar.json").read_text()):
            a = e.get("actual")
            if a and e.get("country") == "USD" and e["title"] in {x["title"] for x in self.meta["events"]} and e["title"] not in self.actual:
                v = venice.num(a)
                ev = next(x for x in self.meta["events"] if x["title"] == e["title"])
                if venice.sane(v, ev["forecast"], ev["previous"]):
                    self.actual[e["title"]] = (v, now, "calendar")
                    self.log(now, "ACTUAL", indicator=e["title"], value=v, source="calendar", latency_s=round((now - self.T) / 1000, 1))

    def official(self, now):
        """Poll BEA / Fed every 3 s from T-1 to T+3 min; code extraction first, Venice only if that fails."""
        for src, p in self.pollers.items():
            try:
                new = p.poll() if not self.sim else self.sim_official(src, now)
            except Exception as e:
                self.log(now, "OFFICIAL_ERROR", source=src, error=type(e).__name__)
                continue
            for url, lt, txt, fs in new:
                self.log(now, "OFFICIAL_PAGE", source=src, url=url, title=lt[:100], fetch_s=fs)
                for ev in self.meta["events"]:
                    if officials.source_for(ev["title"]) != src or ev["title"] in self.official_lat or not officials.relevant(ev["title"], url):
                        continue
                    v, how = officials.extract(ev["title"], txt), "code"
                    if v is None:
                        r, _ = venice.parse(venice.PRIMARY, ev["title"], ev["forecast"], ev["previous"], [txt[:3000]])
                        v, how = (venice.normalize(r["actual"], ev["forecast"]) if r and r.get("confident") and r.get("actual") is not None else None), "venice"
                    if v is None or not venice.sane(v, ev["forecast"], ev["previous"]):
                        self.log(now, "OFFICIAL_NO_FIGURE", indicator=ev["title"], how=how, value=v)
                        continue
                    lat = round((now - self.T) / 1000, 1)
                    self.official_lat[ev["title"]] = (lat, f"{src} ({how})")
                    self.log(now, "ACTUAL", indicator=ev["title"], value=v, source=f"official {src} ({how})", latency_s=lat)
                    if ev["title"] not in self.actual:
                        self.actual[ev["title"]] = (v, now, f"official {src} ({how})")

    def sim_official(self, src, now):
        out = []
        for at, url in self.sim.get("official", []):
            if self.T + at * 1000 <= now and url not in self.seen and officials.source_for(self.meta["events"][0]["title"]) == src:
                self.seen.add(url)
                t0 = time.time()
                out.append((url, url.rsplit("/", 1)[-1], officials.text(officials._get(url)), round(time.time() - t0, 2)))
        return out

    def parse_actuals(self, now):
        need = {s["trigger"]["indicator"] for s in self.pb["scenarios"] if s["trigger"]["type"] == "surprise"} - set(self.headline_lat)
        fresh = [h for t, h in self.heads if t <= now]
        if not need or not fresh or self.parsed_n == len(fresh):
            return
        self.parsed_n = len(fresh)
        if self.model is None:
            self.model = venice.pick_model()["model"]
        for ind in need:
            ev = next(x for x in self.meta["events"] if x["title"] == ind)
            t0 = time.time()
            r, raw = venice.parse(self.model, ind, ev["forecast"], ev["previous"], fresh)
            used = self.model
            if not r:                                # primary failed: one try on the fallback model
                used = venice.FALLBACK
                r, raw = venice.parse(used, ind, ev["forecast"], ev["previous"], fresh)
            lat = round(time.time() - t0, 2)
            if r and r.get("actual") is not None:
                r["actual"] = venice.normalize(r["actual"], ev["forecast"])
            ok = bool(r) and r.get("confident") and venice.sane(r.get("actual"), ev["forecast"], ev["previous"])
            self.log(now, "VENICE", indicator=ind, model=used, reply=r if r else raw[:120], call_s=lat, accepted=bool(ok))
            if ok:
                self.headline_lat[ind] = round((now - self.T) / 1000, 1)
                if ind in self.actual:
                    continue
                self.actual[ind] = (float(r["actual"]), now, "headline+venice")
                self.log(now, "ACTUAL", indicator=ind, value=float(r["actual"]), source="headline+venice",
                         latency_s=round((now - self.T) / 1000, 1))

    # ------------------------------------------------------------ prices, costs
    def pre_px(self):
        x = self.bars[self.bars["t"] + self.bars["dur"] <= self.T]
        return float(x["c"].iloc[-1]) if len(x) else None

    def cost(self, t, market=True):
        ev = self.T - 2 * 60_000 <= t <= self.T + 10 * 60_000
        return (EV_SPREAD + (EV_SLIP if market else 0)) if ev else (SPREAD + (SLIP if market else 0))

    def window(self, a_s, b_s):
        x = self.bars[(self.bars["t"] >= self.T + a_s * 1000) & (self.bars["t"] + self.bars["dur"] <= self.T + b_s * 1000)]
        return x

    # ------------------------------------------------------------ decision
    def combined(self, now):
        """Code score over ALL releases at this time. Returns (scenario|None|'wait', why)."""
        cb, el = self.pb["combined"], (now - self.T) / 1000
        rel = cb["releases"]
        have = [r for r in rel if r["indicator"] in self.actual]
        if len(have) < len(rel) and el < self.pb["fallback"]["no_actual_after_s"]:
            return "wait", None                      # wait for every release, up to the window
        wsum = sum(r["weight"] for r in have)
        parts, score = [], 0.0
        for r in have:
            ev = next(x for x in self.meta["events"] if x["title"] == r["indicator"])
            z = (self.actual[r["indicator"]][0] - venice.num(ev["forecast"])) / r["typical_surprise"]
            g = r["gold_sign"] * z
            score += r["weight"] / wsum * g
            parts.append((r["indicator"], round(z, 2), round(g, 2)))
        d = 1 if score >= cb["buy_threshold"] else -1 if score <= -cb["sell_threshold"] else 0
        gs = [g for _, _, g in parts]
        conflict = (any(g > 0 for g in gs) and any(g < 0 for g in gs)) or \
                   (any(abs(z) < 0.5 for _, z, _ in parts) and any(abs(z) >= 1 for _, z, _ in parts))
        why = (f"score {score:+.2f} from " + ", ".join(f"{n.split()[0]} z {z:+.2f} gold {g:+.2f}" for n, z, g in parts) +
               (f" (missing: {', '.join(r['indicator'] for r in rel if r not in have)}; weights rescaled)" if len(have) < len(rel) else "") +
               f"; thresholds +{cb['buy_threshold']}/-{cb['sell_threshold']}" + ("; CONFLICT" if conflict else ""))
        self.combined_log = dict(score=round(score, 3), parts=parts, conflict=conflict)
        if not d:
            return None, why + " -> no trade"
        if conflict:
            if el < 60:
                return "wait", None                  # need the first 60 s of price
            pre, x = self.pre_px(), self.window(0, 60)
            mv = float(x["c"].iloc[-1]) - pre if len(x) and pre is not None else 0.0
            if d * mv < cb["confirm_usd"]:
                return None, why + f"; first 60 s {mv:+.2f} USD does not confirm by {cb['confirm_usd']} -> no trade"
            why += f"; first 60 s {mv:+.2f} USD confirms"
        s = dict(name="combined " + ("buy" if d > 0 else "sell"), direction="buy" if d > 0 else "sell",
                 stop_usd=cb["stop_usd"], target_usd=cb["target_usd"], max_hold_min=cb["max_hold_min"])
        return s, why

    def match(self, now):
        fb = self.pb["fallback"]
        el = (now - self.T) / 1000
        sc = self.pb["scenarios"]
        if self.pb.get("combined") and self.actual and el <= fb["no_actual_after_s"] + 30:
            return self.combined(now)
        if self.actual and el <= fb["no_actual_after_s"] + 30:
            for s in sc:
                tr = s["trigger"]
                if tr["type"] != "surprise" or tr["indicator"] not in self.actual:
                    continue
                ev = next(x for x in self.meta["events"] if x["title"] == tr["indicator"])
                sur = self.actual[tr["indicator"]][0] - venice.num(ev["forecast"])
                eps = 1e-9                       # 0.4 - 0.3 is 0.09999... in floating point
                hit = (sur >= tr["value"] - eps) if tr["op"] == ">=" else (sur <= tr["value"] + eps) if tr["op"] == "<=" else abs(sur) <= tr["value"] + eps
                if hit:
                    return s, f"surprise {sur:+.3g} {tr['op']} {tr['value']}"
            return None, "actual known, no surprise scenario matched"
        if el < fb["no_actual_after_s"]:
            return "wait", None
        if fb["mode"] != "reaction_only":
            return None, "no actual within the window; fallback = stay out"
        pre = self.pre_px()
        windows = [s for s in sc if s["trigger"]["type"] == "reaction"]
        if not windows or pre is None:
            return None, "no reaction scenario"
        for s in windows:
            w = s["trigger"]["window_s"]
            if el < w:
                continue
            x = self.window(0, w)
            if not len(x):
                continue
            mv = float(x["c"].iloc[-1]) - pre
            tr = s["trigger"]
            if (tr["op"] == ">=" and mv >= tr["move_usd"]) or (tr["op"] == "<=" and mv <= tr["move_usd"]):
                return s, f"reaction {mv:+.2f} USD in {w}s {tr['op']} {tr['move_usd']}"
        if el >= max(s["trigger"]["window_s"] for s in windows) + 5:
            return None, "no reaction scenario matched"
        return "wait", None

    def spiky(self):
        z = self.pb["contingency"].get("no_trade_if_both_ways_usd") or 0
        pre, x = self.pre_px(), self.window(0, 60)
        if not z or pre is None or not len(x):
            return False
        return x["h"].max() - pre > z and pre - x["l"].min() > z

    # ------------------------------------------------------------ orders
    def enter(self, b, d, s, why):
        c = self.cost(b["t"])
        px = b["o"] + d * c
        qty = RISK * self.equity / (s["stop_usd"] + 2 * c)
        self.pos = dict(dir=d, qty=qty, entry=px, stop=px - d * s["stop_usd"], target=px + d * s["target_usd"],
                        t=int(b["t"]), max_ms=int(s["max_hold_min"] * 60_000), scen=s["name"], best=px)
        self.log(b["t"], "FILL", side="BUY" if d > 0 else "SELL", qty=round(qty, 3), px=round(px, 2),
                 stop=round(self.pos["stop"], 2), target=round(self.pos["target"], 2), cost_per_side=c, scenario=s["name"], why=why)

    def exit(self, t, raw, reason, market=True):
        p = self.pos
        px = raw - p["dir"] * self.cost(t, market)
        pnl = p["dir"] * p["qty"] * (px - p["entry"])
        self.equity += pnl
        self.trades.append(dict(scenario=p["scen"], dir=p["dir"], entry=round(p["entry"], 2), exit=round(px, 2), pnl=round(pnl, 2),
                                reason=reason, held_s=round((t - p["t"]) / 1000)))
        self.log(t, "EXIT", reason=reason, px=round(px, 2), pnl=round(pnl, 2), equity=round(self.equity, 2))
        self.pos = None
        c = self.pb["contingency"]
        if reason in ("stop", "contingency: adverse move") and c.get("reverse_on_stop") and self.reversals < c.get("max_reversals", 0):
            self.reversals += 1
            s = next(x for x in self.pb["scenarios"] if x["name"] == p["scen"])
            self.pending = (-p["dir"], dict(s, name=s["name"] + " (reversed)"), t, "reverse once after " + reason)

    def manage(self, b):
        p = self.pos
        d = p["dir"]
        if (b["l"] <= p["stop"]) if d > 0 else (b["h"] >= p["stop"]):
            return self.exit(b["t"], min(p["stop"], b["o"]) if d > 0 else max(p["stop"], b["o"]), "stop")
        if (b["h"] >= p["target"]) if d > 0 else (b["l"] <= p["target"]):
            return self.exit(b["t"], max(p["target"], b["o"]) if d > 0 else min(p["target"], b["o"]), "target", market=False)
        c = self.pb["contingency"]
        if c.get("adverse_usd") and b["t"] - p["t"] <= c.get("adverse_within_min", 0) * 60_000:
            worst = b["l"] if d > 0 else b["h"]
            if d * (worst - (p["entry"] - d * self.cost(p["t"]))) <= -c["adverse_usd"]:
                return self.exit(b["t"] + b["dur"], b["c"], "contingency: adverse move")
        if b["t"] + b["dur"] - p["t"] >= p["max_ms"]:
            return self.exit(b["t"] + b["dur"], b["c"], "max hold")

    # ------------------------------------------------------------ loop
    def step(self, now):
        self.feed(now)
        done = set(self.done_bars)
        for _, b in self.bars[self.bars["t"] + self.bars["dur"] <= now].iterrows():
            if b["t"] in done:
                continue
            self.done_bars.append(b["t"])
            if self.pending and b["t"] >= self.pending[2]:
                d, s, _, why = self.pending
                self.pending = None
                self.enter(b, d, s, why)
            elif self.pos:
                self.manage(b)
        if self.pollers and self.T - 60_000 <= now <= self.T + 180_000 and now - self.last_off >= 3_000:
            self.official(now)
            self.last_off = now
        if self.decided and now <= self.T + 10 * 60_000 and now - self.last_news >= 15_000:
            self.news(now)                           # keep timing the headline path for the comparison
            self.last_news = now
            self.parse_actuals(now)
        if now >= self.T and not self.decided:
            if now - self.last_news >= 15_000:
                self.news(now)
                self.last_news = now
            if now - self.last_cal >= 60_000:
                self.calendar(now)
                self.last_cal = now
            self.parse_actuals(now)
            s, why = self.match(now)
            if s == "wait":
                return
            self.decided = True
            if s and s["direction"] != "none" and self.spiky():
                s, why = None, f"no trade: first 60 s spiked both ways > {self.pb['contingency']['no_trade_if_both_ways_usd']}"
            path = "actual" if self.actual and (now - self.T) / 1000 <= self.pb["fallback"]["no_actual_after_s"] + 30 else \
                ("fallback: " + self.pb["fallback"]["mode"])
            self.decision = dict(scenario=s["name"] if s else None, why=why, t_ms=now, path=path,
                                 combined=getattr(self, "combined_log", None))
            self.log(now, "DECISION", scenario=s["name"] if s else None, direction=s["direction"] if s else "none", why=why)
            if s and s["direction"] != "none":
                self.pending = (1 if s["direction"] == "buy" else -1, s, now, why)

    def run(self):
        self.done_bars, self.last_news, self.last_cal, self.parsed_n, self.last_off = [], 0, 0, 0, 0
        self.log(self.T, "RELEASE", events=[e["title"] for e in self.meta["events"]], mode="sim" if self.sim else "live")
        end = self.T + 40 * 60_000
        now = self.T - 5 * 60_000 if self.sim else int(time.time() * 1000)
        while now <= end:
            self.step(now)
            if self.sim:
                now += 5_000
            else:
                time.sleep(5 if now < self.T + 15 * 60_000 else 15)
                now = int(time.time() * 1000)
        if self.pos:
            last = self.bars.iloc[-1]
            self.exit(int(last["t"] + last["dur"]), float(last["c"]), "end of the 40-min window")
        acq = {k: dict(value=v[0], latency_s=round((v[1] - self.T) / 1000, 1), source=v[2],
                       official_latency_s=self.official_lat.get(k, (None,))[0], headline_latency_s=self.headline_lat.get(k))
               for k, v in self.actual.items()}
        res = dict(event_id=self.id, mode="sim" if self.sim else "live", events=self.meta["events"], summary=self.pb.get("summary"),
                   actual=acq, decision=self.decision, trades=self.trades, pnl=round(self.equity - self.eq0, 2),
                   equity=round(self.equity, 2), used_fallback=bool(self.decision and self.decision.get("path", "").startswith("fallback")),
                   opus_tokens=self.pb.get("opus_tokens"), venice_calls=venice.calls["n"],
                   venice_model=self.model, first_fill_latency_s=next(((r["t_ms"] - self.T) / 1000 for r in self.log_rows if r["kind"] == "FILL"), None))
        tag = "result_sim.json" if self.sim else "result.json"
        (self.d / tag).write_text(json.dumps(res, indent=1))
        (self.d / tag.replace("result", "log").replace(".json", ".jsonl")).write_text("\n".join(json.dumps(r) for r in self.log_rows) + "\n")
        if not self.sim:
            (NEWS / "book.json").write_text(json.dumps(dict(equity=round(self.equity, 2), updated=str(bkk(int(time.time() * 1000)))[:16])))
        return res


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["run", "sim"])
    ap.add_argument("event_id")
    ap.add_argument("--actual", type=float)
    ap.add_argument("--at", type=float, default=45, help="sim: seconds after the release when the headline appears")
    ap.add_argument("--headline")
    ap.add_argument("--official", nargs=2, action="append", metavar=("AT_S", "URL"),
                    help="sim: an official release page that appears at T+AT_S seconds")
    a = ap.parse_args()
    sim = None
    if a.mode == "sim":
        meta = json.loads((NEWS / a.event_id / "event.json").read_text())
        e = meta["events"][0]
        h = a.headline or (f"US {e['title']} comes in at {a.actual}{'%' if '%' in e['forecast'] else ''} vs {e['forecast']} expected"
                           if a.actual is not None else None)
        sim = dict(m1=load_cache(), heads=[(a.at, h)] if h else [], official=[(float(x), u) for x, u in (a.official or [])])
    r = Exec(a.event_id, sim).run()
    print("RESULT", json.dumps({k: r[k] for k in ("decision", "trades", "pnl", "actual", "venice_calls", "first_fill_latency_s")}))
