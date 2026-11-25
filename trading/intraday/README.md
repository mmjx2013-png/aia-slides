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
| `desk.py` | escalation Haiku -> Sonnet -> Opus, daily caps 8/4/1, token log |
| `report.py` | `reports/YYYY-MM-DD.md` + `.png` |
| `test_broker.py` | synthetic checks of fills, stops, gaps, flat window, guards, liquidation |

The watcher also runs `data/live/unfiltered/`, a paper book that takes EVERY setup with default risk.
The daily report compares it with the AI-filtered book: does the filter add expectancy after costs?

Live state: `data/live/` (`state.json`, `journal.jsonl`, `events.jsonl`, `equity.csv`, `budget/`, `briefs/`).

## Runbook (each hourly wake-up, 14:00-23:00 Bangkok, weekdays)
```
cd aia-slides/trading/intraday
python3 watcher.py status            # STOPPED -> start it:
python3 watcher.py run > data/live/watcher.log 2>&1    # Bash run_in_background (stops itself after 1.9 h)
```
Arm Monitor (timeout 1 h): `tail -n0 -F data/live/watcher.log | grep --line-buffered -E "SETUP |ERROR|Traceback"`.
On restart the watcher first replays the missed bars through the broker (stops, targets, 03:30 flat),
emitting no setups for them, so a gap in the runtime never skips a stop.

On each `SETUP <id> ...` line:
1. `python3 desk.py brief <id>` -> `SKIP ...` (stop here, 0 tokens) or `HAIKU <path>`.
2. Agent, model `haiku`, prompt: "PAPER-trading research test. Make exactly one tool call: Read <path>.
   Use no other tool. Then reply with ONLY the JSON object it asks for." Note its total tokens.
3. `python3 desk.py answer <id> haiku '<reply>' <tokens>` -> `DONE ...`, or `SONNET <path>`: same agent call
   with model `sonnet`, then `desk.py answer <id> sonnet ...` -> `ORDER ...` / `DONE ...` / `OPUS <path>`
   (model `opus`, then `desk.py answer <id> opus ...`).
The broker fills the order at the next 1m open, re-checking every risk rule. Nothing else to do.

Last wake-up of the day (23:00): `python3 report.py`, then commit `trading/intraday` and push to
`claude/paper-trading`; send the boss 3 lines (equity vs PAXG buy & hold, trades, problems).
Positions still open at 23:00 are closed by the 03:30 rule; the next day's first start replays it.

## Test
`python3 test_broker.py` (synthetic) and `python3 watcher.py replay --days 4 --auto` (last 4 days of real
1m bars through the same code, entering every setup with default risk; output in `data/replay/`).
