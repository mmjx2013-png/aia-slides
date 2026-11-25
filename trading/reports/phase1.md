# Phase 1 report: can an AI trade gold profitably? (PAPER money only)

Nothing here is real money or real profit. All results are simulated after costs.
Asset: COMEX gold futures (GC=F, front month, Yahoo data). Long and short allowed.

## Verdict (no sugar-coating)
1. **The goal of 1M USD in one year is not realistic.** It needs a 340x gain from
   100,000 THB (2,939 USD) or 100x from 10,000 USD. In 10,000 Monte Carlo years
   per setting, the chance of ending at 1M USD is at most 0.04% (4 in 10,000),
   and touching 1M even briefly at most 0.19%; both happen only at 30x-100x,
   where **100% of the paths are liquidated**. At 10x, 50-56% are liquidated
   within a year and the median account LOSES money. At 1x and 3x nothing gets
   liquidated, but the median year is about +8% to +13%: 2,939 USD becomes
   ~3,200-3,300 USD, not 1M.
2. **No rule beat buy-and-hold in-sample (2017-2023).** The chosen rule
   (3-month time-series momentum, long/short) had a lower Sharpe than simply
   holding gold. Out-of-sample (2024 to today) it matched buy-and-hold (+70.7%
   vs +71.8%); in the AI-test window (Jul to Nov 2026) it lost 14.6%.
3. **The AI desk (Claude: news + chart + PM roles) was cautious and roughly
   flat:** +2.0% at 1x from 1 Jul to 24 Nov 2026, max drawdown -3.0%, while gold
   fell 12.2%. It mostly held small positions (10-35% of its budget) and was
   short during gold's fall. That is better than buy-and-hold in this window,
   but it is 21 decisions in 5 months: far too few to tell skill from luck.
4. **Leverage multiplies losses faster than gains.** Same AI decisions:
   1x +2.0%, 3x +4.5%, 10x +11.4%, 30x -1.3% (max DD -69%), 100x LIQUIDATED on
   28 Aug 2026 (-90%).
5. **Recommendation: do not trade real money with this.** None of the go/no-go
   criteria is met (see below).

## Leverage and liquidation rules used
- Position = signal x leverage x equity, reset at every daily decision (constant leverage).
- Used margin = notional / leverage. **Liquidation when equity <= 50% of used margin**,
  checked on every 1-hour bar against the bar's worst price; closed at the stop-out
  price (or the open if it gapped through). A liquidated account stays dead.
- Note: under this rule a stop-out leaves about half of the equity that was at
  risk. So an account can be "liquidated" and still end above its start if it
  had grown first (e.g. 10x buy-and-hold below). That is path luck: the Monte
  Carlo table is the honest answer, not one historical path.
- Spread/slippage 0.30 USD/oz per side. Financing 6%/yr on the notional above 1x.
- Decisions at the 17:00 New York close; fills at the next session's first 1h bar.

## Reality check (USD/THB 34.03, Yahoo, 25 Nov 2026; 200 USD = 6,806 THB)
| Return used | Monthly | Profit on 100k THB per month | Capital needed for 200 USD/month |
|---|---|---|---|
| Chosen rule, out-of-sample CAGR +20.3% (a strong gold period) | 1.55% | 1,552 THB | 438,510 THB (12,886 USD) |
| AI desk at 1x, annualised +5.0% (Jul-Nov 2026) | 0.41% | 409 THB | 1,664,034 THB (48,899 USD) |
| 10%/yr reference | 0.80% | 797 THB | 853,509 THB (25,081 USD) |
And 2026 so far shows gold can also fall 12% in five months: these monthly
figures are averages, not a salary.

## Go/no-go for real money (fixed in advance)
| Criterion | Met? | Evidence |
|---|---|---|
| (1) AI desk beats buy-and-hold out-of-sample after costs, max DD no worse | **Not proven** | +2.0% vs -12.2% with DD -3% vs -26%, but only 21 decisions in 5 months; one pass (pass 2 not run, see tokens). Too small to count as evidence. The rule yardstick did not beat buy-and-hold in-sample. |
| (2) AI-trader test not worse than benchmark | Met in this window, weak evidence | same sample-size caveat |
| (3) Paper week runs without errors, logs P&L after costs and token cost | **Not yet** | the paper week has not started |
Result: **NO-GO.** Even if all three were met, the leverage needed for the
1M USD goal is ruinous by the Monte Carlo numbers.

## Token use (Phase 1b, gold)
- 21 weekly decisions, one Opus call each (news note + chart note + decision in one call): 1,421,908 tokens.
- Measurement tests before that: 196,539. Total 1,618,447 (budget ~1.5M).
- Measured floor: every subagent call costs ~62k tokens even with no tool use (its fixed system prompt).
  So separate news/chart/PM agents (~200k per decision) and the second PM pass (~1.4M more) were not run.

## News sources (in use; no login)
- news.google.com (RSS search, Thai and English editions, with after:/before: date filters)
- www.kaohoon.com/feed (Thai market news, latest 10)
- www.bangkokpost.com/rss/data/business.xml (latest 10)

## Limitations
- GC=F is a continuous front-month series: roll jumps every ~2 months are in the prices.
- 1-hour data only from Jul 2024; earlier tests use daily bars.
- Yahoo's daily index for SET50 came back with a single bar, so the SET50 stock backtest
  (secondary since the pivot) was not run.
- The AI test window is after the model's knowledge cutoff (Jun 2026), but the
  model may still carry general priors about gold.

Charts: [ai_trader.png](ai_trader.png), [gold_leverage.png](gold_leverage.png), [gold_equity.png](gold_equity.png).

## AI desk past test, 1 Jul to 24 Nov 2026 (start 10,000 USD)

| decisions                       | leverage   |   final | total   | cagr     | maxdd   | vol     |   sharpe |   trades |   costs |   financing | liquidated       |   days_under_water |
|:--------------------------------|:-----------|--------:|:--------|:---------|:--------|:--------|---------:|---------:|--------:|------------:|:-----------------|-------------------:|
| AI desk pm1                     | 1x         |  10,199 | +2.0%   | +5.0%    | -3.0%   | +5.0%   |     0.43 |       13 |       2 |           0 | no               |                 87 |
| AI desk pm1                     | 3x         |  10,447 | +4.5%   | +11.5%   | -9.2%   | +14.9%  |     0.54 |       13 |       4 |         121 | no               |                 92 |
| AI desk pm1                     | 10x        |  11,136 | +11.4%  | +30.7%   | -28.6%  | +49.7%  |     0.65 |       13 |      16 |         392 | no               |                 92 |
| AI desk pm1                     | 30x        |   9,870 | -1.3%   | -3.2%    | -68.9%  | +148.7% |     0.71 |       13 |      52 |         946 | no               |                 92 |
| AI desk pm1                     | 100x       |     988 | -90.1%  | -99.7%   | -92.6%  | +320.8% |     0.35 |        5 |      94 |         865 | 2026-08-28 16:00 |                 92 |
| Gold buy & hold                 | 1x         |   8,777 | -12.2%  | -27.7%   | -25.9%  | +23.5%  |    -1.09 |        1 |       1 |           0 | no               |                 92 |
| Gold buy & hold                 | 3x         |   5,826 | -41.7%  | -73.9%   | -62.9%  | +70.8%  |    -1.22 |        1 |       8 |         759 | no               |                 92 |
| Gold buy & hold                 | 10x        |     637 | -93.6%  | -99.9%   | -98.1%  | +239.2% |    -1.11 |        1 |      80 |       2,293 | no               |                 92 |
| Gold buy & hold                 | 30x        |  10,335 | +3.4%   | +8.5%    | -56.4%  | +131.7% |     0.67 |        1 |      45 |         468 | 2026-07-07 19:00 |                142 |
| Gold buy & hold                 | 100x       |  28,995 | +189.9% | +1308.4% | -62.6%  | +390.3% |     1.5  |        1 |     423 |       2,394 | 2026-07-07 01:00 |                142 |
| Rule: TS-momentum 3m long/short | 1x         |   8,544 | -14.6%  | -32.4%   | -27.8%  | +23.6%  |    -1.33 |       15 |      18 |           0 | no               |                130 |
| Rule: SMA200 long/short         | 1x         |  10,576 | +5.8%   | +14.9%   | -17.3%  | +23.7%  |     0.51 |        5 |       7 |           0 | no               |                125 |

## Rules, leverage study and Monte Carlo (full tables)

Data: GC=F daily 2016-11-25 to 2026-11-24; 1h from 2024-07-07.
USD/THB used: 34.03 (Yahoo THB=X, 25 Nov 2026). 100,000 THB = 2,939 USD.

Chosen rule (best in-sample Sharpe, buy & hold excluded): **TS-momentum 3m long/short**

### In-sample 2017-2023 (1x, daily)

| strategy                   |   final USD | total   | CAGR   | max DD   | vol    |   Sharpe |   trades |   costs USD |   financing USD | liquidated   |   days under water |
|:---------------------------|------------:|:--------|:-------|:---------|:-------|---------:|---------:|------------:|----------------:|:-------------|-------------------:|
| Buy & hold (long 1x)       |      17,930 | +79.3%  | +8.7%  | -21.2%   | +14.5% |     0.51 |        1 |           3 |               0 | no           |               1211 |
| SMA200 long/short          |       7,697 | -23.0%  | -3.7%  | -46.0%   | +14.1% |    -0.34 |       59 |         191 |               0 | no           |               1389 |
| SMA100 long/short          |       8,324 | -16.8%  | -2.6%  | -39.1%   | +14.5% |    -0.25 |       93 |         333 |               0 | no           |               1239 |
| SMA200 long/flat           |      11,202 | +12.0%  | +1.6%  | -29.5%   | +12.0% |     0.03 |       59 |         111 |               0 | no           |               1239 |
| TS-momentum 3m long/short  |      13,984 | +39.8%  | +4.9%  | -21.5%   | +14.4% |     0.27 |       79 |         381 |               0 | no           |               1239 |
| TS-momentum 12m long/short |       7,934 | -20.7%  | -3.3%  | -49.1%   | +14.0% |    -0.31 |       49 |         182 |               0 | no           |               1239 |
| TS-momentum 12m long/flat  |      11,461 | +14.6%  | +2.0%  | -32.0%   | +12.1% |     0.06 |       49 |         100 |               0 | no           |               1239 |
| Donchian 55/20 long/short  |       6,339 | -36.6%  | -6.3%  | -41.0%   | +12.0% |    -0.65 |       55 |          95 |               0 | no           |               2495 |
| Donchian 20/10 long/short  |       8,655 | -13.4%  | -2.0%  | -31.6%   | +12.8% |    -0.25 |      104 |         211 |               0 | no           |               1403 |

### Out-of-sample 2024 to 2026-11-24 (1x, daily)

| strategy                   |   final USD | total   | CAGR   | max DD   | vol    |   Sharpe |   trades |   costs USD |   financing USD | liquidated   |   days under water |
|:---------------------------|------------:|:--------|:-------|:---------|:-------|---------:|---------:|------------:|----------------:|:-------------|-------------------:|
| Buy & hold (long 1x)       |      17,182 | +71.8%  | +20.6% | -33.9%   | +22.5% |     0.86 |        1 |           1 |               0 | no           |                298 |
| SMA200 long/short          |      23,255 | +132.5% | +33.9% | -26.7%   | +22.4% |     1.32 |        6 |          19 |               0 | no           |                298 |
| SMA100 long/short          |      23,391 | +133.9% | +34.1% | -23.9%   | +22.4% |     1.33 |       18 |          52 |               0 | no           |                298 |
| SMA200 long/flat           |      20,300 | +103.0% | +27.7% | -20.9%   | +20.2% |     1.22 |        6 |           8 |               0 | no           |                298 |
| TS-momentum 3m long/short  |      16,873 | +68.7%  | +19.8% | -34.8%   | +22.5% |     0.83 |       30 |          76 |               0 | no           |                298 |
| TS-momentum 12m long/short |      19,921 | +99.2%  | +26.9% | -30.4%   | +22.5% |     1.08 |        8 |          22 |               0 | no           |                298 |
| TS-momentum 12m long/flat  |      18,561 | +85.6%  | +23.8% | -27.7%   | +21.8% |     1    |        8 |          11 |               0 | no           |                298 |
| Donchian 55/20 long/short  |      17,085 | +70.8%  | +20.3% | -29.5%   | +19.4% |     0.95 |       13 |          18 |               0 | no           |                298 |
| Donchian 20/10 long/short  |      13,304 | +33.0%  | +10.4% | -23.2%   | +20.0% |     0.49 |       35 |          38 |               0 | no           |                644 |

### Leverage study, 1h bars, 2024-07-07 to 2026-11-25, start 10,000 USD

| decisions                 | leverage   |   final USD | total    | CAGR    | max DD   | vol     |   Sharpe |   trades |   costs USD |   financing USD | liquidated       |   days under water |
|:--------------------------|:-----------|------------:|:---------|:--------|:---------|:--------|---------:|---------:|------------:|----------------:|:-----------------|-------------------:|
| Buy & hold                | 1x         |      15,017 | +50.2%   | +18.6%  | -37.1%   | +22.0%  |     0.66 |        1 |           1 |               0 | no               |                300 |
| Buy & hold                | 3x         |      13,983 | +39.8%   | +15.1%  | -83.7%   | +66.5%  |     0.48 |        1 |          89 |          11,205 | no               |                300 |
| Buy & hold                | 10x        |     158,268 | +1482.7% | +218.8% | -75.0%   | +125.5% |     1.39 |        1 |       1,026 |          29,590 | 2025-10-21 14:00 |                404 |
| Buy & hold                | 30x        |      10,050 | +0.5%    | +0.2%   | -70.1%   | +57.1%  |     0.23 |        1 |         139 |             910 | 2024-07-19 12:00 |                860 |
| Buy & hold                | 100x       |      19,946 | +99.5%   | +33.6%  | -53.1%   | +107.5% |     0.49 |        1 |         507 |             821 | 2024-07-12 06:00 |                866 |
| TS-momentum 3m long/short | 1x         |      15,033 | +50.3%   | +18.7%  | -37.7%   | +22.0%  |     0.66 |       30 |          67 |               0 | no               |                300 |
| TS-momentum 3m long/short | 3x         |      14,018 | +40.2%   | +15.2%  | -83.8%   | +66.5%  |     0.48 |       30 |         268 |           7,862 | no               |                300 |
| TS-momentum 3m long/short | 10x        |      43,401 | +334.0%  | +85.2%  | -81.4%   | +126.0% |     1.03 |       13 |         731 |          13,011 | 2025-10-21 14:00 |                404 |
| TS-momentum 3m long/short | 30x        |      10,050 | +0.5%    | +0.2%   | -70.1%   | +57.1%  |     0.23 |        1 |         139 |             910 | 2024-07-19 12:00 |                860 |
| TS-momentum 3m long/short | 100x       |      19,946 | +99.5%   | +33.6%  | -53.1%   | +107.5% |     0.49 |        1 |         507 |             821 | 2024-07-12 06:00 |                866 |

### Monte Carlo goal check: 10,000 paths x 1 year, 21-day blocks from 2017-2026 daily history

| decisions                 | leverage   | start    |   start USD | multiple needed   | P(end >= 1M USD)   | P(touch 1M any time)   | P(liquidated)   | P(ruin: liquidated or -90%)   |   median end USD |   5th pct USD |   95th pct USD |   best path USD |
|:--------------------------|:-----------|:---------|------------:|:------------------|:-------------------|:-----------------------|:----------------|:------------------------------|-----------------:|--------------:|---------------:|----------------:|
| Buy & hold                | 1x         | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |            3,314 |         2,593 |          4,265 |           6,151 |
| Buy & hold                | 1x         | 10k USD  |      10,000 | 100x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |           11,276 |         8,826 |         14,514 |          20,930 |
| Buy & hold                | 3x         | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |            3,246 |         1,530 |          6,759 |          18,010 |
| Buy & hold                | 3x         | 10k USD  |      10,000 | 100x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |           11,047 |         5,208 |         23,002 |          61,289 |
| Buy & hold                | 10x        | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 55.9%           | 63.7%                         |            1,825 |           202 |         15,156 |         396,199 |
| Buy & hold                | 10x        | 10k USD  |      10,000 | 100x              | 0.02%              | 0.03%                  | 55.9%           | 63.7%                         |            6,210 |           688 |         51,577 |       1,348,266 |
| Buy & hold                | 30x        | 100k THB |       2,939 | 340x              | 0.02%              | 0.03%                  | 100.0%          | 100.0%                        |            1,728 |           567 |          9,442 |       9,753,784 |
| Buy & hold                | 30x        | 10k USD  |      10,000 | 100x              | 0.04%              | 0.12%                  | 100.0%          | 100.0%                        |            5,880 |         1,930 |         32,130 |      33,192,127 |
| Buy & hold                | 100x       | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 100.0%          | 100.0%                        |            1,440 |         1,304 |         11,973 |         146,374 |
| Buy & hold                | 100x       | 10k USD  |      10,000 | 100x              | 0.00%              | 0.19%                  | 100.0%          | 100.0%                        |            4,900 |         4,436 |         40,743 |         498,112 |
| TS-momentum 3m long/short | 1x         | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |            3,180 |         2,407 |          4,097 |           6,373 |
| TS-momentum 3m long/short | 1x         | 10k USD  |      10,000 | 100x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |           10,822 |         8,190 |         13,942 |          21,687 |
| TS-momentum 3m long/short | 3x         | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |            2,874 |         1,241 |          6,053 |          16,702 |
| TS-momentum 3m long/short | 3x         | 10k USD  |      10,000 | 100x              | 0.00%              | 0.00%                  | 0.0%            | 0.0%                          |            9,782 |         4,224 |         20,597 |          56,837 |
| TS-momentum 3m long/short | 10x        | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 50.4%           | 63.1%                         |            1,495 |           132 |         10,940 |         284,606 |
| TS-momentum 3m long/short | 10x        | 10k USD  |      10,000 | 100x              | 0.00%              | 0.02%                  | 50.4%           | 63.1%                         |            5,088 |           449 |         37,229 |         968,515 |
| TS-momentum 3m long/short | 30x        | 100k THB |       2,939 | 340x              | 0.01%              | 0.01%                  | 100.0%          | 100.0%                        |            1,727 |           490 |          8,276 |       2,045,308 |
| TS-momentum 3m long/short | 30x        | 10k USD  |      10,000 | 100x              | 0.01%              | 0.03%                  | 100.0%          | 100.0%                        |            5,877 |         1,667 |         28,165 |       6,960,183 |
| TS-momentum 3m long/short | 100x       | 100k THB |       2,939 | 340x              | 0.00%              | 0.00%                  | 100.0%          | 100.0%                        |            1,440 |         1,284 |          9,865 |         134,716 |
| TS-momentum 3m long/short | 100x       | 10k USD  |      10,000 | 100x              | 0.00%              | 0.00%                  | 100.0%          | 100.0%                        |            4,900 |         4,368 |         33,571 |         458,440 |
