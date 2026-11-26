# US stocks: walk-forward test of low-frequency rule families (PAPER, code only)

Data: Yahoo daily dump from the boss (commit 3fc1638), total-return adjusted, 2016-11-28 .. 2026-11-25.
Fit / choose on 2016-11-28 .. 2022-12-30; judge ONLY on 2023-01-03 .. 2026-11-25. 70 USD cash account, fills at the next open,
commission 0.10% + 7% VAT and 0.05% slippage each side, SEC fee on sells, fractional shares, no leverage, no shorts, cash earns 0.
**68 variants tried** in 5 families; each family's variant is chosen by in-sample Sharpe only.

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

OOS bars to beat: Sharpe > 1.20, max DD no deeper than -18.8%.

## Verdict
- trend: QQQ > SMA150 band 2% else cash: fails (OOS Sharpe 1.03, max DD -16.1%)
- dual_momentum: best of SPY/QQQ/IWM by 3m, else cash: fails (OOS Sharpe 0.57, max DD -19.5%)
- sector_rotation: top 1 sectors by 12m: fails (OOS Sharpe 0.14, max DD -28.8%)
- rsi2: QQQ RSI2 < 15 above SMA200, exit rsi70: fails (OOS Sharpe 0.46, max DD -12.0%)
- stocks_momentum (survivor-biased): top 3 large caps by 12-1m: fails (OOS Sharpe 1.26, max DD -35.9%) - second check only, survivor-biased list

Out of sample, 6 of 68 variants beat the Sharpe bar and 3 beat both bars (any variant, not just the chosen ones: picking the best of these after the fact would be look-ahead).

Caveats: one out-of-sample window of about 4 years, mostly a bull market; with 68 variants some pass by luck. The large-cap list is today's winners (survivorship bias), so its results overstate any edge.

Full table: results.csv. Run time 29 s.
