Chosen (best in-sample Sharpe): **Momentum 6m top10 +DDstop**

Tickers missing from Yahoo: none

Data: 2016-11-25 to 2026-11-25

### In-sample 2016-2023

| family    | strategy                                       | Total   | CAGR   | Max DD   | Vol    |   Sharpe |   Trades | Turnover   |   Costs THB |   DD stops |
|:----------|:-----------------------------------------------|:--------|:-------|:---------|:-------|---------:|---------:|:-----------|------------:|-----------:|
| Benchmark | SET50 (TDEX ETF proxy) B&H (price only)        | -7.2%   | -1.1%  | -41.8%   | +14.8% |    -0.13 |        1 | 0.1x/yr    |         220 |          0 |
| Benchmark | Equal-weight SET50 stocks B&H (with dividends) | +64.9%  | +7.3%  | -38.4%   | +16.5% |     0.41 |       40 | 0.1x/yr    |         217 |          0 |
| Momentum  | Momentum 6m top5                               | +215.2% | +17.6% | -38.4%   | +24.4% |     0.73 |      305 | 8.2x/yr    |      25,085 |          0 |
| Momentum  | Momentum 6m top5 +DDstop                       | +225.1% | +18.1% | -25.7%   | +20.8% |     0.84 |      320 | 8.7x/yr    |      27,641 |          4 |
| Momentum  | Momentum 6m top10                              | +101.7% | +10.4% | -37.3%   | +16.3% |     0.59 |      509 | 6.0x/yr    |      14,263 |          0 |
| Momentum  | Momentum 6m top10 +DDstop                      | +159.9% | +14.4% | -16.7%   | +14.2% |     0.91 |      507 | 6.3x/yr    |      17,356 |          1 |
| Momentum  | Momentum 12m top10                             | +97.9%  | +10.1% | -25.5%   | +14.8% |     0.61 |      335 | 3.8x/yr    |       8,380 |          0 |
| Momentum  | Momentum 12m top10 +DDstop                     | +66.0%  | +7.4%  | -29.6%   | +13.7% |     0.47 |      340 | 3.8x/yr    |       7,481 |          1 |
| Trend     | Trend SMA200 (EW all)                          | +9.5%   | +1.3%  | -4.0%    | +2.6%  |    -0.25 |      688 | 1.8x/yr    |       2,990 |          0 |
| Trend     | Trend SMA200 (EW all) +DDstop                  | +9.5%   | +1.3%  | -4.0%    | +2.6%  |    -0.25 |      688 | 1.8x/yr    |       2,990 |          0 |
| Trend     | Trend SMA100 (EW all)                          | +7.1%   | +1.0%  | -6.6%    | +2.9%  |    -0.33 |     1146 | 3.1x/yr    |       5,023 |          0 |
| Trend     | Trend SMA100 (EW all) +DDstop                  | +7.1%   | +1.0%  | -6.6%    | +2.9%  |    -0.33 |     1146 | 3.1x/yr    |       5,023 |          0 |
| Trend     | Trend SMA200 + Mom12m10                        | +22.9%  | +2.9%  | -16.4%   | +9.0%  |     0.16 |      560 | 6.5x/yr    |      11,070 |          0 |
| Trend     | Trend SMA200 + Mom12m10 +DDstop                | +23.1%  | +3.0%  | -16.2%   | +9.0%  |     0.16 |      558 | 6.5x/yr    |      11,025 |          1 |
| MeanRev   | MeanRev 5d top5                                | -13.1%  | -2.0%  | -39.6%   | +17.8% |    -0.14 |     2105 | 54.6x/yr   |      85,417 |          0 |
| MeanRev   | MeanRev 5d top5 +DDstop                        | +19.9%  | +2.6%  | -30.9%   | +15.9% |     0.12 |     2091 | 55.9x/yr   |     107,793 |          4 |
| MeanRev   | MeanRev 5d top10                               | -6.9%   | -1.0%  | -39.5%   | +14.0% |    -0.15 |     2669 | 32.1x/yr   |      49,801 |          0 |
| MeanRev   | MeanRev 5d top10 +DDstop                       | +25.4%  | +3.2%  | -19.0%   | +12.1% |     0.17 |     2783 | 35.2x/yr   |      65,025 |          2 |
| MeanRev   | MeanRev 10d top10                              | -10.7%  | -1.6%  | -41.8%   | +13.7% |    -0.2  |     2026 | 24.2x/yr   |      35,940 |          0 |
| MeanRev   | MeanRev 10d top10 +DDstop                      | +21.5%  | +2.8%  | -18.6%   | +11.7% |     0.13 |     2152 | 26.3x/yr   |      46,438 |          1 |
| LowVol    | LowVol 60d top10                               | +11.1%  | +1.5%  | -30.5%   | +9.6%  |     0    |      314 | 3.7x/yr    |       6,160 |          0 |
| LowVol    | LowVol 60d top10 +DDstop                       | +22.8%  | +2.9%  | -15.2%   | +8.7%  |     0.16 |      327 | 3.9x/yr    |       6,976 |          1 |
| LowVol    | LowVol 250d top10                              | +16.4%  | +2.2%  | -24.4%   | +8.5%  |     0.07 |      114 | 1.3x/yr    |       2,142 |          0 |
| LowVol    | LowVol 250d top10 +DDstop                      | +8.7%   | +1.2%  | -20.3%   | +7.4%  |    -0.07 |      119 | 1.3x/yr    |       2,096 |          1 |
| LowVol    | LowVol 250d top15                              | -1.5%   | -0.2%  | -27.1%   | +8.1%  |    -0.23 |      162 | 1.2x/yr    |       1,829 |          0 |
| LowVol    | LowVol 250d top15 +DDstop                      | +1.0%   | +0.1%  | -19.0%   | +6.8%  |    -0.24 |      174 | 1.2x/yr    |       1,987 |          1 |

### Out-of-sample 2024-01-01 to 2026-11-25

| family    | strategy                                       | Total   | CAGR   | Max DD   | Vol    |   Sharpe |   Trades | Turnover   |   Costs THB |   DD stops |
|:----------|:-----------------------------------------------|:--------|:-------|:---------|:-------|---------:|---------:|:-----------|------------:|-----------:|
| Benchmark | SET50 (TDEX ETF proxy) B&H (price only)        | +12.5%  | +4.1%  | -29.1%   | +15.5% |     0.22 |        1 | 0.3x/yr    |         220 |          0 |
| Benchmark | Equal-weight SET50 stocks B&H (with dividends) | +19.2%  | +6.2%  | -23.5%   | +15.3% |     0.36 |       48 | 0.3x/yr    |         216 |          0 |
| Momentum  | Momentum 6m top5                               | -2.6%   | -0.9%  | -37.1%   | +22.1% |    -0.02 |      143 | 8.4x/yr    |       6,066 |          0 |
| Momentum  | Momentum 6m top5 +DDstop                       | -7.7%   | -2.7%  | -40.3%   | +19.9% |    -0.15 |      166 | 10.0x/yr   |       7,086 |          4 |
| Momentum  | Momentum 6m top10                              | -5.0%   | -1.7%  | -22.2%   | +14.0% |    -0.2  |      203 | 5.4x/yr    |       3,368 |          0 |
| Momentum  | Momentum 6m top10 +DDstop                      | -9.5%   | -3.4%  | -25.5%   | +13.4% |    -0.35 |      206 | 5.5x/yr    |       3,349 |          1 |
| Momentum  | Momentum 12m top10                             | +40.6%  | +12.5% | -17.0%   | +12.9% |     0.86 |      141 | 3.9x/yr    |       3,086 |          0 |
| Momentum  | Momentum 12m top10 +DDstop                     | +40.6%  | +12.5% | -17.0%   | +12.9% |     0.86 |      141 | 3.9x/yr    |       3,086 |          1 |
| Trend     | Trend SMA200 (EW all)                          | +6.4%   | +2.2%  | -7.4%    | +4.2%  |     0.08 |      151 | 0.8x/yr    |         526 |          0 |
| Trend     | Trend SMA200 (EW all) +DDstop                  | +6.4%   | +2.2%  | -7.4%    | +4.2%  |     0.08 |      151 | 0.8x/yr    |         526 |          0 |
| Trend     | Trend SMA100 (EW all)                          | +11.5%  | +3.8%  | -6.4%    | +4.8%  |     0.42 |      394 | 2.3x/yr    |       1,491 |          0 |
| Trend     | Trend SMA100 (EW all) +DDstop                  | +11.5%  | +3.8%  | -6.4%    | +4.8%  |     0.42 |      394 | 2.3x/yr    |       1,491 |          0 |
| Trend     | Trend SMA200 + Mom12m10                        | +23.3%  | +7.5%  | -15.5%   | +9.2%  |     0.64 |      112 | 3.4x/yr    |       2,374 |          0 |
| Trend     | Trend SMA200 + Mom12m10 +DDstop                | +23.3%  | +7.5%  | -15.5%   | +9.2%  |     0.64 |      112 | 3.4x/yr    |       2,374 |          1 |
| MeanRev   | MeanRev 5d top5                                | -29.1%  | -11.2% | -36.7%   | +18.6% |    -0.68 |      938 | 58.7x/yr   |      34,477 |          0 |
| MeanRev   | MeanRev 5d top5 +DDstop                        | -30.3%  | -11.7% | -37.4%   | +17.7% |    -0.76 |      878 | 55.5x/yr   |      32,086 |          3 |
| MeanRev   | MeanRev 5d top10                               | -17.2%  | -6.3%  | -22.2%   | +12.5% |    -0.64 |     1176 | 34.6x/yr   |      21,166 |          0 |
| MeanRev   | MeanRev 5d top10 +DDstop                       | -18.1%  | -6.7%  | -23.1%   | +12.5% |    -0.68 |     1147 | 33.8x/yr   |      20,595 |          1 |
| MeanRev   | MeanRev 10d top10                              | -16.0%  | -5.8%  | -23.9%   | +12.5% |    -0.6  |      931 | 27.1x/yr   |      16,358 |          0 |
| MeanRev   | MeanRev 10d top10 +DDstop                      | -22.6%  | -8.5%  | -28.7%   | +12.3% |    -0.85 |      877 | 26.1x/yr   |      15,202 |          2 |
| LowVol    | LowVol 60d top10                               | +8.0%   | +2.7%  | -10.7%   | +6.1%  |     0.16 |      119 | 3.3x/yr    |       2,037 |          0 |
| LowVol    | LowVol 60d top10 +DDstop                       | +8.0%   | +2.7%  | -10.7%   | +6.1%  |     0.16 |      119 | 3.3x/yr    |       2,037 |          0 |
| LowVol    | LowVol 250d top10                              | +5.1%   | +1.7%  | -11.1%   | +5.8%  |    -0.01 |       57 | 1.6x/yr    |         948 |          0 |
| LowVol    | LowVol 250d top10 +DDstop                      | +5.1%   | +1.7%  | -11.1%   | +5.8%  |    -0.01 |       57 | 1.6x/yr    |         948 |          0 |
| LowVol    | LowVol 250d top15                              | +2.5%   | +0.9%  | -13.3%   | +6.5%  |    -0.14 |       68 | 1.2x/yr    |         737 |          0 |
| LowVol    | LowVol 250d top15 +DDstop                      | +2.5%   | +0.9%  | -13.3%   | +6.5%  |    -0.14 |       68 | 1.2x/yr    |         737 |          0 |
