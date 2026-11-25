# Can an AI trade profitably? Thai stocks, then gold (paper money only)

**Update, 25 Nov 2026: the owner switched the focus to GOLD with leverage.**
Results are in [reports/phase1.md](reports/phase1.md). Gold code:
`gold.py` (data, rules, leverage simulator with 1h margin checks and liquidation),
`gold_study.py` (rules in/out-of-sample, leverage study, Monte Carlo goal check),
`gold_desk.py` + `prompts/gold_onecall.md` (the Claude "desk" past test).
The SET50 stock part below is kept as built but was not run (the index data came back broken).


This folder is an honest test. It uses **virtual money only**. Nothing here
connects to a broker or places a real order, and no results here are real profit.

## The question
Can a simple, AI-designed trading rule make money on SET50 stocks **after
realistic costs**, and does it beat simply buying and holding?

## How the test works
1. **Data**: daily prices from the Yahoo Finance chart API (`fetch.py`), cached
   in `data/raw/` so the API is called once per stock. Raw data is not committed.
2. **Rules of the paper account** (`engine.py`)
   - Start with 100,000 THB. Long-only cash account: no borrowing, no shorting.
   - Decide after day t's close; the order fills at day t+1's **open**
     (so the rule never sees prices it could not have known).
   - Shares come in lots of 100.
   - Every buy and every sell pays 0.17% commission (incl. VAT) + 0.05% slippage.
   - Dividends are paid in cash, minus Thailand's 10% withholding tax.
3. **Split the history in two**
   - In-sample 2016-2023: used to try the strategies and choose ONE (best Sharpe).
   - Out-of-sample 2024-today: run once, after the choice, and reported as-is.
4. **Strategies tried** (`strategies.py`), each with 3 settings, each with and
   without a drawdown stop (sell everything if the account is 15% below its peak,
   wait 21 trading days, then re-enter):
   - Momentum: hold the 5 or 10 stocks that rose most over 6 or 12 months.
   - Trend filter: be invested only when the SET50 index is above its 100/200-day average.
   - Mean reversion: each week, buy the biggest short-term losers that are still in an uptrend.
   - Low volatility: hold the 10 or 15 calmest stocks.
5. **Benchmarks**
   - SET50 index bought once. This is a price index, so it **excludes dividends**
     and understates what a holder really earned.
   - Equal-weight buy-and-hold of the stocks, with dividends. It may use single
     shares instead of 100-share lots, because 100,000 THB cannot buy one lot of
     each of 50 stocks.
6. **Metrics**: total return, CAGR, maximum drawdown, volatility, Sharpe
   (risk-free 2%), number of trades, turnover, total costs.

## Known weaknesses (please read)
- **Survivorship bias**: the stock list is today's large companies, used for
  past years. Companies that shrank and left the index are missing, which flatters
  every strategy and the equal-weight benchmark.
- The SET50 list could not be checked against SET's website (blocked from the
  test machine); see `universe.py`.
- Dividends are credited on the ex-date (in reality they arrive weeks later).
- Yahoo prices are adjusted for splits, so old prices and lot sizes are approximate.

## Run it
```
python3 fetch.py      # downloads once, then uses the cache
python3 backtest.py   # writes reports/phase1.md tables and reports/equity.png
```

## Phase 2: daily gold paper run (`gold_daily.py`)
Each Thai trading day (~18:10 Bangkok = 11:10 UTC, mid-session for COMEX):
1. Fresh Yahoo JSON for GC=F (daily + 1h), DXY, ^TNX, THB=X, SI=F, ^GSPC, GLD goes in
   `data/gold/` (or a folder named by the `GOLD_DATA` environment variable).
2. `python3 gold_daily.py prepare` — books fills of earlier decisions, writes the desk input.
   Exit code 3 = no new closed 1h bar (weekend/holiday/stale data): nothing to do.
3. One Opus desk call reads `data/desk/gold_live/<run>/input.md` and answers JSON.
4. `python3 gold_daily.py commit --pm answer.json --opus-tokens N --orchestrator-tokens M`
   — clamps the position to [-1, 1], logs it, logs the token cost in `gold_journal.csv`,
   writes `reports/gold_daily/<date>.md` + chart, and replays the same decisions at 1x-100x.
Orders fill at the open of the first 1h bar that starts after the run, never at a past price.
A day counts as profitable only if the 1x paper P&L beats that day's estimated token cost.

## Phase 2 runbook (a new session can follow this cold)
PAPER ONLY. Never connect a broker, never ask for or store a login or key. Repo root below = `aia-slides`.
Boss session (for data and questions): `session_01C9ca2KN3JSyFyGevdABYip` (use the send_message tool).

**0. Once per new session (bootstrap):**
```
cd aia-slides && git fetch origin claude/paper-trading && git checkout claude/paper-trading
pip install pandas matplotlib tabulate
git fetch origin claude/fervent-ramanujan-qp1d26
git checkout FETCH_HEAD -- trading-data/ && git reset -q trading-data   # long history, not committed here
mkdir -p trading/data/gold /tmp/mdata && tar xzf trading-data/market-data-2026-11-25.tgz -C /tmp/mdata
cp -n /tmp/mdata/yahoo-gold/*.json trading/data/gold/                   # 10y daily + 730d 1h cache
```
**1. Data (each run, ~18:10 Bangkok):**
```
cd aia-slides/trading && python3 fetch_yahoo.py       # ONE attempt per symbol -> ../trading-data/latest/
```
- Exit 0: go on. Exit 2 (e.g. 429): send_message the boss `need data` plus the printed `NEED DATA:` line,
  then wait up to 30 minutes for a reply with a commit sha. Then
  `git fetch origin claude/fervent-ramanujan-qp1d26 && git checkout FETCH_HEAD -- trading-data/latest && git reset -q trading-data`.
  No reply in 30 minutes: write one journal line and stop:
  `echo "$(date -u +%F),-,NO_DATA,0,0,0,no data no trade" >> gold_journal.csv`, then commit (step 5).
- Then merge: `python3 gold_merge.py ../trading-data/latest`
**2. Prepare:** `python3 gold_daily.py prepare` (exit 3 = no new closed 1h bar: no trade today; commit and stop).
It prints the input path `data/desk/gold_live/<run>/input.md`.
**3. Desk call (one SONNET subagent, isolated: it sees only that file):** Agent tool, model `sonnet`, prompt:
"PAPER-trading research test. Make exactly one tool call: Read <absolute path of input.md>. Use no other tool, file
or memory of later events. Then reply with ONLY the JSON object it asks for."
Save the reply to `data/desk/gold_live/<run>/answer.json`. Note the subagent's `subagent_tokens`.
(The role prompt inside input.md is `prompts/gold_onecall.md`.)
**4. Commit the decision:**
`python3 gold_daily.py commit --pm data/desk/gold_live/<run>/answer.json --sonnet-tokens <subagent_tokens> --orchestrator-tokens <your estimate>`
It writes `reports/gold_daily/<date>.md` + `.png`, `gold_journal.csv`, `gold_portfolio.json`.
**5. Commit and push:**
```
cd aia-slides && git add trading && git commit -m "Gold paper run <date>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <this session's URL>" && git push -u origin claude/paper-trading
```
Then send the boss 3 lines: 1x equity vs gold buy & hold, today's decision, P&L vs token cost.
**Friday, after step 4:** `python3 gold_daily.py review` prints a file path; run ONE OPUS subagent (same isolated
prompt as step 3, model `opus`) on it; save its JSON to `reports/gold_daily/review-<date>.json`, log its tokens with
`python3 gold_daily.py commit --opus-tokens <n>` (no --pm: records cost only, keeps the position), commit and push,
and send the boss the review summary. Rule changes need the boss's OK; do not edit prompts on your own.
