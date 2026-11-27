# Indicator scorecard (PAXG, code only, PAPER research)

Data: PAXG/USDT 1m 2026-02-25 to 2026-11-27, resampled to 15m / 1h / 4h. Discovery Feb-Jun 2026, confirmation Jul-Nov 2026.
Return = close-to-close h bars after the signal bar, in the signal direction, net of 0.70 USD round trip, in ATR(14) units of that timeframe.
Events thinned so none overlap within h. p one-sided (mean > 0), normal approximation; q = Benjamini-Hochberg over ALL 306 tests on the confirmation p (n < 20 counts as p = 1).
TRUST: mean > 0 in both halves AND q < 0.05. WEAK: mean > 0 in both halves, q >= 0.05. DON'T TRUST: otherwise.
Top indicators in Opus 'why' text (10 answers grepped): VWAP 5, overbought/oversold 3, ADX 2: all covered by rows below.

## Verdict

Indicator scorecard (PAXG 1m 2026-02-25..2026-11-27, 306 tests, BH-corrected): nothing passes TRUST. 42 of 288 WEAK (positive both halves, not significant; random entry alone gets 1 of 18). No 15m signal is positive in both halves after the 0.70 round-trip cost. Treat RSI/VWAP/ADX/EMA/MACD readings as context, not as edges.

By indicator (best verdict over timeframe / side / horizon): Bollinger outside (revert) DON'T; RSI14 <30 / >70 (revert) DON'T; RSI2 <10 / >90 (revert) DON'T; ADX>25 with DI WEAK; Bollinger outside (breakout) WEAK; Daily VWAP cross WEAK; Daily VWAP side WEAK; Donchian20 break (fade) WEAK; Donchian20 break (follow) WEAK; EMA20/50 cross WEAK; Ichimoku cloud side WEAK; MACD signal-line cross WEAK; MACD zero-line side WEAK; Price side of EMA200 WEAK; Stoch 14,3 cross <20 / >80 WEAK; Volume spike 1.5x, bar dir WEAK

Random-entry baseline rows: 4h short h4 DON'T TRUST (conf mean +0.24 ATR, n 38); 1h long h4 DON'T TRUST (conf mean -0.05 ATR, n 151); 1h short h4 DON'T TRUST (conf mean -0.11 ATR, n 151); 4h long h4 DON'T TRUST (conf mean -0.30 ATR, n 38); 15m long h4 DON'T TRUST (conf mean -0.28 ATR, n 644); 15m short h4 DON'T TRUST (conf mean -0.30 ATR, n 644)

## All tests (sorted: verdict, then confirmation t)

| Signal | TF | Side | h | n disc | hit disc | mean disc | n conf | hit conf | mean conf | t conf | q | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MACD signal-line cross | 4h | short | 4 | 19 | 68% | +0.920 | 30 | 60% | +0.607 | +2.60 | 1.000 | WEAK |
| MACD signal-line cross | 4h | short | 1 | 20 | 50% | +0.071 | 30 | 50% | +0.266 | +2.04 | 1.000 | WEAK |
| EMA20/50 cross | 4h | long | 1 | 4 | 50% | +0.133 | 8 | 100% | +0.742 | +1.97 | 1.000 | WEAK |
| Bollinger outside (breakout) | 4h | short | 1 | 24 | 54% | +0.256 | 36 | 61% | +0.340 | +1.83 | 1.000 | WEAK |
| Bollinger outside (breakout) | 4h | short | 4 | 20 | 55% | +0.216 | 33 | 55% | +0.605 | +1.63 | 1.000 | WEAK |
| Volume spike 1.5x, bar dir | 4h | short | 1 | 73 | 51% | +0.071 | 125 | 57% | +0.122 | +1.58 | 1.000 | WEAK |
| Random entry (baseline) | 4h | short | 12 | 20 | 45% | +0.216 | 25 | 56% | +0.666 | +1.22 | 1.000 | WEAK |
| Price side of EMA200 | 1h | short | 12 | 173 | 51% | +0.337 | 205 | 50% | +0.362 | +1.19 | 1.000 | WEAK |
| Volume spike 1.5x, bar dir | 4h | short | 4 | 41 | 59% | +0.108 | 72 | 56% | +0.214 | +1.14 | 1.000 | WEAK |
| EMA20/50 cross | 1h | short | 12 | 29 | 52% | +0.467 | 36 | 58% | +0.408 | +1.12 | 1.000 | WEAK |
| EMA20/50 cross | 4h | long | 4 | 4 | 75% | +0.703 | 8 | 75% | +0.644 | +1.09 | 1.000 | WEAK |
| Donchian20 break (follow) | 4h | short | 1 | 23 | 48% | +0.066 | 37 | 57% | +0.143 | +0.98 | 1.000 | WEAK |
| Daily VWAP cross | 4h | short | 4 | 72 | 51% | +0.181 | 113 | 54% | +0.151 | +0.97 | 1.000 | WEAK |
| Price side of EMA200 | 4h | short | 12 | 43 | 53% | +0.399 | 58 | 53% | +0.376 | +0.96 | 1.000 | WEAK |
| Volume spike 1.5x, bar dir | 4h | short | 12 | 24 | 58% | +0.632 | 43 | 53% | +0.437 | +0.95 | 1.000 | WEAK |
| Ichimoku cloud side | 1h | short | 12 | 142 | 51% | +0.362 | 168 | 52% | +0.321 | +0.87 | 1.000 | WEAK |
| Stoch 14,3 cross <20 / >80 | 1h | short | 4 | 73 | 52% | +0.076 | 102 | 54% | +0.124 | +0.82 | 1.000 | WEAK |
| Donchian20 break (follow) | 1h | short | 12 | 63 | 56% | +0.714 | 81 | 51% | +0.518 | +0.79 | 1.000 | WEAK |
| Daily VWAP side | 4h | short | 4 | 106 | 49% | +0.160 | 164 | 53% | +0.098 | +0.78 | 1.000 | WEAK |
| MACD zero-line side | 1h | short | 12 | 158 | 53% | +0.330 | 182 | 48% | +0.237 | +0.78 | 1.000 | WEAK |
| Stoch 14,3 cross <20 / >80 | 4h | long | 12 | 11 | 73% | +1.515 | 24 | 58% | +0.418 | +0.69 | 1.000 | WEAK |
| Daily VWAP side | 4h | short | 12 | 43 | 53% | +0.155 | 64 | 58% | +0.235 | +0.64 | 1.000 | WEAK |
| Ichimoku cloud side | 4h | short | 4 | 79 | 53% | +0.158 | 127 | 50% | +0.095 | +0.63 | 1.000 | WEAK |
| Price side of EMA200 | 4h | short | 4 | 121 | 54% | +0.089 | 174 | 54% | +0.073 | +0.63 | 1.000 | WEAK |
| Donchian20 break (fade) | 4h | short | 12 | 9 | 56% | +0.053 | 17 | 53% | +0.542 | +0.60 | 1.000 | WEAK |
| MACD signal-line cross | 4h | short | 12 | 17 | 71% | +1.227 | 28 | 57% | +0.367 | +0.58 | 1.000 | WEAK |
| MACD zero-line side | 4h | short | 4 | 89 | 54% | +0.183 | 143 | 49% | +0.082 | +0.56 | 1.000 | WEAK |
| Daily VWAP side | 1h | short | 12 | 193 | 55% | +0.369 | 239 | 50% | +0.130 | +0.53 | 1.000 | WEAK |
| Daily VWAP cross | 4h | short | 12 | 36 | 53% | +0.450 | 57 | 58% | +0.221 | +0.53 | 1.000 | WEAK |
| Stoch 14,3 cross <20 / >80 | 4h | long | 4 | 14 | 50% | +0.196 | 30 | 53% | +0.148 | +0.50 | 1.000 | WEAK |
| Bollinger outside (breakout) | 4h | short | 12 | 16 | 56% | +0.303 | 25 | 44% | +0.305 | +0.47 | 1.000 | WEAK |
| ADX>25 with DI | 4h | short | 4 | 12 | 50% | +0.217 | 21 | 62% | +0.150 | +0.44 | 1.000 | WEAK |
| Bollinger outside (breakout) | 1h | short | 12 | 65 | 49% | +0.497 | 72 | 49% | +0.311 | +0.41 | 1.000 | WEAK |
| Ichimoku cloud side | 1h | short | 4 | 375 | 51% | +0.056 | 446 | 50% | +0.043 | +0.41 | 1.000 | WEAK |
| Volume spike 1.5x, bar dir | 1h | short | 4 | 188 | 44% | +0.126 | 231 | 56% | +0.060 | +0.36 | 1.000 | WEAK |
| Donchian20 break (fade) | 4h | short | 1 | 13 | 54% | +0.101 | 27 | 59% | +0.046 | +0.31 | 1.000 | WEAK |
| MACD zero-line side | 1h | short | 4 | 422 | 50% | +0.081 | 499 | 48% | +0.024 | +0.24 | 1.000 | WEAK |
| MACD zero-line side | 4h | short | 12 | 33 | 58% | +0.105 | 50 | 60% | +0.111 | +0.23 | 1.000 | WEAK |
| Ichimoku cloud side | 4h | short | 12 | 28 | 61% | +0.521 | 47 | 47% | +0.085 | +0.17 | 1.000 | WEAK |
| Volume spike 1.5x, bar dir | 1h | short | 12 | 118 | 54% | +0.481 | 147 | 50% | +0.047 | +0.12 | 1.000 | WEAK |
| EMA20/50 cross | 1h | short | 4 | 29 | 55% | +0.039 | 37 | 51% | +0.023 | +0.12 | 1.000 | WEAK |
| ADX>25 with DI | 1h | short | 12 | 42 | 64% | +0.478 | 54 | 48% | +0.071 | +0.10 | 1.000 | WEAK |
| Donchian20 break (fade) | 4h | short | 4 | 12 | 58% | +0.268 | 23 | 57% | +0.001 | +0.00 | 1.000 | WEAK |
| Donchian20 break (follow) | 4h | short | 4 | 21 | 52% | -0.192 | 31 | 52% | +0.532 | +1.64 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 4h | short | 4 | 28 | 39% | -0.263 | 38 | 58% | +0.238 | +0.95 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | short | 1 | 12 | 33% | -0.496 | 24 | 67% | +0.148 | +0.92 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | long | 1 | 63 | 41% | -0.379 | 72 | 56% | +0.095 | +0.84 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | long | 4 | 173 | 48% | -0.225 | 226 | 53% | +0.113 | +0.75 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | long | 1 | 187 | 43% | -0.200 | 241 | 48% | +0.049 | +0.73 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 4h | short | 4 | 12 | 50% | -0.512 | 21 | 52% | +0.167 | +0.61 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 4h | long | 12 | 11 | 45% | -0.435 | 15 | 47% | +0.534 | +0.61 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 1h | long | 1 | 45 | 40% | -0.216 | 64 | 45% | +0.078 | +0.60 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 1h | short | 1 | 81 | 44% | -0.161 | 105 | 50% | +0.039 | +0.56 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | short | 1 | 33 | 39% | -0.025 | 49 | 53% | +0.048 | +0.44 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | long | 12 | 133 | 50% | -0.836 | 148 | 54% | +0.145 | +0.36 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 1h | long | 12 | 35 | 43% | -0.555 | 56 | 45% | +0.177 | +0.36 | 1.000 | DON'T TRUST |
| Daily VWAP side | 4h | short | 1 | 295 | 48% | -0.014 | 453 | 48% | +0.012 | +0.32 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | long | 1 | 132 | 38% | -0.162 | 170 | 41% | +0.021 | +0.31 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | long | 1 | 98 | 43% | -0.268 | 113 | 44% | +0.027 | +0.29 | 1.000 | DON'T TRUST |
| MACD zero-line side | 1h | long | 12 | 121 | 40% | -0.585 | 161 | 47% | +0.055 | +0.25 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | long | 4 | 94 | 44% | -0.357 | 122 | 46% | +0.066 | +0.24 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 1h | long | 12 | 55 | 38% | -0.650 | 72 | 49% | +0.089 | +0.22 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | long | 12 | 252 | 50% | -0.608 | 300 | 50% | +0.052 | +0.20 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 4h | long | 4 | 12 | 50% | -0.030 | 18 | 50% | +0.060 | +0.17 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 4h | short | 1 | 34 | 38% | -0.133 | 43 | 42% | +0.017 | +0.16 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 4h | short | 12 | 15 | 53% | -0.233 | 24 | 46% | +0.090 | +0.14 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | long | 12 | 116 | 46% | -0.308 | 153 | 50% | +0.027 | +0.08 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 1h | long | 1 | 94 | 44% | -0.262 | 117 | 50% | +0.006 | +0.05 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 1h | long | 4 | 55 | 42% | -0.028 | 92 | 41% | +0.012 | +0.05 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 4h | short | 12 | 7 | 57% | -0.087 | 17 | 53% | +0.017 | +0.03 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | long | 4 | 58 | 47% | -0.250 | 61 | 46% | -0.003 | -0.01 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 1h | long | 12 | 46 | 48% | -0.614 | 73 | 47% | -0.013 | -0.03 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 1h | long | 12 | 85 | 40% | -0.578 | 136 | 40% | -0.017 | -0.05 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 4h | short | 1 | 301 | 48% | +0.019 | 479 | 50% | -0.002 | -0.06 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | short | 12 | 85 | 69% | +0.889 | 117 | 50% | -0.018 | -0.06 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 1h | short | 1 | 29 | 48% | +0.199 | 37 | 38% | -0.019 | -0.09 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 1h | long | 12 | 28 | 46% | +0.061 | 35 | 31% | -0.048 | -0.09 | 1.000 | DON'T TRUST |
| Daily VWAP side | 4h | long | 4 | 98 | 44% | -0.184 | 163 | 47% | -0.013 | -0.11 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 1h | long | 4 | 41 | 51% | -0.467 | 62 | 40% | -0.030 | -0.12 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 1h | short | 4 | 498 | 51% | +0.140 | 578 | 48% | -0.011 | -0.13 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 4h | short | 4 | 4 | 75% | +0.187 | 8 | 38% | -0.105 | -0.14 | 1.000 | DON'T TRUST |
| MACD zero-line side | 4h | short | 1 | 340 | 48% | +0.028 | 547 | 48% | -0.005 | -0.15 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 4h | long | 4 | 12 | 42% | -0.309 | 23 | 43% | -0.058 | -0.15 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 4h | short | 1 | 12 | 75% | +0.313 | 21 | 57% | -0.035 | -0.17 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | long | 12 | 279 | 46% | -0.591 | 350 | 48% | -0.039 | -0.18 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 1h | long | 4 | 79 | 41% | -0.375 | 98 | 43% | -0.046 | -0.20 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 4h | long | 12 | 15 | 47% | +0.183 | 24 | 54% | -0.149 | -0.22 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 4h | long | 4 | 26 | 42% | -0.325 | 59 | 44% | -0.054 | -0.23 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 1h | short | 12 | 50 | 58% | +0.301 | 70 | 51% | -0.090 | -0.25 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 1h | short | 4 | 50 | 56% | +0.089 | 59 | 44% | -0.094 | -0.27 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 4h | short | 1 | 466 | 50% | +0.013 | 679 | 49% | -0.008 | -0.29 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 4h | short | 12 | 10 | 50% | +0.397 | 19 | 53% | -0.257 | -0.30 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | long | 4 | 90 | 46% | -0.323 | 97 | 41% | -0.102 | -0.30 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 1h | short | 4 | 90 | 53% | +0.201 | 97 | 51% | -0.103 | -0.30 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | long | 1 | 107 | 42% | -0.296 | 139 | 47% | -0.030 | -0.33 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | short | 4 | 12 | 50% | -0.013 | 18 | 50% | -0.118 | -0.33 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | short | 1 | 64 | 42% | -0.059 | 106 | 55% | -0.042 | -0.34 | 1.000 | DON'T TRUST |
| MACD zero-line side | 1h | long | 4 | 316 | 39% | -0.228 | 439 | 46% | -0.028 | -0.34 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | long | 4 | 118 | 32% | -0.433 | 151 | 45% | -0.050 | -0.42 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | short | 12 | 46 | 50% | +0.478 | 73 | 49% | -0.176 | -0.45 | 1.000 | DON'T TRUST |
| Daily VWAP side | 1h | long | 12 | 191 | 39% | -0.661 | 228 | 43% | -0.107 | -0.46 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 1h | long | 12 | 110 | 34% | -0.638 | 142 | 41% | -0.133 | -0.46 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 4h | short | 1 | 93 | 51% | -0.006 | 147 | 47% | -0.031 | -0.46 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | long | 1 | 41 | 39% | -0.192 | 56 | 39% | -0.048 | -0.49 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | short | 12 | 19 | 63% | +0.368 | 34 | 50% | -0.311 | -0.50 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | short | 4 | 29 | 59% | -0.060 | 45 | 49% | -0.118 | -0.50 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | long | 12 | 85 | 29% | -1.013 | 117 | 46% | -0.144 | -0.50 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 4h | long | 12 | 17 | 41% | -0.339 | 28 | 39% | -0.307 | -0.51 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | long | 12 | 11 | 64% | +1.402 | 13 | 54% | -0.485 | -0.53 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 4h | long | 12 | 10 | 40% | -0.741 | 23 | 35% | -0.346 | -0.53 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 4h | long | 4 | 55 | 42% | -0.185 | 81 | 43% | -0.093 | -0.54 | 1.000 | DON'T TRUST |
| Daily VWAP side | 1h | short | 4 | 490 | 49% | +0.035 | 596 | 47% | -0.047 | -0.54 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 4h | long | 12 | 11 | 27% | -1.604 | 12 | 42% | -0.531 | -0.55 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | long | 12 | 16 | 44% | -0.356 | 25 | 56% | -0.367 | -0.56 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 1h | long | 4 | 181 | 40% | -0.249 | 248 | 45% | -0.082 | -0.60 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 4h | long | 4 | 75 | 49% | -0.165 | 117 | 46% | -0.085 | -0.61 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | short | 1 | 7 | 57% | +0.035 | 8 | 25% | -0.162 | -0.62 | 1.000 | DON'T TRUST |
| MACD zero-line side | 4h | long | 12 | 22 | 36% | -0.451 | 35 | 46% | -0.324 | -0.63 | 1.000 | DON'T TRUST |
| MACD zero-line side | 4h | long | 4 | 58 | 38% | -0.161 | 95 | 36% | -0.094 | -0.65 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | short | 4 | 79 | 57% | +0.231 | 98 | 51% | -0.153 | -0.66 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | long | 12 | 65 | 51% | -0.623 | 72 | 47% | -0.503 | -0.66 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 1h | long | 4 | 238 | 44% | -0.244 | 365 | 43% | -0.069 | -0.66 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 4h | long | 12 | 9 | 44% | -0.096 | 17 | 47% | -0.601 | -0.67 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | short | 12 | 11 | 55% | +0.390 | 15 | 47% | -0.594 | -0.68 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | short | 12 | 55 | 60% | +0.516 | 72 | 47% | -0.283 | -0.69 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 4h | long | 1 | 13 | 46% | -0.143 | 27 | 41% | -0.103 | -0.70 | 1.000 | DON'T TRUST |
| Daily VWAP side | 4h | long | 12 | 42 | 43% | -0.790 | 68 | 50% | -0.244 | -0.71 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 4h | long | 1 | 90 | 32% | -0.125 | 220 | 46% | -0.039 | -0.72 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 4h | long | 12 | 22 | 41% | -0.479 | 37 | 43% | -0.411 | -0.72 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 4h | long | 1 | 34 | 59% | +0.091 | 43 | 49% | -0.077 | -0.73 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 4h | long | 4 | 12 | 42% | -0.332 | 14 | 29% | -0.287 | -0.74 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | short | 12 | 5 | 60% | +0.429 | 5 | 20% | -1.182 | -0.75 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | long | 12 | 25 | 48% | -0.745 | 39 | 49% | -0.418 | -0.76 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 4h | long | 12 | 21 | 43% | -0.521 | 31 | 45% | -0.383 | -0.76 | 1.000 | DON'T TRUST |
| Daily VWAP side | 4h | long | 1 | 261 | 40% | -0.114 | 446 | 42% | -0.027 | -0.77 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | short | 4 | 142 | 54% | +0.124 | 199 | 57% | -0.107 | -0.78 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | long | 12 | 42 | 43% | -0.691 | 48 | 48% | -0.585 | -0.78 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | long | 12 | 165 | 42% | -0.480 | 202 | 50% | -0.315 | -0.80 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | short | 12 | 22 | 50% | +1.030 | 30 | 47% | -0.428 | -0.80 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | long | 4 | 399 | 50% | -0.173 | 507 | 49% | -0.084 | -0.80 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | long | 4 | 259 | 37% | -0.339 | 329 | 46% | -0.128 | -0.82 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | short | 12 | 145 | 53% | +0.332 | 169 | 47% | -0.202 | -0.82 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 4h | long | 4 | 19 | 47% | -0.177 | 31 | 39% | -0.191 | -0.82 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | short | 12 | 82 | 51% | +0.222 | 110 | 45% | -0.309 | -0.85 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | long | 12 | 84 | 36% | -1.252 | 105 | 47% | -0.319 | -0.86 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 1h | short | 4 | 94 | 52% | +0.238 | 122 | 48% | -0.237 | -0.86 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | long | 12 | 213 | 44% | -0.802 | 263 | 39% | -0.299 | -0.87 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 4h | long | 4 | 38 | 39% | -0.296 | 64 | 42% | -0.205 | -0.88 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | short | 4 | 118 | 61% | +0.313 | 151 | 47% | -0.109 | -0.90 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | short | 12 | 213 | 54% | +0.447 | 263 | 55% | -0.312 | -0.91 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 1h | short | 4 | 55 | 53% | -0.114 | 92 | 55% | -0.213 | -0.91 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 4h | long | 1 | 200 | 38% | -0.088 | 300 | 45% | -0.039 | -0.93 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | long | 4 | 110 | 45% | -0.109 | 133 | 39% | -0.149 | -0.96 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | long | 12 | 144 | 38% | -0.651 | 177 | 44% | -0.243 | -1.00 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 1h | long | 4 | 282 | 42% | -0.227 | 371 | 47% | -0.097 | -1.05 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | long | 4 | 14 | 57% | +0.554 | 19 | 42% | -0.522 | -1.05 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | long | 12 | 63 | 44% | -0.840 | 81 | 49% | -0.695 | -1.05 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 1h | long | 1 | 29 | 62% | +0.138 | 38 | 45% | -0.108 | -1.06 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 4h | short | 12 | 4 | 100% | +1.475 | 8 | 38% | -1.655 | -1.08 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | short | 12 | 244 | 57% | +0.130 | 307 | 49% | -0.233 | -1.10 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 4h | short | 1 | 4 | 50% | +0.352 | 8 | 50% | -0.232 | -1.10 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | long | 1 | 97 | 39% | -0.190 | 130 | 42% | -0.101 | -1.12 | 1.000 | DON'T TRUST |
| MACD zero-line side | 4h | long | 1 | 216 | 38% | -0.062 | 352 | 45% | -0.042 | -1.13 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 1h | long | 12 | 120 | 42% | -0.751 | 153 | 47% | -0.297 | -1.13 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | long | 4 | 327 | 49% | -0.287 | 372 | 49% | -0.166 | -1.15 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 4h | long | 1 | 53 | 53% | +0.042 | 92 | 47% | -0.090 | -1.19 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 4h | long | 4 | 28 | 61% | +0.220 | 38 | 37% | -0.298 | -1.19 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | short | 4 | 28 | 57% | +0.585 | 43 | 44% | -0.485 | -1.21 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 1h | long | 12 | 60 | 48% | -0.325 | 75 | 37% | -0.511 | -1.24 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 4h | long | 1 | 12 | 67% | +0.453 | 24 | 33% | -0.204 | -1.27 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 1h | long | 1 | 64 | 44% | -0.080 | 106 | 36% | -0.160 | -1.28 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 4h | long | 1 | 93 | 45% | -0.081 | 147 | 39% | -0.071 | -1.32 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 4h | long | 12 | 20 | 55% | -0.261 | 25 | 44% | -0.725 | -1.33 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 4h | long | 1 | 19 | 53% | -0.126 | 31 | 29% | -0.196 | -1.33 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | short | 12 | 100 | 56% | +0.248 | 133 | 44% | -0.722 | -1.33 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 4h | long | 1 | 12 | 58% | +0.073 | 14 | 36% | -0.230 | -1.34 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | long | 12 | 248 | 46% | -0.453 | 322 | 41% | -0.312 | -1.34 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | short | 12 | 403 | 49% | +0.101 | 474 | 47% | -0.242 | -1.35 | 1.000 | DON'T TRUST |
| Daily VWAP side | 1h | long | 4 | 423 | 42% | -0.236 | 554 | 43% | -0.098 | -1.37 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 4h | long | 1 | 23 | 48% | -0.114 | 37 | 35% | -0.200 | -1.38 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | short | 12 | 688 | 51% | +0.118 | 813 | 44% | -0.197 | -1.39 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | short | 12 | 388 | 47% | +0.028 | 471 | 50% | -0.238 | -1.41 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | short | 12 | 568 | 49% | +0.057 | 656 | 47% | -0.227 | -1.43 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 1h | short | 1 | 51 | 45% | -0.165 | 59 | 39% | -0.153 | -1.43 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 4h | long | 12 | 36 | 50% | -0.699 | 58 | 43% | -0.572 | -1.44 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 1h | long | 4 | 29 | 48% | +0.163 | 37 | 38% | -0.418 | -1.45 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 1h | short | 1 | 107 | 51% | +0.177 | 139 | 42% | -0.135 | -1.47 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | short | 12 | 248 | 50% | +0.074 | 322 | 50% | -0.338 | -1.48 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | long | 1 | 15 | 53% | +0.195 | 20 | 45% | -0.367 | -1.49 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | long | 4 | 95 | 36% | -0.400 | 128 | 42% | -0.303 | -1.51 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | long | 12 | 500 | 43% | -0.391 | 625 | 44% | -0.226 | -1.52 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 4h | short | 1 | 12 | 50% | -0.155 | 23 | 35% | -0.137 | -1.53 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | long | 12 | 107 | 48% | +0.031 | 129 | 37% | -0.431 | -1.60 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | short | 4 | 235 | 50% | +0.004 | 287 | 44% | -0.186 | -1.65 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | long | 4 | 180 | 48% | -0.265 | 198 | 48% | -0.259 | -1.66 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | short | 4 | 501 | 46% | -0.071 | 602 | 47% | -0.178 | -1.67 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | long | 12 | 229 | 45% | -0.494 | 324 | 47% | -0.407 | -1.69 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | long | 1 | 110 | 39% | -0.187 | 135 | 35% | -0.163 | -1.73 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 1h | short | 1 | 94 | 46% | +0.119 | 117 | 44% | -0.202 | -1.75 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | short | 12 | 101 | 56% | +0.610 | 133 | 53% | -0.420 | -1.75 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | short | 12 | 622 | 50% | +0.198 | 746 | 45% | -0.258 | -1.76 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 4h | long | 1 | 14 | 57% | +0.237 | 32 | 44% | -0.184 | -1.78 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | long | 4 | 20 | 45% | -0.267 | 33 | 45% | -0.667 | -1.79 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 1h | short | 1 | 304 | 46% | +0.006 | 389 | 45% | -0.108 | -1.81 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 4h | long | 4 | 21 | 48% | +0.144 | 31 | 48% | -0.589 | -1.81 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | short | 12 | 465 | 54% | +0.126 | 569 | 50% | -0.359 | -1.83 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | short | 1 | 290 | 46% | +0.006 | 343 | 43% | -0.103 | -1.83 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | short | 12 | 636 | 48% | +0.149 | 740 | 45% | -0.258 | -1.84 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 1h | short | 1 | 29 | 48% | +0.263 | 46 | 33% | -0.422 | -1.84 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | long | 4 | 338 | 40% | -0.208 | 441 | 44% | -0.213 | -1.85 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | long | 12 | 472 | 42% | -0.376 | 603 | 43% | -0.357 | -1.85 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | short | 1 | 98 | 44% | +0.026 | 130 | 42% | -0.219 | -1.92 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | long | 12 | 400 | 43% | -0.632 | 474 | 44% | -0.435 | -1.92 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | long | 12 | 474 | 45% | -0.377 | 616 | 43% | -0.320 | -1.93 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 1h | short | 1 | 1367 | 45% | -0.021 | 1646 | 44% | -0.043 | -1.96 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | long | 12 | 388 | 45% | -0.377 | 471 | 43% | -0.339 | -2.00 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 1h | long | 1 | 274 | 47% | -0.067 | 374 | 42% | -0.121 | -2.07 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 4h | short | 4 | 6 | 67% | +0.400 | 7 | 29% | -1.499 | -2.11 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | short | 4 | 130 | 55% | -0.098 | 169 | 40% | -0.468 | -2.11 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 4h | long | 1 | 24 | 46% | -0.307 | 36 | 33% | -0.402 | -2.17 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 1h | short | 1 | 152 | 49% | +0.001 | 211 | 47% | -0.160 | -2.19 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | long | 12 | 347 | 45% | -0.291 | 419 | 43% | -0.438 | -2.20 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | short | 12 | 337 | 50% | +0.073 | 420 | 44% | -0.403 | -2.20 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 4h | long | 12 | 4 | 25% | -0.282 | 7 | 14% | -0.696 | -2.24 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | short | 12 | 106 | 42% | -0.369 | 127 | 46% | -0.727 | -2.28 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | short | 12 | 188 | 47% | +0.023 | 217 | 39% | -0.727 | -2.29 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | long | 4 | 237 | 42% | -0.201 | 288 | 43% | -0.218 | -2.30 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 1h | short | 4 | 95 | 43% | +0.002 | 128 | 43% | -0.505 | -2.37 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | long | 1 | 200 | 46% | -0.196 | 224 | 45% | -0.190 | -2.38 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | long | 12 | 532 | 42% | -0.366 | 675 | 41% | -0.387 | -2.45 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | short | 12 | 486 | 49% | +0.024 | 600 | 46% | -0.440 | -2.49 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 1h | short | 1 | 98 | 52% | +0.147 | 113 | 39% | -0.245 | -2.51 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | short | 4 | 206 | 48% | -0.084 | 239 | 38% | -0.489 | -2.53 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 1h | short | 1 | 132 | 47% | +0.041 | 170 | 43% | -0.176 | -2.58 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | short | 12 | 252 | 44% | +0.243 | 300 | 43% | -0.687 | -2.59 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 4h | long | 4 | 36 | 44% | -0.339 | 53 | 34% | -0.679 | -2.60 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | long | 12 | 508 | 45% | -0.628 | 605 | 45% | -0.439 | -2.60 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | short | 12 | 279 | 47% | +0.228 | 350 | 45% | -0.595 | -2.67 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 1h | long | 4 | 82 | 41% | -0.153 | 115 | 36% | -0.399 | -2.69 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | long | 12 | 632 | 43% | -0.336 | 783 | 40% | -0.394 | -2.72 | 1.000 | DON'T TRUST |
| MACD zero-line side | 1h | short | 1 | 1617 | 45% | -0.023 | 1903 | 43% | -0.060 | -2.83 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | long | 4 | 181 | 45% | -0.013 | 229 | 45% | -0.522 | -2.93 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | short | 4 | 344 | 47% | -0.141 | 434 | 44% | -0.282 | -2.95 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | short | 4 | 259 | 55% | -0.011 | 329 | 43% | -0.467 | -2.98 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | long | 4 | 532 | 45% | -0.200 | 644 | 41% | -0.280 | -3.00 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | long | 4 | 330 | 50% | -0.130 | 466 | 41% | -0.282 | -3.03 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | long | 1 | 296 | 38% | -0.224 | 374 | 39% | -0.211 | -3.15 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 1h | long | 1 | 291 | 40% | -0.106 | 343 | 40% | -0.145 | -3.16 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | short | 4 | 327 | 43% | -0.068 | 372 | 39% | -0.459 | -3.17 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | short | 4 | 532 | 46% | -0.146 | 644 | 45% | -0.299 | -3.26 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | long | 4 | 464 | 39% | -0.416 | 553 | 41% | -0.331 | -3.38 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | long | 4 | 753 | 44% | -0.327 | 905 | 46% | -0.269 | -3.42 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 1h | long | 1 | 89 | 45% | -0.054 | 124 | 38% | -0.236 | -3.45 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 1h | short | 1 | 1930 | 46% | -0.020 | 2229 | 43% | -0.064 | -3.46 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | short | 4 | 338 | 51% | -0.176 | 441 | 45% | -0.398 | -3.47 | 1.000 | DON'T TRUST |
| RSI14 <30 / >70 (revert) | 15m | short | 1 | 141 | 51% | -0.093 | 183 | 43% | -0.382 | -3.59 | 1.000 | DON'T TRUST |
| Bollinger outside (breakout) | 15m | short | 1 | 384 | 36% | -0.158 | 436 | 34% | -0.300 | -3.60 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | short | 4 | 667 | 49% | -0.122 | 828 | 45% | -0.298 | -3.61 | 1.000 | DON'T TRUST |
| Daily VWAP side | 1h | short | 1 | 1543 | 44% | -0.022 | 1888 | 42% | -0.076 | -3.62 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 1h | long | 1 | 894 | 43% | -0.095 | 1367 | 41% | -0.085 | -3.63 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 1h | long | 1 | 1006 | 42% | -0.106 | 1340 | 42% | -0.083 | -3.63 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | short | 1 | 111 | 33% | -0.062 | 134 | 37% | -0.339 | -3.70 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | long | 1 | 384 | 50% | -0.189 | 436 | 42% | -0.327 | -3.76 | 1.000 | DON'T TRUST |
| MACD zero-line side | 1h | long | 1 | 1207 | 42% | -0.102 | 1693 | 42% | -0.074 | -3.77 | 1.000 | DON'T TRUST |
| EMA20/50 cross | 15m | short | 4 | 110 | 47% | +0.003 | 133 | 35% | -0.618 | -4.10 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | long | 1 | 188 | 44% | -0.140 | 232 | 35% | -0.362 | -4.11 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | long | 4 | 500 | 44% | -0.172 | 608 | 39% | -0.390 | -4.12 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | short | 4 | 466 | 50% | +0.010 | 550 | 43% | -0.373 | -4.26 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | long | 4 | 740 | 41% | -0.278 | 958 | 41% | -0.333 | -4.30 | 1.000 | DON'T TRUST |
| ADX>25 with DI | 15m | short | 1 | 211 | 42% | -0.155 | 243 | 42% | -0.349 | -4.30 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | short | 4 | 1516 | 44% | -0.111 | 1713 | 43% | -0.254 | -4.59 | 1.000 | DON'T TRUST |
| Daily VWAP side | 1h | long | 1 | 1281 | 41% | -0.100 | 1708 | 40% | -0.094 | -4.72 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | short | 4 | 399 | 40% | -0.186 | 507 | 38% | -0.531 | -4.95 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | long | 1 | 468 | 47% | -0.160 | 607 | 43% | -0.260 | -5.14 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | short | 4 | 793 | 45% | -0.090 | 982 | 41% | -0.424 | -5.18 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | short | 4 | 1787 | 47% | -0.065 | 2119 | 42% | -0.257 | -5.18 | 1.000 | DON'T TRUST |
| Bollinger outside (revert) | 15m | short | 1 | 296 | 47% | -0.130 | 374 | 40% | -0.366 | -5.19 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | short | 4 | 1765 | 46% | -0.059 | 2081 | 42% | -0.278 | -5.25 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | short | 4 | 1722 | 44% | -0.106 | 2008 | 42% | -0.293 | -5.80 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | long | 4 | 1256 | 43% | -0.224 | 1613 | 40% | -0.359 | -6.00 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | long | 4 | 1363 | 43% | -0.225 | 1723 | 41% | -0.312 | -6.01 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | long | 1 | 409 | 38% | -0.175 | 526 | 35% | -0.303 | -6.04 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | short | 1 | 731 | 44% | -0.128 | 915 | 39% | -0.247 | -6.04 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | short | 1 | 581 | 40% | -0.111 | 701 | 40% | -0.274 | -6.07 | 1.000 | DON'T TRUST |
| Donchian20 break (fade) | 15m | short | 1 | 409 | 44% | -0.201 | 526 | 39% | -0.307 | -6.14 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | long | 1 | 353 | 43% | -0.191 | 495 | 37% | -0.318 | -6.37 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | short | 1 | 603 | 37% | -0.250 | 746 | 38% | -0.262 | -6.48 | 1.000 | DON'T TRUST |
| Stoch 14,3 cross <20 / >80 | 15m | short | 1 | 360 | 37% | -0.234 | 467 | 38% | -0.325 | -6.62 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | long | 4 | 1607 | 43% | -0.245 | 1981 | 40% | -0.347 | -6.74 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | long | 4 | 1403 | 42% | -0.246 | 1787 | 39% | -0.382 | -6.91 | 1.000 | DON'T TRUST |
| RSI2 <10 / >90 (revert) | 15m | long | 1 | 809 | 41% | -0.254 | 979 | 39% | -0.287 | -6.99 | 1.000 | DON'T TRUST |
| Daily VWAP cross | 15m | long | 1 | 581 | 39% | -0.181 | 701 | 34% | -0.353 | -7.15 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | long | 1 | 478 | 39% | -0.264 | 567 | 35% | -0.337 | -7.18 | 1.000 | DON'T TRUST |
| Donchian20 break (follow) | 15m | short | 1 | 468 | 38% | -0.195 | 607 | 35% | -0.355 | -7.32 | 1.000 | DON'T TRUST |
| Random entry (baseline) | 15m | long | 1 | 603 | 43% | -0.099 | 746 | 34% | -0.302 | -7.53 | 1.000 | DON'T TRUST |
| MACD signal-line cross | 15m | short | 1 | 478 | 45% | -0.059 | 566 | 37% | -0.352 | -7.99 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | long | 1 | 1049 | 36% | -0.239 | 1395 | 38% | -0.305 | -8.32 | 1.000 | DON'T TRUST |
| Volume spike 1.5x, bar dir | 15m | short | 1 | 1197 | 40% | -0.168 | 1431 | 36% | -0.336 | -8.97 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | short | 1 | 5567 | 40% | -0.163 | 6234 | 38% | -0.270 | -19.47 | 1.000 | DON'T TRUST |
| Ichimoku cloud side | 15m | long | 1 | 4597 | 39% | -0.177 | 5901 | 35% | -0.319 | -22.22 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | long | 1 | 5138 | 38% | -0.202 | 6489 | 35% | -0.294 | -22.46 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | short | 1 | 6555 | 39% | -0.168 | 7619 | 37% | -0.309 | -23.29 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | short | 1 | 6337 | 40% | -0.148 | 7484 | 37% | -0.306 | -23.41 | 1.000 | DON'T TRUST |
| Daily VWAP side | 15m | long | 1 | 5559 | 38% | -0.199 | 6900 | 35% | -0.314 | -23.44 | 1.000 | DON'T TRUST |
| Price side of EMA200 | 15m | short | 1 | 6758 | 41% | -0.147 | 7895 | 37% | -0.318 | -24.13 | 1.000 | DON'T TRUST |
| MACD zero-line side | 15m | long | 1 | 5341 | 38% | -0.198 | 6765 | 34% | -0.328 | -24.69 | 1.000 | DON'T TRUST |
