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
