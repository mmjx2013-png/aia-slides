# Intraday gold PAPER desk (PAXG/USDT, 1m)

PAPER ONLY. Nothing connects to an exchange or broker; no key, no login. Runs on the Claude
subscription: the watcher is plain Python (0 tokens), models are used only when a setup fires.

Data: Binance public market data, `https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval=1m`
(not api.binance.com: 451). `common.py` enforces at most one request per minute across processes.
PAXG is a gold-backed token, about 1:1 with spot XAU; it trades 24/7, gold does not.

| File | Job |
|---|---|
| `common.py` | fetch, 14-day 1m cache (`data/cache/`, not committed), indicators on 1m/5m/15m |
| `watcher.py` | poll every 60 s, run the paper broker on every closed bar, detect setups, print `SETUP ...` |
| `risk.py` | hard limits: 1% risk, ATR stop + target, 3% daily loss halt, 3x max, vol guard, flat 03:30 BKK, no weekend (Sat 04:00-Mon 05:00 BKK) |
| `paperbroker.py` | fills at next 1m open +0.35 USD/oz (half spread 0.25 + slippage 0.10) each side; stop wins a same-bar tie; 1x/10x/30x shadow books with liquidation |
| `desk.py` | escalation Sonnet screen -> Opus final (only Opus enters, owner rules in code), caps 6/3, token + p_target log |
| `brief.py` | compact market context for briefs (1h klines cached, 1 request per 12 h) |
| `news.py` | Google News RSS headlines, 3 h before the setup |
| `calendar_guard.py` | ForexFactory week calendar (6 h cache): no entries ±30 min around USD High events, close 5 min before any USD High event; fail safe = no entries |
| `report.py` | `reports/YYYY-MM-DD.md` + `.png` |
| `test_broker.py` | synthetic checks of fills, stops, gaps, flat window, guards, liquidation |

The watcher also runs `data/live/unfiltered/`, a paper book that takes EVERY setup with default risk.
The daily report compares it with the AI-filtered book: does the filter add expectancy after costs?
It also runs `data/live/cand15/`: the best setup from `reports/setup_search_htf.md` (15m Donchian-20 breakout, volume > 1.5x,
FADED, stop 2.5 x ATR(15m), ATR trailing exit, no target), code only, 0 tokens. **True out-of-sample start: 2026-11-25.**
Same risk rules and calendar guard as the AI desk (so it is flat by 03:30 Bangkok, unlike the research run).

Live state: `data/live/` (`state.json`, `journal.jsonl`, `events.jsonl`, `equity.csv`, `budget/`, `briefs/`).

## Runbook (each hourly wake-up, 14:00-23:00 Bangkok, weekdays)
```
cd aia-slides/trading/intraday
python3 watcher.py status            # STOPPED -> start it:
python3 -u watcher.py run >> data/live/watcher.log 2>&1   # Bash run_in_background WITH timeout 7200000 (default 30 min kills it)
```
Arm Monitor (timeout 1 h): `tail -n0 -F data/live/watcher.log | grep --line-buffered -E "SETUP |ERROR|Traceback"`.
On restart the watcher first replays the missed bars through the broker (stops, targets, 03:30 flat),
emitting no setups for them, so a gap in the runtime never skips a stop.

On each `SETUP <id> ...` line:
1. `python3 desk.py brief <id>` -> `SKIP ...` (stop here, 0 tokens) or `SONNET <path>`.
2. Agent, model `sonnet`, prompt: "PAPER-trading research test. Make exactly one tool call: Read <path>.
   Use no other tool. Then reply with ONLY the JSON object it asks for." Note its total tokens.
3. `python3 desk.py answer <id> sonnet '<reply>' <tokens>` -> `DONE ...` or `OPUS <path>`; same agent call with
   model `opus`, then `desk.py answer <id> opus '<reply>' <tokens>` -> `ORDER ...` or `DONE opus skipped (p=...)`.
   Only Opus can enter, and the code re-checks the owner's rules: p_target >= 0.65, reward:risk after the
   0.70/oz cost >= 1.5, trend agrees or an argued mean-reversion case, news clear. Caps: Sonnet 6, Opus 3 a day.
   Briefs (`brief.py`) carry multi-timeframe trend (15m/1h/4h EMA20/50/200, ADX, regime, ATR percentile), key
   levels, the 45-indicator library on 15m and 1h, and the next USD High event; the Opus brief adds 3 h of headlines.
The broker fills the order at the next 1m open, re-checking every risk rule. Nothing else to do.

Last wake-up of the day (23:00): `python3 report.py`, then commit `trading/intraday` and push to
`claude/paper-trading`; send the boss 3 lines (equity vs PAXG buy & hold, trades, problems).
Positions still open at 23:00 are closed by the 03:30 rule; the next day's first start replays it.

## Test
`python3 test_broker.py` (synthetic) and `python3 watcher.py replay --days 4 --auto` (last 4 days of real
1m bars through the same code, entering every setup with default risk; output in `data/replay/`).

`data/live/` changes every minute, so it is not tracked. At the 23:07 wake-up copy a snapshot:
`mkdir -p snapshots && rm -rf snapshots/live && cp -r data/live snapshots/live && rm -f snapshots/live/watcher.*`, then commit.
