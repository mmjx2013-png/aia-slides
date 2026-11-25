# Intraday setup search (PAXG/USDT 1m), code only

PAPER research. Data 2026-02-25 to 2026-03-31 (50,400 1m bars).
In-sample before 2026-03-20, out-of-sample after it. Costs 0.35 USD/oz each side are included.
R = P&L / stop distance (stop = 1.5 x ATR14 on 5m). Run time 2 s.

## Multiple-testing warning
**3,456 variants tried** (setup families x parameters x follow/fade x 8 exits x calendar proxy x 4 sessions).
Variants overlap heavily, so they are not independent, but with this many tries some will look good by chance.
Among variants with >= 100 out-of-sample trades, 0% have a positive out-of-sample expectancy.
Selection: in-sample expectancy > 0 with >= 100 trades, then out-of-sample expectancy > 0 with >= 100 trades.
A t-stat >= 2 out of sample is the stronger bar; even that is not proof at this number of tries.

## Result
- Passed in-sample: 62 variants. Of these, passed out-of-sample (> 0, >= 100 trades): **0**; with OOS t >= 2: **0**.

### Survivors with OOS t >= 2
(none)

### Top 25 survivors by OOS expectancy (R per trade after costs)
(none)

### Baseline: the current live setups (follow, fixed 2R, no filters)
| setup                           | dir    | exit     | calendar   | session   |   is_n |   is_exp |   oos_n |   oos_exp |   oos_win |   oos_avg_win |   oos_avg_loss |   oos_pf |   oos_t |
|:--------------------------------|:-------|:---------|:-----------|:----------|-------:|---------:|--------:|----------:|----------:|--------------:|---------------:|---------:|--------:|
| breakout n=6 vol>1.5x           | follow | fixed 2R | off        | all       |    134 |   -0.012 |      67 |    -0.105 |     0.313 |         1.887 |         -1.013 |    0.850 |  -0.626 |
| breakout n=6 vol>2.0x           | follow | fixed 2R | off        | all       |    105 |   -0.148 |      52 |    -0.006 |     0.346 |         1.896 |         -1.013 |    0.991 |  -0.030 |
| breakout n=6 vol>3.0x           | follow | fixed 2R | off        | all       |     75 |   -0.070 |      29 |    -0.237 |     0.276 |         1.813 |         -1.018 |    0.678 |  -0.977 |
| breakout n=12 vol>1.5x          | follow | fixed 2R | off        | all       |    111 |    0.021 |      61 |    -0.070 |     0.328 |         1.883 |         -1.023 |    0.898 |  -0.394 |
| breakout n=12 vol>2.0x          | follow | fixed 2R | off        | all       |     86 |   -0.193 |      48 |     0.012 |     0.354 |         1.893 |         -1.020 |    1.018 |   0.058 |
| breakout n=12 vol>3.0x          | follow | fixed 2R | off        | all       |     62 |   -0.154 |      27 |    -0.188 |     0.296 |         1.813 |         -1.030 |    0.741 |  -0.727 |
| breakout n=24 vol>1.5x          | follow | fixed 2R | off        | all       |     92 |   -0.019 |      49 |    -0.079 |     0.327 |         1.862 |         -1.020 |    0.885 |  -0.400 |
| breakout n=24 vol>2.0x          | follow | fixed 2R | off        | all       |     76 |   -0.159 |      42 |     0.019 |     0.357 |         1.884 |         -1.018 |    1.029 |   0.085 |
| breakout n=24 vol>3.0x          | follow | fixed 2R | off        | all       |     54 |   -0.188 |      23 |    -0.170 |     0.304 |         1.793 |         -1.029 |    0.762 |  -0.605 |
| vol_expansion q=0.1 rng>1.5xATR | follow | fixed 2R | off        | all       |     33 |    0.347 |      19 |     0.335 |     0.474 |         1.851 |         -1.029 |    1.619 |   0.979 |
| vol_expansion q=0.1 rng>2.0xATR | follow | fixed 2R | off        | all       |     20 |    0.482 |       8 |     0.094 |     0.375 |         1.956 |         -1.023 |    1.148 |   0.173 |
| vol_expansion q=0.1 rng>2.5xATR | follow | fixed 2R | off        | all       |      8 |    0.741 |       3 |     0.963 |     0.667 |         1.958 |         -1.027 |    3.816 |   0.968 |
| vol_expansion q=0.2 rng>1.5xATR | follow | fixed 2R | off        | all       |     57 |    0.268 |      33 |     0.209 |     0.424 |         1.892 |         -1.031 |    1.352 |   0.814 |
| vol_expansion q=0.2 rng>2.0xATR | follow | fixed 2R | off        | all       |     29 |    0.107 |      14 |     0.039 |     0.357 |         1.961 |         -1.029 |    1.059 |   0.098 |
| vol_expansion q=0.2 rng>2.5xATR | follow | fixed 2R | off        | all       |     12 |    0.144 |       8 |     0.090 |     0.375 |         1.963 |         -1.035 |    1.138 |   0.163 |
| momentum 3xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |    198 |   -0.053 |      78 |    -0.001 |     0.346 |         1.859 |         -0.986 |    0.998 |  -0.007 |
| momentum 3xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |    125 |   -0.166 |      55 |    -0.098 |     0.309 |         1.900 |         -0.992 |    0.857 |  -0.534 |
| momentum 4xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |    120 |   -0.124 |      42 |     0.255 |     0.429 |         1.967 |         -1.030 |    1.433 |   1.099 |
| momentum 4xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |     79 |   -0.216 |      30 |     0.068 |     0.367 |         1.964 |         -1.029 |    1.105 |   0.255 |
| momentum 5xATR1 vol>1.0x        | follow | fixed 2R | off        | all       |     62 |   -0.142 |      24 |     0.479 |     0.500 |         1.967 |         -1.009 |    1.950 |   1.544 |
| momentum 5xATR1 vol>2.0x        | follow | fixed 2R | off        | all       |     44 |   -0.351 |      17 |     0.378 |     0.471 |         1.964 |         -1.032 |    1.692 |   1.012 |
| mean_reversion rsi20/80 z2.0    | follow | fixed 2R | off        | all       |     20 |   -0.672 |       3 |    -0.017 |     0.333 |         1.984 |         -1.017 |    0.975 |  -0.017 |
| mean_reversion rsi20/80 z2.5    | follow | fixed 2R | off        | all       |      9 |   -0.578 |       3 |    -0.017 |     0.333 |         1.984 |         -1.017 |    0.975 |  -0.017 |
| mean_reversion rsi25/75 z2.0    | follow | fixed 2R | off        | all       |     34 |   -0.595 |       9 |     0.648 |     0.556 |         1.981 |         -1.019 |    2.430 |   1.229 |
| mean_reversion rsi25/75 z2.5    | follow | fixed 2R | off        | all       |     15 |   -0.648 |       7 |     0.697 |     0.571 |         1.983 |         -1.018 |    2.597 |   1.149 |
| mean_reversion rsi30/70 z2.0    | follow | fixed 2R | off        | all       |     51 |   -0.469 |      15 |     0.455 |     0.533 |         1.747 |         -1.022 |    1.954 |   1.170 |
| mean_reversion rsi30/70 z2.5    | follow | fixed 2R | off        | all       |     22 |   -0.360 |      12 |     0.324 |     0.500 |         1.670 |         -1.021 |    1.635 |   0.749 |

### Exit rules compared (median OOS expectancy over all variants with >= 100 OOS trades)
| exit     |   oos_exp |
|:---------|----------:|
| time 30m |    -0.159 |

### Sessions and calendar proxy (median OOS expectancy, >= 100 OOS trades)
| session   | calendar   |   oos_exp |
|:----------|:-----------|----------:|
| all       | off        |    -0.159 |
