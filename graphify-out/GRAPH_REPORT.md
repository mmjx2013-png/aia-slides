# Graph Report - aia-slides  (2026-11-26)

## Corpus Check
- 116 files · ~86,933 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 42 file(s) not represented in the graph (top: .csv 13, .ttf 12, .jsonl 8)
- WARNING: 42 of 158 files seen (27%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 849 nodes · 1621 edges · 73 communities (57 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d34d843c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MEMORY.md: shared memory for every Claude chat
- Presentation styles: the owner's vocabulary
- CLAUDE.md
- README.md
- json
- pandas
- numpy
- calendar_guard.py
- trading/news.py
- Phase 1 report: can an AI trade gold profitably? (PAPER money only)
- json
- strategies.py
- qa.cjs
- Follower
- rules.py
- pandas
- intraday/report.py
- Result
- Result
- Type-1 deck
- PAPER intraday desk, setup 20260701-1830-breakout
- PAPER intraday desk, setup 20260702-1915-vol_expansion
- PAPER intraday desk, setup 20260716-0105-breakout
- PAPER intraday desk, setup 20260717-0133-momentum
- PAPER intraday desk, setup 20260717-2000-mean_reversion
- PAPER intraday desk, setup 20260721-1715-vol_expansion
- PAPER intraday desk, setup 20260723-1500-mean_reversion
- PAPER intraday desk, setup 20260725-0216-momentum
- PAPER intraday desk, setup 20260804-0020-vol_expansion
- PAPER intraday desk, setup 20260811-1427-momentum
- PAPER intraday desk, setup 20260814-1930-mean_reversion
- PAPER intraday desk, setup 20260819-2030-mean_reversion
- PAPER intraday desk, setup 20260826-2148-momentum
- PAPER intraday desk, setup 20260826-2205-breakout
- PAPER intraday desk, setup 20260828-1720-vol_expansion
- PAPER intraday desk, setup 20260828-2050-breakout
- PAPER intraday desk, setup 20260901-1600-mean_reversion
- PAPER intraday desk, setup 20260904-0300-vol_expansion
- PAPER intraday desk, setup 20260908-0300-vol_expansion
- PAPER intraday desk, setup 20260914-2010-breakout
- PAPER intraday desk, setup 20260917-0230-mean_reversion
- PAPER intraday desk, setup 20260918-1800-momentum
- PAPER intraday desk, setup 20260918-2330-breakout
- PAPER intraday desk, setup 20260923-2154-momentum
- PAPER intraday desk, setup 20261005-2010-breakout
- PAPER intraday desk, setup 20261014-2015-mean_reversion
- PAPER intraday desk, setup 20261015-1900-vol_expansion
- PAPER intraday desk, setup 20261024-0038-momentum
- PAPER intraday desk, setup 20261102-1815-breakout
- PAPER intraday desk, setup 20261104-1800-vol_expansion
- PAPER intraday desk, setup 20261109-1500-mean_reversion
- PAPER intraday desk, setup 20261113-0203-momentum
- PAPER intraday desk, setup 20261125-2217-momentum
- Intraday gold paper desk, 2026-11-25 (Bangkok; period 2026-11-24 21:00 to 2026-11-25 21:00)
- AI replay test: does Opus's final decision add expectancy after costs? (PAPER research)
- PAPER intraday desk, setup 20261125-2217-momentum
- Gold desk, PAPER money only (research test). One call plays three roles, in order.
- gold_tables.md
- Intraday gold PAPER desk (PAXG/USDT, 1m)
- gold_analysts.md
- set50_tables.md
- 20261125-1830-breakout/haiku.md
- 20261125-1830-breakout/sonnet.md
- 20261125-1900-breakout/haiku.md
- chart.md
- gold_chart.md
- gold_news.md
- gold_pm.md
- news.md
- trading/prompts/pm.md
- swing/prompts/pm.md

## God Nodes (most connected - your core abstractions)
1. `bkk()` - 34 edges
2. `Broker` - 17 edges
3. `step()` - 17 edges
4. `load_cache()` - 16 edges
5. `replay()` - 15 edges
6. `run()` - 15 edges
7. `Broker` - 14 edges
8. `jappend()` - 13 edges
9. `resample()` - 13 edges
10. `answer()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Swing gold PAPER desk (PAXG/USDT)` --references--> `sync()`  [INFERRED]
  trading/swing/README.md → trading/swing/market.py
- `Swing gold PAPER desk (PAXG/USDT)` --references--> `wake()`  [INFERRED]
  trading/swing/README.md → trading/swing/desk.py
- `day_key()` --calls--> `bkk()`  [INFERRED]
  trading/swing/rules.py → trading/intraday/common.py
- `week_key()` --calls--> `bkk()`  [INFERRED]
  trading/swing/rules.py → trading/intraday/common.py
- `write_pending()` --calls--> `jdump()`  [INFERRED]
  trading/swing/broker.py → trading/intraday/common.py

## Import Cycles
- None detected.

## Communities (73 total, 16 thin omitted)

### Community 0 - "MEMORY.md: shared memory for every Claude chat"
Cohesion: 0.29
Nodes (6): How the owner works, Log (newest first; one line each; date, what, where), MEMORY.md: shared memory for every Claude chat, Presentations, Projects, Tools that work

### Community 1 - "Presentation styles: the owner's vocabulary"
Cohesion: 0.33
Nodes (5): Lessons for next time (the owner's feedback, 24 Nov 2026), Never, Presentation styles: the owner's vocabulary, Type 1: the target ("perfect"), Type 2: acceptable, the minimum standard

### Community 4 - "json"
Cohesion: 0.06
Nodes (41): backfill(), bkk(), fetch(), frames(), indicators(), jappend(), jdump(), jlines() (+33 more)

### Community 5 - "pandas"
Cohesion: 0.07
Nodes (30): decision_dates(), decisions(), ds(), make_decide(), prep(), replay(), report(), state() (+22 more)

### Community 6 - "numpy"
Cohesion: 0.07
Nodes (32): daily_fills(), hourly(), hourly_fills(), load(), daily(), rules(), sig_donchian(), sig_sma() (+24 more)

### Community 7 - "calendar_guard.py"
Cohesion: 0.17
Nodes (6): _archive(), entry_block(), events(), fomc_close(), next_high(), refresh()

### Community 8 - "trading/news.py"
Cohesion: 0.07
Nodes (21): fetch(), path_for(), url_for(), headlines(), get(), main(), briefs(), headlines() (+13 more)

### Community 9 - "Phase 1 report: can an AI trade gold profitably? (PAPER money only)"
Cohesion: 0.08
Nodes (23): Can an AI trade profitably? Thai stocks, then gold (paper money only), How the test works, Known weaknesses (please read), Phase 2: daily gold paper run (`gold_daily.py`), Phase 2 runbook (a new session can follow this cold), Run it, The question, AI desk past test, 1 Jul to 24 Nov 2026 (start 10,000 USD) (+15 more)

### Community 10 - "json"
Cohesion: 0.06
Nodes (30): closed_bars(), commit(), fills_series(), journal(), load_state(), prepare(), replay(), report() (+22 more)

### Community 11 - "strategies.py"
Cohesion: 0.16
Nodes (13): buy_and_hold_equal(), decide(), _eligible(), _equal(), _first_of(), low_vol(), decide(), mean_reversion() (+5 more)

### Community 12 - "qa.cjs"
Cohesion: 0.10
Nodes (11): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+3 more)

### Community 16 - "rules.py"
Cohesion: 0.10
Nodes (16): _atr(), _bars_txt(), build(), levels(), position_txt(), _std(), trend(), calendar_block() (+8 more)

### Community 19 - "pandas"
Cohesion: 0.08
Nodes (34): chart_brief(), decision_dates(), ds(), news_brief(), prep(), read_pos(), replay(), report() (+26 more)

### Community 20 - "intraday/report.py"
Cohesion: 0.31
Nodes (6): inwin(), main(), perf(), read_eq(), uf_stats(), win()

### Community 22 - "Result"
Cohesion: 0.20
Nodes (9): Baseline: the current live setups (follow, fixed 2R, no filters), Conclusion (written after the run), Exit rules compared (median OOS expectancy over all variants with >= 100 OOS trades), Intraday setup search (PAXG/USDT 1m), code only, Multiple-testing warning, Result, Sessions and calendar proxy (median OOS expectancy, >= 100 OOS trades), Survivors with OOS t >= 2 (+1 more)

### Community 23 - "Result"
Cohesion: 0.20
Nodes (9): By exit, By family (first word of the setup), Conclusion (written after the run), Fewer than 100 OOS trades (30-99), positive IS and OOS, best 15 by t-stat (mostly 1h; treat as weak), Intraday setup search, 15m and 1h with wider stops (PAXG/USDT), code only, Median OOS expectancy by timeframe and stop (variants with >= 100 OOS trades), Multiple-testing warning, Result (+1 more)

### Community 24 - "Type-1 deck"
Cohesion: 0.29
Nodes (6): Files, Lessons the owner has given (do not repeat), The workflow (do not skip steps), Type-1 deck, What makes the reference's CONTENT good (reach this level), What makes the reference's SLIDES good (principles, not its look)

### Community 25 - "PAPER intraday desk, setup 20260701-1830-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4024.36; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260701-1830-breakout

### Community 26 - "PAPER intraday desk, setup 20260702-1915-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4063.08; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260702-1915-vol_expansion

### Community 27 - "PAPER intraday desk, setup 20260716-0105-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4061.31; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260716-0105-breakout

### Community 28 - "PAPER intraday desk, setup 20260717-0133-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3981.38; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260717-0133-momentum

### Community 29 - "PAPER intraday desk, setup 20260717-2000-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3965.97; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260717-2000-mean_reversion

### Community 30 - "PAPER intraday desk, setup 20260721-1715-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4063.28; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260721-1715-vol_expansion

### Community 31 - "PAPER intraday desk, setup 20260723-1500-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4090.14; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260723-1500-mean_reversion

### Community 32 - "PAPER intraday desk, setup 20260725-0216-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4047.87; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260725-0216-momentum

### Community 33 - "PAPER intraday desk, setup 20260804-0020-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4037.12; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260804-0020-vol_expansion

### Community 34 - "PAPER intraday desk, setup 20260811-1427-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4365.39; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260811-1427-momentum

### Community 35 - "PAPER intraday desk, setup 20260814-1930-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4380.54; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260814-1930-mean_reversion

### Community 36 - "PAPER intraday desk, setup 20260819-2030-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4450.30; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260819-2030-mean_reversion

### Community 37 - "PAPER intraday desk, setup 20260826-2148-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4607.76; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260826-2148-momentum

### Community 38 - "PAPER intraday desk, setup 20260826-2205-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4593.06; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260826-2205-breakout

### Community 39 - "PAPER intraday desk, setup 20260828-1720-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4597.02; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260828-1720-vol_expansion

### Community 40 - "PAPER intraday desk, setup 20260828-2050-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4602.61; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260828-2050-breakout

### Community 41 - "PAPER intraday desk, setup 20260901-1600-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4377.00; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260901-1600-mean_reversion

### Community 42 - "PAPER intraday desk, setup 20260904-0300-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4475.67; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260904-0300-vol_expansion

### Community 43 - "PAPER intraday desk, setup 20260908-0300-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4410.52; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260908-0300-vol_expansion

### Community 44 - "PAPER intraday desk, setup 20260914-2010-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4271.93; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260914-2010-breakout

### Community 45 - "PAPER intraday desk, setup 20260917-0230-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4261.37; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260917-0230-mean_reversion

### Community 46 - "PAPER intraday desk, setup 20260918-1800-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4378.29; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260918-1800-momentum

### Community 47 - "PAPER intraday desk, setup 20260918-2330-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4374.91; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260918-2330-breakout

### Community 48 - "PAPER intraday desk, setup 20260923-2154-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4298.13; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20260923-2154-momentum

### Community 49 - "PAPER intraday desk, setup 20261005-2010-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4157.41; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261005-2010-breakout

### Community 50 - "PAPER intraday desk, setup 20261014-2015-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4101.71; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261014-2015-mean_reversion

### Community 51 - "PAPER intraday desk, setup 20261015-1900-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4147.50; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261015-1900-vol_expansion

### Community 52 - "PAPER intraday desk, setup 20261024-0038-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4007.74; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261024-0038-momentum

### Community 53 - "PAPER intraday desk, setup 20261102-1815-breakout"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3912.90; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261102-1815-breakout

### Community 54 - "PAPER intraday desk, setup 20261104-1800-vol_expansion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4045.64; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261104-1800-vol_expansion

### Community 55 - "PAPER intraday desk, setup 20261109-1500-mean_reversion"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 4077.73; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261109-1500-mean_reversion

### Community 56 - "PAPER intraday desk, setup 20261113-0203-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3877.11; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261113-0203-momentum

### Community 57 - "PAPER intraday desk, setup 20261125-2217-momentum"
Cohesion: 0.29
Nodes (6): Calendar, Headlines, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3432.91; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261125-2217-momentum

### Community 58 - "Intraday gold paper desk, 2026-11-25 (Bangkok; period 2026-11-24 21:00 to 2026-11-25 21:00)"
Cohesion: 0.33
Nodes (5): AI desk vs take-every-setup vs 15m candidate, AI leverage choices (chosen by Opus, clamped 1-10; size = min(leverage x equity, 1% risk at the stop)), Intraday gold paper desk, 2026-11-25 (Bangkok; period 2026-11-24 21:00 to 2026-11-25 21:00), Model calls and tokens, Trades

### Community 59 - "AI replay test: does Opus's final decision add expectancy after costs? (PAPER research)"
Cohesion: 0.33
Nodes (5): AI replay test: does Opus's final decision add expectancy after costs? (PAPER research), Calibration: Opus's stated p (target before stop) vs what happened on its own plan, Every setup, Results, Verdict (honest, with the uncertainty)

### Community 60 - "PAPER intraday desk, setup 20261125-2217-momentum"
Cohesion: 0.33
Nodes (5): Calendar, Indicator library (trading/indicators.py; windows are in bars of that timeframe), Key levels (price 3432.91; UTC sessions), Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars), PAPER intraday desk, setup 20261125-2217-momentum

### Community 61 - "Gold desk, PAPER money only (research test). One call plays three roles, in order."
Cohesion: 0.40
Nodes (4): Gold desk, PAPER money only (research test). One call plays three roles, in order., Role 1, news analyst, Role 2, chart analyst, Role 3, portfolio manager

### Community 62 - "gold_tables.md"
Cohesion: 0.40
Nodes (4): In-sample 2017-2023 (1x, daily), Leverage study, 1h bars, 2024-07-07 to 2026-11-25, start 10,000 USD, Monte Carlo goal check: 10,000 paths x 1 year, 21-day blocks from 2017-2026 daily history, Out-of-sample 2024 to 2026-11-24 (1x, daily)

### Community 63 - "Intraday gold PAPER desk (PAXG/USDT, 1m)"
Cohesion: 0.50
Nodes (3): Intraday gold PAPER desk (PAXG/USDT, 1m), Runbook (each hourly wake-up: 14:07-23:07 and 00:07-03:07 Bangkok, weekdays; flat by 03:30), Test

### Community 64 - "gold_analysts.md"
Cohesion: 0.50
Nodes (3): Role: chart / indicator analyst, gold desk (PAPER trading), Role: news analyst, gold desk (PAPER trading), Two desk roles in one call (to save tokens): write the NEWS note and the CHART note independently.

## Knowledge Gaps
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bkk()` connect `json` to `rules.py`, `json`, `pandas`, `Follower`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `bkk()` (e.g. with `_bars_txt()` and `build()`) actually correct?**
  _`bkk()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.056134723336006415 - nodes in this community are weakly interconnected._
- **Why does `Broker` connect `json` to `json`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `pandas` be split into smaller, more focused modules?**
  _Cohesion score 0.07364114552893045 - nodes in this community are weakly interconnected._
- **Why does `_first_of()` connect `strategies.py` to `pandas`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Should `numpy` be split into smaller, more focused modules?**
  _Cohesion score 0.07184325108853411 - nodes in this community are weakly interconnected._