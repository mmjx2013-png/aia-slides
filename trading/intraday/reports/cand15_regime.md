# cand15 (rule B) by month and gold regime

| Month | Trades | Win | Avg R | P&L (10k start) | PAXG return | Avg daily range % | Days below SMA50 |
|---|---|---|---|---|---|---|---|
| 2026-02 | 4 | 25% | +0.49 | +197 | +4.0% | 2.73% | 0% |
| 2026-03 | 56 | 32% | -0.22 | -1,221 | -12.7% | 3.00% | 52% |
| 2026-04 | 55 | 33% | -0.08 | -421 | -1.5% | 1.93% | 97% |
| 2026-05 | 40 | 40% | -0.02 | -91 | -1.8% | 1.57% | 74% |
| 2026-06 | 46 | 43% | +0.14 | +639 | -11.7% | 2.12% | 100% |
| 2026-07 | 47 | 40% | +0.15 | +694 | +1.1% | 1.65% | 100% |
| 2026-08 | 46 | 37% | +0.09 | +399 | +10.0% | 1.69% | 13% |
| 2026-09 | 42 | 31% | -0.07 | -293 | -6.4% | 1.63% | 63% |
| 2026-10 | 35 | 60% | +0.64 | +2,247 | -6.4% | 1.23% | 100% |
| 2026-11 | 44 | 48% | +0.19 | +855 | -8.7% | 2.38% | 96% |

Correlation across months of cand15 avg R with: PAXG monthly return +0.20, average daily range -0.22 (n = 10 months, so weak evidence either way).

## Pre-registered regime switches (fit Feb-Jul, judged Aug-Nov)
| Switch | IS trades | IS avg R | OOS trades | OOS avg R | OOS all-trades avg R |
|---|---|---|---|---|---|
| vol_high | 31 | +0.163 | 65 | +0.110 | +0.192 |
| trend_down | 206 | +0.023 | 105 | +0.311 | +0.192 |

Chosen in-sample: **vol_high**; out of sample 65 trades, lead -0.082 R, band [-0.355, +0.198] -> **does not pass**: keep cand15 always on.
