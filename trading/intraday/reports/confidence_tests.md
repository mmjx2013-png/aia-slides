# Confidence tests (code only, no LLM calls)

## 1. Opus calibration (best_idea of every swing-desk decision, resolved on 1m bars, 72 h limit)
Decisions with a best_idea: 7 (live since 2026-11-26).
| p bucket | n resolved | stated p | realised target-first rate | avg R if taken | open (unresolved) |
|---|---|---|---|---|---|
| < 0.35 | 0 | - | - | - | 0 |
| 0.35-0.45 | 0 | 0.40 | nan | +nan | 7 |
| 0.45-0.55 | 0 | - | - | - | 0 |
| > 0.55 | 0 | - | - | - | 0 |

Earlier evidence (intraday AI replay, reports/ai_replay.md): 32 setups, Opus's stated p 0.25-0.45 (mean 0.40) against a realised
target-first rate of 0.25: overconfident by about 0.15.

## 2. cand15 selectivity (live rule B, typical swap; 10 pre-registered single-filter subsets)
In-sample 2026-02-25 .. 2026-07-31 (248 trades); out of sample 2026-08-03 .. 2026-11-25 (165 trades).

| Subset | IS trades | IS win | IS avg R | IS /month | IS Kelly | OOS trades | OOS win | OOS avg R | OOS /month | OOS Kelly |
|---|---|---|---|---|---|---|---|---|---|---|
| all trades | 248 | 37% | -0.008 | 48.3 | -0.010 | 165 | 42% | +0.172 | 44.0 | +0.141 |
| trend = agrees | 35 | 37% | -0.003 | 6.8 | -0.003 | 25 | 56% | +0.274 | 6.7 | +0.277 |
| trend = disagrees | 213 | 37% | -0.009 | 41.5 | -0.011 | 140 | 40% | +0.154 | 37.3 | +0.121 |
| adx = 20-30 | 115 | 41% | +0.043 | 22.4 | +0.051 | 75 | 48% | +0.175 | 20.0 | +0.183 |
| adx = <20 | 60 | 27% | -0.208 | 11.7 | -0.359 | 38 | 47% | +0.350 | 10.1 | +0.236 |
| adx = >30 | 73 | 40% | +0.076 | 14.2 | +0.081 | 52 | 31% | +0.038 | 13.9 | +0.025 |
| session = 00-03:30 | 26 | 31% | +0.037 | 5.1 | +0.033 | 19 | 47% | +0.503 | 5.1 | +0.283 |
| session = 14-20 | 122 | 31% | -0.094 | 23.8 | -0.113 | 78 | 38% | +0.118 | 20.8 | +0.097 |
| session = 20-24 | 100 | 46% | +0.085 | 19.5 | +0.111 | 68 | 46% | +0.142 | 18.1 | +0.133 |
| atr = above median | 200 | 38% | +0.013 | 39.0 | +0.016 | 151 | 40% | +0.152 | 40.3 | +0.120 |
| atr = below median | 48 | 31% | -0.098 | 9.4 | -0.115 | 14 | 64% | +0.394 | 3.7 | +0.425 |

Chosen in-sample (best avg R with >= 30 trades): **session = 20-24**. Out of sample: 68 trades, avg R +0.142 vs all +0.172; lead -0.030, bootstrap 90% band [-0.297, +0.236] -> **does not pass**.
R here = trade P&L / 1% of the 10k start (the replay's risk unit); Kelly = win - (1 - win) / (avg win R / avg loss R).
