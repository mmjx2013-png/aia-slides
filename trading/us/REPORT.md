# US stocks: walk-forward test of low-frequency rule families (PAPER, code only)

Data: Yahoo daily dump from the boss (commit 3fc1638), total-return adjusted, 2016-11-28 .. 2026-11-25.
Fit / choose on 2016-11-28 .. 2022-12-30; judge ONLY on 2023-01-03 .. 2026-11-25. 70 USD cash account, fills at the next open,
commission 0.10% + 7% VAT and 0.05% slippage each side, SEC fee on sells, fractional shares, no leverage, no shorts, cash earns 0.
**72 variants tried** in 5 families; each family's variant is chosen by in-sample Sharpe only.

Pass rule: out-of-sample Sharpe above BOTH buy-and-hold SPY and QQQ, AND a max drawdown no deeper than the shallower of the two.

## Benchmarks
| | Period | CAGR | Sharpe | Max DD | Trades/yr | Win | Cost drag | Exposure |
|---|---|---|---|---|---|---|---|---|
| buy and hold SPY | IS | +11.4% | 0.65 | -33.7% | 0.0 | - | 0.03% | 100% |
| buy and hold SPY | OOS | +18.8% | 1.20 | -18.8% | 0.0 | - | 0.05% | 100% |
| buy and hold QQQ | IS | +15.1% | 0.70 | -35.1% | 0.0 | - | 0.03% | 100% |
| buy and hold QQQ | OOS | +25.5% | 1.19 | -22.8% | 0.0 | - | 0.05% | 100% |

## Chosen variant per family (chosen in-sample, judged out of sample)
| Family | Variant | Period | CAGR | Sharpe | Max DD | Trades/yr | Win | Cost drag | Exposure |
|---|---|---|---|---|---|---|---|---|---|
| trend | QQQ > SMA150 band 2% else cash | IS | +15.0% | 0.95 | -18.3% | 0.8 | 60% | 0.30% | 67% |
| | | **OOS** | +17.4% | 1.03 | -16.1% | 1.3 | 100% | 0.48% | 89% |
| dual_momentum | best of SPY/QQQ/IWM by 3m, else cash | IS | +11.9% | 0.69 | -28.6% | 2.3 | 71% | 0.85% | 71% |
| | | **OOS** | +8.5% | 0.57 | -19.5% | 5.1 | 55% | 1.78% | 87% |
| sector_rotation | top 1 sectors by 12m | IS | +22.5% | 0.93 | -31.2% | 2.0 | 58% | 0.80% | 83% |
| | | **OOS** | +0.6% | 0.14 | -28.8% | 4.9 | 58% | 1.61% | 100% |
| rsi2 | QQQ RSI2 < 15 above SMA200, exit rsi70 | IS | +2.7% | 0.32 | -14.0% | 8.1 | 67% | 2.65% | 14% |
| | | **OOS** | +4.6% | 0.46 | -12.0% | 14.4 | 70% | 4.87% | 25% |
| stocks_momentum (survivor-biased) | top 3 large caps by 12-1m | IS | +33.1% | 1.01 | -38.2% | 7.6 | 63% | 1.16% | 83% |
| | | **OOS** | +52.4% | 1.26 | -35.9% | 9.5 | 68% | 1.58% | 100% |

## Out-of-sample Sharpe difference vs buy-and-hold SPY (block bootstrap, 2,000 draws, 20-day blocks)
| Family | Sharpe diff | 90% interval | P(diff > 0) |
|---|---|---|---|
| trend | -0.17 | [-0.85, +0.39] | 26% |
| dual_momentum | -0.64 | [-1.37, -0.16] | 2% |
| sector_rotation | -1.07 | [-1.89, -0.50] | 0% |
| rsi2 | -0.74 | [-1.60, -0.01] | 5% |
| stocks_momentum (survivor-biased) | +0.05 | [-0.67, +0.76] | 54% |

## Calendar-year returns, full period (2022 = the bear year, in-sample)
| Book | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trend | +0% | +14% | +4% | +22% | +40% | +29% | -13% | +33% | +20% | +14% | +5% |
| dual_momentum | +0% | +17% | +0% | +13% | +27% | +35% | -15% | +33% | +8% | +5% | -6% |
| sector_rotation | +0% | +1% | -0% | +19% | +41% | +23% | +59% | +1% | +21% | +7% | -21% |
| rsi2 | +0% | +0% | -4% | -4% | +20% | +9% | -4% | +5% | +13% | +3% | -1% |
| stocks_momentum (survivor-biased) | +0% | -1% | +5% | +58% | +187% | +10% | -2% | +61% | +105% | -0% | +52% |
| buy and hold SPY | +2% | +21% | -5% | +31% | +17% | +31% | -19% | +27% | +26% | +18% | +6% |

OOS bars to beat: Sharpe > 1.20, max DD no deeper than -18.8%.

## Verdict
- trend: QQQ > SMA150 band 2% else cash: fails (OOS Sharpe 1.03, max DD -16.1%)
- dual_momentum: best of SPY/QQQ/IWM by 3m, else cash: fails (OOS Sharpe 0.57, max DD -19.5%)
- sector_rotation: top 1 sectors by 12m: fails (OOS Sharpe 0.14, max DD -28.8%)
- rsi2: QQQ RSI2 < 15 above SMA200, exit rsi70: fails (OOS Sharpe 0.46, max DD -12.0%)
- stocks_momentum (survivor-biased): top 3 large caps by 12-1m: fails (OOS Sharpe 1.26, max DD -35.9%) - second check only, survivor-biased list

Out of sample, 6 of 72 variants beat the Sharpe bar and 3 beat both bars (any variant, not just the chosen ones: picking the best of these after the fact would be look-ahead).

Caveats: one out-of-sample window of about 4 years, mostly a bull market; with 72 variants some pass by luck. The large-cap list is today's winners (survivorship bias), so its results overstate any edge.

## Conclusion (plain)
- No tested rule family has an edge over simply holding SPY or QQQ after costs, out of sample. For a 70 USD account the honest
  baseline is buy-and-hold (or regular small buys) of a broad index ETF.
- The 200/150-day trend filter is the only near-miss: a lower Sharpe out of sample (90% interval includes zero), but it cut 2022
  from -19% (SPY) to -13% and the OOS drawdown from -18.8% to -16.1%. It is a drawdown-control choice, not an edge.
- Short-term mean reversion (RSI2) is eaten by costs at this account size (cost drag about 5% a year).
- No forward paper book is started (nothing passed). orders.md stays empty until something does.

Full table: results.csv. Run time 31 s.

## Event / news checks (re-run here; boss-side numbers in brackets)

### Overnight-only (buy at the close, sell at the next open)
| ETF | Gross CAGR | Net CAGR after costs | Max DD net |
|---|---|---|---|
| SPY | +11.3% | -49.9% (boss -50%/y) | -100% |
| QQQ | +13.9% | -48.7% (boss -49%/y) | -100% |

### Leverage on buy-and-hold (daily rebalanced, 6%/y financing; not allowed in the cash account)
| ETF | Leverage | CAGR | Max DD |
|---|---|---|---|
| SPY | 1x | +14.3% | -34% |
| SPY | 2x | +19.1% | -59% |
| SPY | 3x | +19.8% | -76% |
| QQQ | 1x | +19.1% | -35% |
| QQQ | 2x | +26.6% | -65% |
| QQQ | 3x | +27.6% | -83% |
(Boss: QQQ 2x +25%/y with DD -65%; MU 2x +40%/y with DD -88%, 3x wiped out.)

### Gap events, |gap| >= 5%, 34 large caps (SURVIVOR-BIASED: today's winners), entry at the gap-day close
Excess vs SPY after round-trip costs. Bands: 95% bootstrap of the mean.
| Gap | Hold | Period | n | Mean excess | 95% band |
|---|---|---|---|---|---|
| down | 1d | 2016-22 | 270 | +0.27% | [-0.17, +0.74] |
| down | 1d | 2023-26 | 168 | -0.29% | [-0.69, +0.16] |
| down | 20d | 2016-22 | 270 | +1.63% | [+0.34, +3.01] |
| down | 20d | 2023-26 | 168 | +1.66% | [-0.30, +3.77] |
| up | 1d | 2016-22 | 263 | -0.20% | [-0.61, +0.22] |
| up | 1d | 2023-26 | 193 | +0.11% | [-0.37, +0.61] |
| up | 20d | 2016-22 | 263 | +0.52% | [-0.82, +1.77] |
| up | 20d | 2023-26 | 193 | +1.36% | [-0.46, +3.26] |

Earnings-day-only test: skipped. SEC EDGAR asks automated clients for a contact e-mail in the User-Agent; we do not
send the owner's details to outside services, and no other earnings calendar is on the allowed hosts.


Reading: overnight-only and leverage are rejected (costs, drawdowns). Gap-down 20-day drift is positive in both halves
(+1.6%), but out of sample the band includes zero, and the stock list is today's winners: survivors recover from gaps by
construction, so this is not a tradeable edge. Our 1-day gap-down result (+0.27% / -0.29%) is smaller than the boss's
(+2.6% / -0.8%) on a different stock list; both say no stable edge.
