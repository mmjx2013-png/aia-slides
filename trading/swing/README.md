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
| `ai` | Opus decides, and the code re-checks every rule | from 2026-11-26: size = min(leverage x equity, 2% risk); halts -5% / -8%, kill -15% |
| `ai_1pct` | the same decisions | 1% risk, halts -3% / -6%, kill -10%: the comparison book (size never uses Opus's p) |
| shadows | the same AI decisions | fixed 1x, 3x, 10x and 30x notional, with liquidation |
| `every4h` | code takes every 4h Donchian-20 signal | the unfiltered baseline: stop 2 x ATR(4h), target 3R, 3x cap, filled 10 min after the 4h close like the AI |
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

21:02 wake: `python3 desk.py sync && python3 report.py`, then
`rm -rf snapshots/books && cp -r data/books snapshots/books && rm -rf snapshots/books/ai/briefs`. Commit and push to
`claude/paper-trading`, then send the boss 3 lines. Send no other messages, except the kill-switch ERROR.

## Test
- `python3 test_swing.py`: 42 synthetic checks (fills, tie, gap, breakeven, tighten/close, weekend, max hold, leverage,
  halts, kill switch, liquidation, stale order, the code re-check of Opus's open, calendar close and block).
- `python3 test_replay.py --days 5`: the last N days of real 1m bars through the live code path. A stub PM stands in
  for Opus (0 tokens) on the real wake schedule. Output goes to `data/replay5/`.

Notes:
- With 1% risk and ATR stops the notional is about 0.5-0.7x (about 1-1.4x at 2%), so Opus's leverage choice rarely binds.
  The fixed-notional shadow books show what leverage does to the same decisions.
- With no weekend holds, the longest possible trade is Mon 05:00 to Sat 03:30, which is under 5 days. The 5-day limit is a backstop.
