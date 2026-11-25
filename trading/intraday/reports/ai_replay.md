# AI replay test: does Opus's final decision add expectancy after costs? (PAPER research)

Window 2026-07-01 to 2026-11-21, after the model's knowledge cutoff. Setups come from the CURRENT live detector
(population 1078: {'momentum': 437, 'breakout': 434, 'vol_expansion': 138, 'mean_reversion': 69}). **32 selected** by fixed seed 20261125, stratified by
month x setup type, and written to `ai_replay_setups.json` before any model saw them. One isolated Opus subagent per setup
(read one brief file, no other tools), same final-decision prompt and the same 4 entry rules as live (re-checked in code).
No Sonnet screen. Brief: bars up to the setup only; headlines from the 3 days BEFORE the setup day (same-day news excluded,
because Google News dates are day-granular). **Calendar guard not replayed** (no historical calendar on the allowed hosts).
Exits simulated in code: fill at the next 1m open, 0.35 USD/oz each side, stop wins a tie, breakeven at +1R, flat 03:30 Bangkok.
(a) every selected setup, live default params (hinted direction, stop 1.5 x ATR5, target 2R). (b) only setups Opus entered, with
Opus's direction, stop and target. R = P&L / stop distance, after costs.

## Results
| Book | Trades | Win rate | Avg win R | Avg loss R | Expectancy R | PF |
|---|---|---|---|---|---|---|
| (a) unfiltered: every setup | 32 | 28% | +1.46 | -0.83 | **-0.187** | 0.69 |
| (b) Opus entries only | 0 | - | - | - | - | - |

- Difference in expectancy per trade, (b) − (a): **not defined: Opus entered no trade**, so (b) has no trades.
- Per setup OFFERED (skips count as 0 R; this is what the filter adds to the whole flow): (b) +0.000 R vs (a) -0.187 R,
  difference +0.187 R, 95% CI [-0.222, +0.573].
- Opus entered 0 of 32; 0 "enter" answers were blocked by the code's rule check.
- Tokens: **2,166,429** for 32 Opus calls (67,701 per call).

## Calibration: Opus's stated p (target before stop) vs what happened on its own plan
| bucket    |   n |   mean_p |   hit_rate |
|:----------|----:|---------:|-----------:|
| <0.40     |  21 |     0.38 |       0.24 |
| 0.40-0.55 |  11 |     0.43 |       0.27 |
| 0.55-0.65 |   0 |   nan    |     nan    |
| >=0.65    |   0 |   nan    |     nan    |

## Verdict (honest, with the uncertainty)
- **Opus entered 0 of 32 setups.** Its stated p_target was 0.25-0.45 on every one (mean 0.40), never near the 0.65 bar.
  Under the owner's rules, the AI desk in effect does not trade these setups.
- **Does the filter add more than the +0.13 R cost drag?** Per setup offered, "skip everything" (0 R) beats taking every
  setup (−0.19 R per trade in this sample) by +0.19 R, but the 95% bootstrap CI is [−0.22, +0.57]: it includes zero.
  The same +0.19 R comes from switching the desk off, so it is not evidence of skill in choosing trades. With 32 setups and
  0 entries, **this test cannot show that Opus selects good trades.** It only shows that Opus, under the 4 rules, declines all of them.
- **Opus's own plans**, if they had been executed (its stop and target, with code exits), average −0.01 R per setup, against
  −0.19 R for the default plan. Opus always kept the setup's direction, so the gap comes only from its stop and target choices
  (sometimes a 2 x ATR stop or a 1.5-1.7 R target). That is a hint, not a result (n = 32, wide CI).
- **Calibration:** Opus says about 0.40 that the target is hit first; the realised hit rate on its plans is 0.25. That is
  **overconfident by about 15 points** at the levels it used. There are no answers at 0.65 or above, so the 0.65 bar itself cannot be calibrated.
- **Sample noise:** in this sample, breakout setups averaged +0.69 R (n = 8) and vol_expansion −0.93 R (n = 8). The 9-month search
  shows breakout at −0.26 R over 353 OOS trades, so these 8-trade cell means are mostly noise.
- **Design notes:** the selection was frozen and committed before any model call (commit 7c77860). Allocation is uneven:
  8 setups per month for Jul-Sep and 4 for Oct-Nov, because the round-robin filled earlier months first. The "why" text in
  answers.jsonl is shortened; action, p and plan parameters are verbatim. The calendar guard is not replayed.
- **Implication:** with p >= 0.65 required for a >= 1.5 R after-cost target, the live AI desk will almost never trade these setups.
  The rule set makes the desk flat, not profitable. Two honest options: accept a desk that mostly stays flat, or lower the bar
  (for example p >= 0.45 with R:R >= 2, which still needs a positive edge) and measure it forward. That decision belongs to the owner.

## Every setup
| id                           | setup          | hint   |   R_a | exit_a     | action   |    p | opus_dir   |   stop_atr |   target_r |   R_opus_plan | exit_b     | entered   | rule_fail   | why                                                                                                |
|:-----------------------------|:---------------|:-------|------:|:-----------|:---------|-----:|:-----------|-----------:|-----------:|--------------:|:-----------|:----------|:------------|:---------------------------------------------------------------------------------------------------|
| 20260701-1830-breakout       | breakout       | long   | -1.05 | stop       | skip     | 0.38 | long       |       1.50 |       2.00 |         -1.05 | stop       | False     |             | Long breakout comes after a 40 USD run, very stretched (15m RSI 86, z 2.84); 1h/4h trend down      |
| 20260702-1915-vol_expansion  | vol_expansion  | short  | -1.06 | stop       | skip     | 0.38 | short      |       1.50 |       2.00 |         -1.06 | stop       | False     |             | 15m/1h range, price at VWAP and 4060 support; 5m chop gives no edge for a short                    |
| 20260716-0105-breakout       | breakout       | long   |  1.95 | target     | skip     | 0.45 | long       |       1.50 |       2.00 |          1.95 | target     | False     |             | Late breakout after a 30 USD run; 15m/1h range, 4h down, 4070 overhead                             |
| 20260717-0133-momentum       | momentum       | short  | -0.07 | breakeven  | skip     | 0.42 | short      |       1.50 |       2.00 |         -0.07 | breakeven  | False     |             | Short would chase a 5.6x ATR spike into the 3980 round number with 1h oversold                     |
| 20260717-2000-mean_reversion | mean_reversion | long   | -0.05 | breakeven  | skip     | 0.45 | long       |       2.00 |       2.00 |          1.97 | target     | False     |             | All TFs below EMAs, -DI dominant, lower lows; p about 0.45                                         |
| 20260721-1715-vol_expansion  | vol_expansion  | long   | -1.09 | stop       | skip     | 0.45 | long       |       1.50 |       2.00 |         -1.09 | stop       | False     |             | Trend up, but the 2R target runs into London open 4072.97 and the Asian high 4076.33; weak CMF/MFI |
| 20260723-1500-mean_reversion | mean_reversion | long   | -1.05 | stop       | skip     | 0.45 | long       |       1.50 |       2.00 |         -1.05 | stop       | False     |             | Strong downside momentum with no reversal bar; prior-day low still below                           |
| 20260725-0216-momentum       | momentum       | short  | -1.10 | stop       | skip     | 0.42 | short      |       1.50 |       2.00 |         -1.10 | stop       | False     |             | Short would chase a 4.4x-ATR flush into oversold readings; target just above prior-day-low support |
| 20260804-0020-vol_expansion  | vol_expansion  | long   | -1.14 | stop       | skip     | 0.38 | long       |       1.50 |       2.00 |         -1.14 | stop       | False     |             | Long breakout against 15m/1h downtrend, thin trigger volume, 4040 overhead                         |
| 20260811-1427-momentum       | momentum       | long   | -1.04 | stop       | skip     | 0.40 | long       |       1.50 |       2.00 |         -1.04 | stop       | False     |             | 15m trend down, 1h split, CPI this week; a 1m spike alone does not give p>=0.65                    |
| 20260814-1930-mean_reversion | mean_reversion | short  | -1.07 | stop       | skip     | 0.42 | short      |       2.00 |       2.00 |         -0.05 | breakeven  | False     |             | Would fade a strong 15m/4h uptrend with no rejection candle                                        |
| 20260819-2030-mean_reversion | mean_reversion | short  | -1.02 | stop       | skip     | 0.40 | short      |       2.00 |       1.50 |         -1.01 | stop       | False     |             | Counter-trend short into a strong 15m breakout (ADX 47)                                            |
| 20260826-2148-momentum       | momentum       | short  |  1.96 | target     | skip     | 0.38 | short      |       1.50 |       2.00 |          1.96 | target     | False     |             | Short chase after a 4.4x ATR flush into 4600 and the prior-day low; 4h up                          |
| 20260826-2205-breakout       | breakout       | short  | -0.04 | breakeven  | skip     | 0.38 | short      |       1.50 |       2.00 |         -0.04 | breakeven  | False     |             | Short breakout overextended, long lower wick near 4590; 4h up; prior-day headlines bullish         |
| 20260828-1720-vol_expansion  | vol_expansion  | short  | -1.10 | stop       | skip     | 0.40 | short      |       2.00 |       1.50 |          1.43 | target     | False     |             | Short against the 15m uptrend; above VWAP, spike low close                                         |
| 20260828-2050-breakout       | breakout       | long   |  1.95 | target     | skip     | 0.42 | long       |       1.50 |       2.00 |          1.95 | target     | False     |             | Breakout in a range regime into the Asian high and London open; weak 1h CMF/MFI                    |
| 20260901-1600-mean_reversion | mean_reversion | long   | -0.03 | breakeven  | skip     | 0.40 | long       |       2.00 |       1.50 |         -0.02 | breakeven  | False     |             | Fading a strong 15m/4h downtrend; yields and Fed-hike headlines                                    |
| 20260904-0300-vol_expansion  | vol_expansion  | short  |  0.64 | flat 03:30 | skip     | 0.38 | short      |       1.50 |       2.00 |          0.64 | flat 03:30 | False     |             | Short against a strong 1h uptrend; 15m oversold near VWAP and 4470                                 |
| 20260908-0300-vol_expansion  | vol_expansion  | short  | -1.52 | stop       | skip     | 0.25 | short      |       2.00 |       3.00 |         -1.39 | stop       | False     |             | ATR5 0.45: costs need a 3.76 USD target vs 1.34 stop; dead range                                   |
| 20260914-2010-breakout       | breakout       | short  | -1.03 | stop       | skip     | 0.40 | short      |       1.50 |       1.70 |         -1.03 | stop       | False     |             | Trend agrees but stretched; long lower wick rejected at 4265                                       |
| 20260917-0230-mean_reversion | mean_reversion | long   |  0.21 | flat 03:30 | skip     | 0.42 | long       |       1.50 |       1.60 |          0.21 | flat 03:30 | False     |             | Below all EMAs, hawkish Fed; under an hour before the 03:30 flat                                   |
| 20260918-1800-momentum       | momentum       | long   | -0.10 | breakeven  | skip     | 0.40 | long       |       1.50 |       2.00 |         -0.10 | breakeven  | False     |             | 15m range; spike into prior-day high and 4380; Fed-hike headlines                                  |
| 20260918-2330-breakout       | breakout       | long   |  1.95 | target     | skip     | 0.40 | long       |       1.50 |       2.00 |          1.95 | target     | False     |             | Extended breakout candle under prior-day high 4379; trend mixed                                    |
| 20260923-2154-momentum       | momentum       | long   | -1.03 | stop       | skip     | 0.38 | long       |       1.50 |       2.00 |         -1.03 | stop       | False     |             | 5.5x-ATR long spike against a 15m downtrend into 4300 and VWAP                                     |
| 20261005-2010-breakout       | breakout       | short  |  1.94 | target     | skip     | 0.40 | short      |       1.50 |       2.00 |          1.94 | target     | False     |             | 15m/1h range, 1h still up; target needs to pass the prior-day high and 4150; stretched             |
| 20261014-2015-mean_reversion | mean_reversion | long   |  0.58 | flat 03:30 | skip     | 0.38 | long       |       1.50 |       2.00 |          0.58 | flat 03:30 | False     |             | Counter-trend long into a strong 15m/1h downtrend in a volatility expansion                        |
| 20261015-1900-vol_expansion  | vol_expansion  | short  | -1.09 | stop       | skip     | 0.40 | short      |       1.50 |       2.00 |         -1.09 | stop       | False     |             | Chasing a stretched drop; 15m range, 1h mixed                                                      |
| 20261024-0038-momentum       | momentum       | short  | -1.10 | stop       | skip     | 0.42 | short      |       1.50 |       2.10 |         -1.10 | stop       | False     |             | Trend favours the short, but the target sits on 4000/Asian-low support; RSI2 5                     |
| 20261102-1815-breakout       | breakout       | long   | -0.17 | breakeven  | skip     | 0.38 | long       |       1.50 |       2.00 |         -0.17 | breakeven  | False     |             | Small breakout against the 1h/4h downtrend; resistance close above                                 |
| 20261104-1800-vol_expansion  | vol_expansion  | long   | -1.08 | stop       | skip     | 0.42 | long       |       1.50 |       2.00 |         -1.08 | stop       | False     |             | Trend agrees but very stretched; upper wick under 4048.6/4050                                      |
| 20261109-1500-mean_reversion | mean_reversion | long   |  1.93 | target     | skip     | 0.38 | long       |       2.00 |       2.00 |          1.95 | target     | False     |             | Clean 15m downtrend, no reversal bar; hawkish pre-day news                                         |
| 20261113-0203-momentum       | momentum       | short  | -1.07 | stop       | skip     | 0.38 | short      |       2.00 |       2.00 |         -1.05 | stop       | False     |             | Chase entry into a 5.1x ATR1 spike right above 3870 support                                        |
