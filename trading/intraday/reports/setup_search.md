# Intraday setup search (PAXG/USDT 1m), code only

PAPER research. Data 2026-02-25 to 2026-11-24 (393,120 1m bars).
In-sample before 2026-08-25, out-of-sample after it. Costs 0.35 USD/oz each side are included.
R = P&L / stop distance (stop = 1.5 x ATR14 on 5m). Run time 11 s.

## Multiple-testing warning
**3,456 variants tried** (setup families x parameters x follow/fade x 8 exits x calendar proxy x 4 sessions).
Variants overlap heavily, so they are not independent, but with this many tries some will look good by chance.
Among variants with >= 100 out-of-sample trades, 13% have a positive out-of-sample expectancy.
Selection: in-sample expectancy > 0 with >= 100 trades, then out-of-sample expectancy > 0 with >= 100 trades.
A t-stat >= 2 out of sample is the stronger bar; even that is not proof at this number of tries.

## Result
- Passed in-sample: 380 variants. Of these, passed out-of-sample (> 0, >= 100 trades): **75**; with OOS t >= 2: **0**.

### Survivors with OOS t >= 2
(none)

### Top 25 survivors by OOS expectancy (R per trade after costs)
| setup                        | dir    | exit       | calendar   | session   |   is_n |   is_exp |   oos_n |   oos_exp |   oos_win |   oos_avg_win |   oos_avg_loss |   oos_pf |   oos_t |
|:-----------------------------|:-------|:-----------|:-----------|:----------|-------:|---------:|--------:|----------:|----------:|--------------:|---------------:|---------:|--------:|
| momentum 5xATR1 vol>2.0x     | fade   | time 60m   | off        | ny        |    251 |    0.000 |     111 |     0.260 |     0.378 |         2.203 |         -0.923 |    1.454 |   1.399 |
| momentum 5xATR1 vol>2.0x     | fade   | time 60m   | off        | all       |    402 |    0.005 |     181 |     0.147 |     0.359 |         2.145 |         -0.973 |    1.235 |   1.015 |
| momentum 5xATR1 vol>1.0x     | fade   | time 60m   | off        | london    |    329 |    0.033 |     156 |     0.144 |     0.346 |         2.411 |         -1.057 |    1.208 |   0.852 |
| mean_reversion rsi30/70 z2.0 | follow | BE@1R + 3R | off        | london    |    234 |    0.062 |     123 |     0.139 |     0.260 |         2.516 |         -0.697 |    1.270 |   1.014 |
| breakout n=6 vol>3.0x        | fade   | ATR trail  | on         | ny        |    258 |    0.015 |     104 |     0.135 |     0.452 |         1.194 |         -0.739 |    1.333 |   1.121 |
| breakout n=6 vol>2.0x        | follow | fixed 3R   | off        | overlap   |    279 |    0.115 |     135 |     0.123 |     0.319 |         2.627 |         -1.047 |    1.172 |   0.803 |
| mean_reversion rsi30/70 z2.0 | follow | ATR trail  | off        | ny        |    235 |    0.092 |     111 |     0.121 |     0.423 |         1.158 |         -0.641 |    1.326 |   1.113 |
| breakout n=12 vol>3.0x       | fade   | ATR trail  | on         | london    |    261 |    0.081 |     111 |     0.103 |     0.378 |         1.353 |         -0.658 |    1.251 |   0.884 |
| momentum 5xATR1 vol>2.0x     | fade   | ATR trail  | off        | london    |    253 |    0.048 |     103 |     0.097 |     0.350 |         1.602 |         -0.712 |    1.210 |   0.715 |
| mean_reversion rsi30/70 z2.0 | follow | BE@1R + 3R | off        | ny        |    216 |    0.032 |     102 |     0.097 |     0.275 |         2.174 |         -0.689 |    1.194 |   0.684 |
| momentum 4xATR1 vol>1.0x     | fade   | time 60m   | off        | overlap   |    257 |    0.053 |     113 |     0.092 |     0.319 |         2.444 |         -1.008 |    1.134 |   0.484 |
| breakout n=6 vol>1.5x        | follow | fixed 3R   | off        | overlap   |    336 |    0.052 |     163 |     0.089 |     0.313 |         2.588 |         -1.049 |    1.124 |   0.652 |
| breakout n=24 vol>3.0x       | fade   | ATR trail  | on         | all       |    360 |    0.093 |     156 |     0.088 |     0.417 |         1.183 |         -0.694 |    1.217 |   0.943 |
| breakout n=24 vol>2.0x       | fade   | fixed 2R   | on         | london    |    319 |    0.079 |     141 |     0.084 |     0.390 |         1.896 |         -1.075 |    1.128 |   0.683 |
| mean_reversion rsi30/70 z2.0 | follow | fixed 3R   | off        | london    |    225 |    0.130 |     118 |     0.081 |     0.331 |         2.348 |         -1.039 |    1.116 |   0.523 |
| mean_reversion rsi30/70 z2.0 | follow | BE@1R + 3R | off        | all       |    303 |    0.014 |     150 |     0.076 |     0.253 |         2.372 |         -0.703 |    1.145 |   0.636 |
| mean_reversion rsi30/70 z2.0 | follow | time 60m   | off        | ny        |    209 |    0.081 |     100 |     0.076 |     0.410 |         1.526 |         -0.932 |    1.138 |   0.513 |
| breakout n=12 vol>3.0x       | fade   | ATR trail  | on         | all       |    418 |    0.050 |     186 |     0.075 |     0.409 |         1.178 |         -0.687 |    1.186 |   0.881 |
| mean_reversion rsi30/70 z2.0 | follow | BE@1R + 2R | off        | london    |    237 |    0.084 |     123 |     0.075 |     0.317 |         1.850 |         -0.749 |    1.147 |   0.647 |
| mean_reversion rsi30/70 z2.0 | follow | fixed 2R   | off        | london    |    231 |    0.125 |     118 |     0.075 |     0.390 |         1.815 |         -1.037 |    1.118 |   0.573 |
| breakout n=6 vol>3.0x        | fade   | ATR trail  | on         | all       |    487 |    0.028 |     219 |     0.073 |     0.397 |         1.209 |         -0.676 |    1.179 |   0.912 |
| momentum 5xATR1 vol>1.0x     | fade   | time 60m   | on         | all       |    491 |    0.005 |     243 |     0.072 |     0.391 |         1.705 |         -0.976 |    1.121 |   0.649 |
| breakout n=24 vol>2.0x       | fade   | BE@1R + 3R | on         | london    |    323 |    0.131 |     143 |     0.067 |     0.224 |         2.822 |         -0.727 |    1.119 |   0.515 |
| breakout n=24 vol>2.0x       | fade   | ATR trail  | on         | london    |    334 |    0.079 |     147 |     0.066 |     0.395 |         1.261 |         -0.713 |    1.153 |   0.677 |
| breakout n=6 vol>3.0x        | fade   | ATR trail  | off        | ny        |    417 |    0.007 |     200 |     0.061 |     0.390 |         1.249 |         -0.699 |    1.144 |   0.587 |

### Baseline: the current live setups (follow, fixed 2R, no filters)
| setup                           | dir    | exit     | calendar   | session   |   is_n |   is_exp |   oos_n |   oos_exp |   oos_win |   oos_avg_win |   oos_avg_loss |   oos_pf |   oos_t |
|:--------------------------------|:-------|:---------|:-----------|:----------|-------:|---------:|--------:|----------:|----------:|--------------:|---------------:|---------:|--------:|
| breakout n=6 vol>1.5x           | follow | fixed 2R | off        | all       |   1042 |   -0.126 |     520 |    -0.208 |     0.296 |         1.818 |         -1.061 |    0.721 |  -3.552 |
| breakout n=6 vol>2.0x           | follow | fixed 2R | off        | all       |    849 |   -0.162 |     414 |    -0.241 |     0.285 |         1.821 |         -1.062 |    0.683 |  -3.695 |
| breakout n=6 vol>3.0x           | follow | fixed 2R | off        | all       |    576 |   -0.210 |     278 |    -0.197 |     0.295 |         1.860 |         -1.058 |    0.736 |  -2.436 |
| breakout n=12 vol>1.5x          | follow | fixed 2R | off        | all       |    884 |   -0.130 |     440 |    -0.228 |     0.291 |         1.804 |         -1.062 |    0.697 |  -3.615 |
| breakout n=12 vol>2.0x          | follow | fixed 2R | off        | all       |    733 |   -0.177 |     353 |    -0.263 |     0.280 |         1.798 |         -1.066 |    0.657 |  -3.765 |
| breakout n=12 vol>3.0x          | follow | fixed 2R | off        | all       |    498 |   -0.219 |     242 |    -0.179 |     0.302 |         1.850 |         -1.056 |    0.757 |  -2.061 |
| breakout n=24 vol>1.5x          | follow | fixed 2R | off        | all       |    726 |   -0.124 |     359 |    -0.196 |     0.304 |         1.802 |         -1.068 |    0.736 |  -2.770 |
| breakout n=24 vol>2.0x          | follow | fixed 2R | off        | all       |    624 |   -0.168 |     291 |    -0.195 |     0.306 |         1.798 |         -1.072 |    0.739 |  -2.461 |
| breakout n=24 vol>3.0x          | follow | fixed 2R | off        | all       |    442 |   -0.219 |     203 |    -0.104 |     0.330 |         1.843 |         -1.063 |    0.854 |  -1.066 |
| vol_expansion q=0.1 rng>1.5xATR | follow | fixed 2R | off        | all       |    353 |   -0.150 |     191 |    -0.354 |     0.262 |         1.778 |         -1.110 |    0.568 |  -3.736 |
| vol_expansion q=0.1 rng>2.0xATR | follow | fixed 2R | off        | all       |    185 |   -0.214 |      88 |    -0.419 |     0.239 |         1.812 |         -1.119 |    0.508 |  -3.016 |
| vol_expansion q=0.1 rng>2.5xATR | follow | fixed 2R | off        | all       |     88 |   -0.025 |      44 |    -0.613 |     0.182 |         1.896 |         -1.171 |    0.360 |  -3.262 |
| vol_expansion q=0.2 rng>1.5xATR | follow | fixed 2R | off        | all       |    563 |   -0.113 |     322 |    -0.188 |     0.317 |         1.804 |         -1.111 |    0.753 |  -2.434 |
| vol_expansion q=0.2 rng>2.0xATR | follow | fixed 2R | off        | all       |    296 |   -0.163 |     156 |    -0.228 |     0.301 |         1.832 |         -1.117 |    0.708 |  -2.054 |
| vol_expansion q=0.2 rng>2.5xATR | follow | fixed 2R | off        | all       |    143 |   -0.108 |      77 |    -0.405 |     0.247 |         1.899 |         -1.160 |    0.536 |  -2.623 |
| momentum 3xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |   1484 |   -0.102 |     716 |    -0.130 |     0.325 |         1.796 |         -1.059 |    0.818 |  -2.549 |
| momentum 3xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |    971 |   -0.165 |     450 |    -0.039 |     0.360 |         1.770 |         -1.056 |    0.943 |  -0.589 |
| momentum 4xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |    968 |   -0.111 |     446 |    -0.118 |     0.332 |         1.791 |         -1.066 |    0.834 |  -1.815 |
| momentum 4xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |    629 |   -0.138 |     280 |    -0.100 |     0.343 |         1.742 |         -1.061 |    0.857 |  -1.222 |
| momentum 5xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |    554 |   -0.139 |     266 |    -0.206 |     0.301 |         1.769 |         -1.056 |    0.721 |  -2.533 |
| momentum 5xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |    387 |   -0.190 |     173 |    -0.085 |     0.341 |         1.781 |         -1.051 |    0.877 |  -0.813 |
| mean_reversion rsi20/80 z2.0    | follow | fixed 2R | off        | all       |     99 |   -0.095 |      49 |    -0.127 |     0.327 |         1.691 |         -1.009 |    0.813 |  -0.674 |
| mean_reversion rsi20/80 z2.5    | follow | fixed 2R | off        | all       |     52 |   -0.148 |      19 |     0.014 |     0.368 |         1.846 |         -1.055 |    1.020 |   0.041 |
| mean_reversion rsi25/75 z2.0    | follow | fixed 2R | off        | all       |    178 |    0.045 |      95 |    -0.060 |     0.347 |         1.715 |         -1.005 |    0.908 |  -0.439 |
| mean_reversion rsi25/75 z2.5    | follow | fixed 2R | off        | all       |     94 |    0.094 |      36 |     0.060 |     0.389 |         1.777 |         -1.032 |    1.095 |   0.254 |
| mean_reversion rsi30/70 z2.0    | follow | fixed 2R | off        | all       |    298 |    0.100 |     145 |    -0.006 |     0.366 |         1.754 |         -1.020 |    0.991 |  -0.052 |
| mean_reversion rsi30/70 z2.5    | follow | fixed 2R | off        | all       |    146 |    0.119 |      58 |    -0.020 |     0.362 |         1.757 |         -1.028 |    0.970 |  -0.108 |

### Exit rules compared (median OOS expectancy over all variants with >= 100 OOS trades)
| exit       |   oos_exp |
|:-----------|----------:|
| ATR trail  |    -0.080 |
| BE@1R + 2R |    -0.120 |
| BE@1R + 3R |    -0.118 |
| fixed 1.5R |    -0.157 |
| fixed 2R   |    -0.126 |
| fixed 3R   |    -0.103 |
| time 30m   |    -0.143 |
| time 60m   |    -0.139 |

### Sessions and calendar proxy (median OOS expectancy, >= 100 OOS trades)
| session   | calendar   |   oos_exp |
|:----------|:-----------|----------:|
| all       | off        |    -0.130 |
| all       | on         |    -0.148 |
| london    | off        |    -0.126 |
| london    | on         |    -0.130 |
| ny        | off        |    -0.118 |
| ny        | on         |    -0.126 |
| overlap   | off        |    -0.067 |

## Conclusion (written after the run)
- **The current live setups lose out of sample, and clearly:** breakout n=12 vol>2x −0.26 R per trade (t −3.8, 353 trades),
  vol_expansion q=0.2 −0.23 R (t −2.1), momentum 4x vol>2x −0.10 R, mean_reversion rsi25/75 −0.06 R (95 trades).
- **No variant has a convincing edge.** Of 1,723 variants with >= 100 out-of-sample trades, only 219 (13%) are positive, and
  the best OOS t-stat is 1.93. With 3,456 variants tried, the 75 "survivors" are what noise is expected to produce.
- **Costs are the problem.** The median variant loses about 0.13 R, roughly the round-trip cost of 0.70 USD/oz against a
  stop of 1.5 x ATR(5m), which is about 4-6 USD. Before costs these setups are close to zero edge.
- **Breakeven at +1R:** compared with a fixed 2R exit on the same variant, it adds a median +0.02 R and is better in 64% of
  cases. That is a small, consistent help that does not create an edge. The ATR trail is the least bad exit (median −0.08 R).
- **Sessions:** the London/NY overlap is the least bad (median −0.07 R). The calendar proxy does not help on its own.
- **Implication:** at this cost and horizon, an AI filter must add more than about 0.13 R per trade just to break even. Wider
  stops on 15m/1h setups would cut the cost share and are worth testing next. Do not swap the live setups to any survivor.
