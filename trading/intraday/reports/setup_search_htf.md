# Intraday setup search, 15m and 1h with wider stops (PAXG/USDT), code only

PAPER research. Data 2026-02-25 to 2026-11-24; in-sample before 2026-08-25, out-of-sample after.
Costs 0.35 USD/oz each side included. R = P&L / stop distance. Holds up to 2 days; forced exit at the weekend. Run 10 s.

## Multiple-testing warning
**4,608 variants tried.** Variants with >= 100 OOS trades: 1,288; of these 28% are positive OOS.
Selection: IS expectancy > 0 with >= 100 trades, then OOS > 0 with >= 100 trades. OOS t >= 2 is the stronger bar.

## Result
- Passed IS: 933. Passed OOS (> 0, >= 100 trades): **126**; with OOS t >= 2: **2**.

### Survivors (>= 100 OOS trades), best 25 by OOS t-stat
| tf   | setup                           | dir    | stop    | exit       | calendar   | session   |   med_hold_h |   is_n |   is_exp |   oos_n |   oos_exp |   oos_win |   oos_avg_win |   oos_avg_loss |   oos_pf |   oos_t |
|:-----|:--------------------------------|:-------|:--------|:-----------|:-----------|:----------|-------------:|-------:|---------:|--------:|----------:|----------:|--------------:|---------------:|---------:|--------:|
| 15m  | breakout donchian20 vol>1.5x    | fade   | 2.5xATR | ATR trail  | off        | all       |        1.217 |    510 |    0.017 |     221 |     0.182 |     0.403 |         1.370 |         -0.619 |    1.492 |   2.002 |
| 15m  | breakout donchian20 vol>1.5x    | fade   | 2.5xATR | ATR trail  | on         | all       |        1.317 |    418 |    0.007 |     173 |     0.214 |     0.416 |         1.383 |         -0.620 |    1.591 |   2.000 |
| 15m  | breakout donchian10 vol>1.5x    | fade   | 2.5xATR | ATR trail  | off        | all       |        1.250 |    561 |    0.035 |     254 |     0.132 |     0.394 |         1.272 |         -0.608 |    1.359 |   1.637 |
| 15m  | breakout donchian40 vol>1.5x    | follow | 1.5xATR | time 1440m | on         | all       |        1.433 |    198 |    0.283 |     105 |     0.532 |     0.190 |         7.263 |         -1.052 |    1.625 |   1.425 |
| 1h   | trend pullback EMA20            | fade   | 1.5xATR | ATR trail  | off        | all       |        3.258 |    230 |    0.023 |     120 |     0.154 |     0.433 |         1.183 |         -0.633 |    1.429 |   1.388 |
| 15m  | vol_expansion q=0.1 rng>1.5xATR | fade   | 1.5xATR | BE@1R + 3R | off        | all       |        0.500 |    262 |    0.026 |     114 |     0.215 |     0.263 |         2.897 |         -0.743 |    1.393 |   1.382 |
| 15m  | breakout donchian10 vol>1.5x    | fade   | 2.5xATR | ATR trail  | on         | all       |        1.375 |    478 |    0.014 |     206 |     0.121 |     0.388 |         1.279 |         -0.613 |    1.324 |   1.320 |
| 1h   | trend pullback EMA20            | fade   | 1.5xATR | ATR trail  | on         | all       |        3.558 |    198 |    0.038 |     104 |     0.157 |     0.433 |         1.180 |         -0.624 |    1.443 |   1.315 |
| 15m  | vol_expansion q=0.1 rng>1.5xATR | fade   | 1.5xATR | BE@1R + 3R | on         | all       |        0.533 |    224 |    0.075 |     109 |     0.209 |     0.266 |         2.895 |         -0.765 |    1.371 |   1.301 |
| 15m  | breakout donchian40 vol>1.5x    | follow | 1.5xATR | time 1440m | off        | all       |        1.167 |    250 |    0.122 |     121 |     0.455 |     0.174 |         7.629 |         -1.051 |    1.524 |   1.283 |
| 15m  | breakout donchian40 vol>1.5x    | fade   | 2.5xATR | ATR trail  | off        | all       |        1.283 |    428 |    0.024 |     193 |     0.095 |     0.399 |         1.200 |         -0.639 |    1.247 |   1.076 |
| 15m  | trend pullback EMA20            | fade   | 2.5xATR | ATR trail  | on         | all       |        2.133 |    464 |    0.007 |     230 |     0.084 |     0.413 |         1.121 |         -0.646 |    1.221 |   1.056 |
| 15m  | trend pullback EMA20 +EMA200    | follow | 1.5xATR | time 1440m | on         | all       |        2.100 |    262 |    0.087 |     125 |     0.964 |     0.160 |        11.388 |         -1.022 |    2.123 |   1.028 |
| 15m  | trend pullback EMA20            | follow | 1.5xATR | time 1440m | on         | all       |        2.083 |    342 |    0.018 |     158 |     0.756 |     0.158 |        10.230 |         -1.025 |    1.875 |   1.009 |
| 15m  | trend pullback EMA20            | follow | 1.5xATR | time 1440m | off        | all       |        1.867 |    367 |    0.006 |     170 |     0.701 |     0.159 |         9.850 |         -1.027 |    1.812 |   1.005 |
| 15m  | trend pullback EMA20 +EMA200    | follow | 1.5xATR | time 1440m | off        | all       |        2.100 |    275 |    0.092 |     131 |     0.898 |     0.160 |        10.963 |         -1.023 |    2.046 |   1.003 |
| 1h   | trend pullback EMA20            | fade   | 1.5xATR | time 240m  | off        | all       |        3.983 |    258 |    0.008 |     130 |     0.087 |     0.492 |         0.958 |         -0.758 |    1.226 |   0.926 |
| 15m  | trend pullback EMA20 +EMA200    | follow | 2.5xATR | time 1440m | off        | all       |        4.700 |    201 |    0.045 |     103 |     0.617 |     0.243 |         5.642 |         -0.994 |    1.820 |   0.899 |
| 15m  | vol_expansion q=0.1 rng>1.5xATR | follow | 1.5xATR | fixed 3R   | off        | all       |        0.642 |    240 |    0.009 |     108 |     0.160 |     0.315 |         2.864 |         -1.083 |    1.215 |   0.893 |
| 15m  | vol_expansion q=0.1 rng>1.5xATR | follow | 1.5xATR | fixed 3R   | on         | all       |        0.683 |    208 |    0.020 |     101 |     0.164 |     0.317 |         2.858 |         -1.086 |    1.221 |   0.884 |
| 15m  | breakout donchian10 vol>1.5x    | follow | 1.5xATR | time 1440m | on         | all       |        1.433 |    292 |    0.489 |     153 |     0.254 |     0.144 |         7.988 |         -1.045 |    1.283 |   0.830 |
| 15m  | breakout donchian20 vol>1.5x    | follow | 1.5xATR | time 1440m | on         | all       |        1.425 |    240 |    0.522 |     134 |     0.254 |     0.157 |         7.297 |         -1.055 |    1.285 |   0.823 |
| 15m  | mean_reversion rsi25/75 z2.0    | fade   | 1.5xATR | time 1440m | off        | all       |        1.167 |    178 |    0.226 |     106 |     0.447 |     0.142 |         9.567 |         -1.056 |    1.493 |   0.821 |
| 15m  | trend pullback EMA20            | follow | 2.5xATR | time 1440m | off        | all       |        4.500 |    261 |    0.003 |     133 |     0.437 |     0.241 |         4.912 |         -0.981 |    1.587 |   0.816 |
| 15m  | breakout donchian10             | fade   | 2.5xATR | ATR trail  | off        | london+ny |        2.200 |    452 |    0.025 |     222 |     0.058 |     0.369 |         1.152 |         -0.582 |    1.159 |   0.814 |

### Fewer than 100 OOS trades (30-99), positive IS and OOS, best 15 by t-stat (mostly 1h; treat as weak)
| tf   | setup                        | dir    | stop    | exit       | calendar   | session   |   med_hold_h |   is_n |   is_exp |   oos_n |   oos_exp |   oos_win |   oos_avg_win |   oos_avg_loss |   oos_pf |   oos_t |
|:-----|:-----------------------------|:-------|:--------|:-----------|:-----------|:----------|-------------:|-------:|---------:|--------:|----------:|----------:|--------------:|---------------:|---------:|--------:|
| 1h   | trend pullback EMA20         | fade   | 1.5xATR | BE@1R + 3R | off        | all       |        5.083 |    173 |    0.110 |      84 |     0.325 |     0.298 |         2.568 |         -0.625 |    1.742 |   1.867 |
| 1h   | trend pullback EMA20         | fade   | 1.5xATR | BE@1R + 2R | off        | all       |        4.483 |    181 |    0.051 |      99 |     0.237 |     0.384 |         1.770 |         -0.718 |    1.536 |   1.798 |
| 1h   | trend pullback EMA20         | fade   | 2.5xATR | ATR trail  | off        | all       |        7.983 |    153 |    0.005 |      76 |     0.214 |     0.526 |         0.963 |         -0.618 |    1.732 |   1.698 |
| 1h   | trend pullback EMA20         | fade   | 2.5xATR | ATR trail  | on         | all       |        7.958 |    138 |    0.000 |      72 |     0.209 |     0.514 |         0.992 |         -0.618 |    1.697 |   1.585 |
| 1h   | trend pullback EMA20         | fade   | 1.5xATR | fixed 3R   | off        | all       |        5.475 |    141 |    0.065 |      67 |     0.319 |     0.373 |         2.557 |         -1.013 |    1.503 |   1.432 |
| 1h   | trend pullback EMA20         | fade   | 1.5xATR | fixed 2R   | on         | all       |        4.792 |    140 |    0.051 |      80 |     0.228 |     0.450 |         1.741 |         -1.010 |    1.410 |   1.420 |
| 15m  | ma cross EMA50x200           | fade   | 2.5xATR | time 1440m | off        | all       |        6.967 |     64 |    0.075 |      35 |     0.678 |     0.371 |         3.454 |         -0.962 |    2.121 |   1.395 |
| 15m  | ma cross EMA50x200           | fade   | 2.5xATR | time 1440m | on         | all       |        7.167 |     59 |    0.066 |      32 |     0.719 |     0.375 |         3.511 |         -0.956 |    2.203 |   1.376 |
| 1h   | breakout donchian10 vol>1.5x | follow | 2.5xATR | time 1440m | off        | london+ny |       21.500 |     97 |    0.204 |      42 |     0.295 |     0.524 |         1.349 |         -0.865 |    1.716 |   1.311 |
| 1h   | breakout donchian10          | follow | 2.5xATR | time 1440m | on         | london+ny |       23.983 |     80 |    0.344 |      46 |     0.254 |     0.500 |         1.367 |         -0.859 |    1.591 |   1.235 |
| 1h   | breakout donchian10          | follow | 1.5xATR | fixed 3R   | on         | london+ny |        5.983 |     90 |    0.210 |      55 |     0.292 |     0.382 |         2.414 |         -1.018 |    1.464 |   1.213 |
| 1h   | breakout donchian20          | follow | 2.5xATR | time 1440m | on         | london+ny |       21.833 |     67 |    0.269 |      36 |     0.290 |     0.444 |         1.626 |         -0.778 |    1.671 |   1.209 |
| 1h   | breakout donchian10 vol>1.5x | follow | 1.5xATR | time 1440m | on         | london+ny |        9.592 |     70 |    0.321 |      30 |     0.476 |     0.400 |         2.718 |         -1.018 |    1.780 |   1.137 |
| 1h   | breakout donchian10 vol>1.5x | follow | 1.5xATR | fixed 3R   | on         | london+ny |        6.517 |     72 |    0.171 |      31 |     0.376 |     0.387 |         2.583 |         -1.018 |    1.602 |   1.133 |
| 1h   | breakout donchian20          | follow | 1.5xATR | fixed 3R   | on         | london+ny |        6.433 |     71 |    0.238 |      43 |     0.310 |     0.372 |         2.513 |         -0.996 |    1.496 |   1.127 |

### Median OOS expectancy by timeframe and stop (variants with >= 100 OOS trades)
| tf   | stop    |   oos_exp |
|:-----|:--------|----------:|
| 15m  | 1.5xATR |    -0.059 |
| 15m  | 2.5xATR |    -0.036 |
| 1h   | 1.5xATR |    -0.055 |
| 1h   | 2.5xATR |    -0.041 |

### By exit
| exit       |   oos_exp |
|:-----------|----------:|
| ATR trail  |    -0.039 |
| BE@1R + 2R |    -0.042 |
| BE@1R + 3R |    -0.053 |
| fixed 1.5R |    -0.063 |
| fixed 2R   |    -0.041 |
| fixed 3R   |    -0.059 |
| time 1440m |    -0.047 |
| time 240m  |    -0.053 |

### By family (first word of the setup)
| tf   | family         |   oos_exp |
|:-----|:---------------|----------:|
| 15m  | breakout       |    -0.049 |
| 15m  | ma             |    -0.011 |
| 15m  | mean_reversion |    -0.060 |
| 15m  | trend          |    -0.053 |
| 15m  | vol_expansion  |    -0.012 |
| 1h   | breakout       |    -0.053 |
| 1h   | trend          |    -0.130 |

## Conclusion (written after the run)
- **Wider stops help, but only by reducing the cost drag.** Median OOS expectancy is −0.04 to −0.06 R (1-minute search: −0.13 R),
  and 28% of variants are positive OOS (1-minute: 13%). It is still negative overall: no family has a positive median.
- **Best candidate:** 15m Donchian-20 breakout with volume > 1.5x, FADED, stop 2.5 x ATR(15m), ATR trailing exit: OOS +0.18 R,
  221 trades, t = 2.00, median hold 1.2 h (+0.21 R, t = 2.00 with the calendar proxy on). Its in-sample expectancy is only
  +0.02 R, though, and with 4,608 variants a best t of about 2 is what noise produces. That is not proof.
- **The "time 1440m" rows** (win rate about 16%, average win 7-11 R) depend on a few large trend days in the OOS period (gold's
  sharp Nov moves); their t-stats are about 1.0. Fragile.
- **1h** gives mostly fewer than 100 OOS trades. The best (fade EMA20 pullback, 84 OOS trades, t 1.87) is weak evidence.
- **Recommendation:** do not trade any of these as a proven edge. If wanted, run the best candidate as a code-only forward paper
  book (0 tokens) next to the AI desk to collect true out-of-sample trades before deciding.
