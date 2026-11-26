# Swing gold PAPER desk (PAXG/USDT)

PAPER ONLY: nothing connects to an exchange or broker; no key, no login. It replaces the retired 1m
intraday desk (no edge found; see `../intraday/reports/`). Starting equity 10,080.23 (carried over).

There is no always-on process. Wakes run every 4 h, just after the Binance 4h close: 03:10, 07:10, 11:10, 15:10,
19:10 and 23:10 Bangkok on weekdays, plus Sat 03:10. The report wake runs at 21:02 on weekdays.

| File | Job |
|---|---|
| `market.py` | 1m cache (14 days, intraday `common.py`, max 1 request/min) plus 1h/4h/1d series (one seed request each, extended from 1m); everything is cut as of a time |
| `broker.py` | paper broker driven by replaying closed 1m bars: fills at the next 1m open plus 0.35/oz, stop wins a tie, gaps fill at the open, breakeven at +1R; forced closes 5 min before a USD High event, at Sat 03:30 Bangkok and after 5 days; halts at -3% for the day and -6% for the week; kill switch at -10% from peak; shadow books at 1x, 3x, 10x and 30x |
| `rules.py` | the owner's numbers (main book 2% risk, halts -5% day / -8% week, kill -15%; 1% shadow with -3% / -6% / -10%; leverage 1-10, p >= 0.55, R:R >= 1.5 after costs, no entry within 2 h before a USD High event) |
| `brief.py`, `news.py` | the Opus brief, about 1.8k tokens: book, daily/4h/1h trend, key levels, recent bars, indicator library on 4h and 1h, next 24 h of USD High events, 3 days of headlines |
| `desk.py` | `wake` / `answer` / `sync` / `status`, plus the code books |
| `report.py` | `reports/YYYY-MM-DD.md` and `.png` |
| `prompts/pm.md` | the PM instructions and JSON schema |

Books (in `data/books/`, not tracked; snapshots are committed in `snapshots/`):

| Book | Who decides | Rules |
|---|---|---|
| `ai` | Opus decides, and the code re-checks every rule | from 2026-11-26 15:10: risk linear in Opus's p (0.55 1%, 0.65 2%, >= 0.75 3%); size = min(leverage x equity, that risk); halts -5% / -8%, kill -15% |
| `flat2` | the same decisions | flat 2% risk (the main rule before 2026-11-26 15:10) |
| `kelly_cal` | the same decisions | eighth Kelly on calibrated p (quarter until 2026-11-26 13:20): f = p_cal - (1 - p_cal)/R, risk 0.125 f clamped 0.5-3%, skip if f <= 0; p_cal = p - 0.15 until 20 resolved decisions, then the realised bucket hit rate (the rule used is journalled) |
| `ai_1pct` | the same decisions | 1% risk, halts -3% / -6%, kill -10%: the comparison book (size never uses Opus's p) |
| shadows | the same AI decisions | fixed 1x, 3x, 10x and 30x notional, with liquidation |
| `every4h` | code takes every 4h Donchian-20 signal | the unfiltered baseline: stop 2 x ATR(4h), target 3R, 3x cap, filled 10 min after the 4h close like the AI |
| `real70_paxg` | mirrors the AI trades, LONG ONLY | the owner's real 70 USD: PAXG spot, no leverage, cash when the AI is short, 2% risk, 0.10% fee per side |
| `real70_follow_2100` | the AI main book's position at the 21:02 run | what the owner can do by hand: long -> buy/hold, flat or short -> cash; 0.5% fee per side; 2% risk to the AI stop, max 100%; exits on its stop between runs |
| `real70_xau_minlot` | mirrors the AI trades | 70 USD, XAU CFD, always 1 oz (0.01 lot), 0.30/oz spread, 1:100, stop-out at 50% margin; dead stays dead |
| `aggr30` | mirrors the AI trades | the "+30%/week" test: 70 USD, 20% risk per trade, max 10x, stop-out at 50% margin; weekly return vs +30% in the report |
| `cand15` | code: the 15m candidate | carried over from the intraday book, with intraday rules; true out of sample from 2026-11-25 |

## Runbook (each 4h wake)
```
cd aia-slides/trading/swing
python3 desk.py wake     # takes 1-3 min (1 request/min); prints one of:
```
- `SKIP <reason>`: the book is flat and no entry is possible (weekend, halt or calendar). No tokens are spent. Done.
- `ERROR KILL ...`: the kill switch tripped. Send the boss ERROR, then stop.
- `OPUS <brief.md>`: run the Agent tool with model `opus` and this prompt: "PAPER-trading research test (no real money).
  Make exactly one tool call: Read <brief.md>. Use no other tool. Then reply with ONLY the JSON object it asks for."
  Note its subagent_tokens. Then run `python3 desk.py answer <id> '<reply>' <tokens>`, where `<id>` is the brief's file name without `.md`.
  It prints `ORDER ...`, `HOLD` or `REJECT ...`. After an ORDER, `python3 desk.py sync` records the fill. It is optional:
  the next wake replays it anyway.

21:02 wake: `python3 desk.py daily` (sync, then the owner's instruction line `REAL70: BUY <USD> (stop <px>) | HOLD (stop <px>) | SELL ALL | STAY CASH` from `real70_follow_2100`), then `python3 report.py`, then
`rm -rf snapshots/books && cp -r data/books snapshots/books && rm -rf snapshots/books/ai/briefs`. Commit and push to
`claude/paper-trading`, then send the boss 3 lines plus a 4th: the REAL70 line and that book's equity. We stay paper: the owner acts on it by hand. The `daily` step also applies the owner's withdrawal policy to real70_paxg, real70_follow_2100 and aggr30 (from cash only; milestones once each, then 25% above the high-water mark; 34.0 THB/USD), and adds `| WITHDRAW <USD>` to the REAL70 line when a rule fires. Send no other messages, except the kill-switch ERROR.

## Test
- `python3 test_swing.py`: 74 synthetic checks (fills, tie, gap, breakeven, tighten/close, weekend, max hold, leverage,
  halts, kill switch, liquidation, stale order, the code re-check of Opus's open, calendar close and block).
- `python3 test_replay.py --days 5`: the last N days of real 1m bars through the live code path. A stub PM stands in
  for Opus (0 tokens) on the real wake schedule. Output goes to `data/replay5/`.

Notes:
- With 1% risk and ATR stops the notional is about 0.5-0.7x (about 1-1.4x at 2%), so Opus's leverage choice rarely binds.
  The fixed-notional shadow books show what leverage does to the same decisions.
- With no weekend holds, the longest possible trade is Mon 05:00 to Sat 03:30, which is under 5 days. The 5-day limit is a backstop.

## News desk (separate PAPER book "news", 10,000 USD, 1% risk; the main book's calendar guard is unchanged)
- `newsdesk.py`: event discovery from the calendar feed, the playbook brief (event, forecast/previous, 1h/4h trend,
  recent reactions, headlines), validation, and saving `news/<id>/playbook.json`.
- `news_exec.py`: the executor (T-5 to T+40 min). It polls 1s klines every 5 s (1m fallback), the calendar every 60 s and
  Google News every 15 s. Venice (`venice.py`) parses the number, and code maps it to a scenario. It writes
  `news/<id>/result.json` and `log.jsonl`. Event costs from T-2 to T+10 min: spread 1.50 + slippage 1.00 per side.

Runbook, added to each 4h wake after `desk.py wake`: run `python3 newsdesk.py next`.
- `NONE ...`: nothing to do.
- `PLAYBOOK <brief.md>`:
  1. Make one Opus call, the same way as the PM call.
  2. Run `python3 newsdesk.py playbook <id> '<reply>' <tokens>`.
  3. Run `send_later` at the printed T-5 time with: "News desk: cd aia-slides/trading/swing && python3 -u news_exec.py run
     <id> > news/<id>/exec.out 2>&1 (Bash run_in_background, timeout 3000000), then commit news/<id> and push."
- Test: `python3 news_exec.py sim <id> --actual <x> --at <s>` replays a past release on 1m bars with a simulated
  actual headline. Omit `--actual` to test the fallback.

Limits:
- The ForexFactory JSON has no `actual` field, so the number comes from headlines, which are often minutes late.
  Expect the reaction fallback most of the time.
- Live polling (about 500 kline requests in 40 min) is far above the desk's usual pace of 1 request a minute. It is
  allowed only inside the event window.

## Macro block and the Venice benchmark
- `macro.py`: FRED DFII10 (10y real yield), DTWEXBGS (broad USD), T10YIE, DGS10. It fetches them once a day and caches
  them. Both Opus briefs get the level, the 1w and 1m change, and the 20-day correlation of PAXG daily returns with
  DFII10 and DTWEXBGS changes. Live, only published values are cached. In replays, a value dated the day before the
  as-of day may not have been published yet (a small lookahead).
- Venice parser: primary `deepseek-v4-1-flash-1017-ultrafast` (temperature 0, max_tokens 120, thinking disabled; boss's benchmark
  median 0.40 s, 5/5), with one retry on `mistral-small-3-2-24b-instruct` if it fails. Numbers are converted into the
  forecast's unit (K/M/B, bps, %) before the sanity check.
- `venice.py benchmark` (reference only): 5 test prompts on each small chat model the API lists (text, structured output, no
  reasoning, input price at most 0.30 USD per M tokens). It picks the lowest median time to a valid answer and re-measures
  after 7 days. Results are in `news/venice_benchmark.json`. Parsed numbers are converted into the forecast's unit
  (212000 -> 212 for a "150K" forecast) before the sanity check.
- News results record `used_fallback`, and the report shows the fallback usage rate over live events.

## Official sources (news executor)
- `officials.py` polls BEA `news/current-releases` (PCE, GDP, personal income) and the Fed `feeds/press_all.xml`
  (FOMC statement) every 3 s, from T-1 to T+3 min only.
- A new release link is fetched from the same host and the figure is extracted in code (regex on the official
  wording). The ultrafast Venice model is used only if that fails.
- BLS (CPI, NFP) answers 403 to automated requests and is not used: those events keep the headline path and the reaction fallback.
- Each result logs the official latency next to the headline latency.
- Test on the real 2026-11-25 BEA pages (`result_sim_official_real.json`): Core PCE 0.3 (in line) and GDP 4.3 were read by
  code; the playbook said in-line = no trade.
- Several releases at one time: the playbook must contain a `combined` block covering every release (typical
  surprise, gold sign, weight, thresholds, confirm_usd). Code computes the score: weight x gold_sign x
  (actual - forecast) / typical. When the signals conflict, a trade also needs the first 60 s of price to agree. The validator
  rejects a playbook that leaves a release out. Nov 25 replay with the real BEA figures (`result_sim_combined_real.json`):
  Core PCE z 0, GDP z +2.0, score -0.60 against a sell threshold of -0.7, conflict -> no trade. The price then fell 30
  USD in 15 min. The what-if at threshold 0.5 (`news/20261125-2030-whatif/`) sells at T+60 s and is stopped out in the next
  minute (on 1m bars the stop wins a tie).
