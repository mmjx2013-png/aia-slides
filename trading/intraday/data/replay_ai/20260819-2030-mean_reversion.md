# PAPER intraday desk, setup 20260819-2030-mean_reversion
Setup: mean_reversion (short) at 2026-08-19 20:30 Bangkok, price 4450.3. 15m RSI 91, z 2.4. Also firing: none
Indicators: ATR14 1m 3.715, 5m 12.449, 15m 11.932; 15m RSI 91.2, 15m z20 2.38
Last 12 x 5m bars (Bangkok time, open high low close volume-PAXG):
19:30 4367.56 4381.35 4367.19 4380.97 55.5
19:35 4380.96 4410.00 4379.93 4408.34 107.5
19:40 4407.61 4413.68 4401.20 4411.65 59.2
19:45 4411.95 4416.25 4406.39 4411.98 43.9
19:50 4411.97 4420.96 4406.44 4420.96 54.2
19:55 4420.99 4432.99 4418.16 4430.04 126.9
20:00 4429.77 4433.00 4419.63 4420.31 116.6
20:05 4420.06 4433.33 4417.94 4433.07 84.6
20:10 4433.07 4452.91 4433.07 4447.24 251.0
20:15 4446.79 4455.00 4446.79 4452.37 80.9
20:20 4452.48 4455.15 4447.42 4452.24 84.6
20:25 4452.23 4454.41 4448.84 4450.30 46.0
## Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars)
| TF | Close vs EMA20 / 50 / 200 | ADX | Regime | ATR pct |
|---|---|---|---|---|
| 15m | EMA20 +1.47% EMA50 +1.87% EMA200 +1.78% | 47 | trend up | 96 |
| 1h | EMA20 +1.50% EMA50 +1.33% EMA200 +1.53% | 30 | trend down | 98 |
| 4h | EMA20 -0.27% EMA50 -0.01% EMA200 +2.85% | 25 | range | 52 |

## Key levels (price 4450.30; UTC sessions)
- Previous UTC day: high 4430.88, low 4330.85, close 4336.39
- Asian range 00-07 UTC: 4360.71 - 4326.38
- London open 07:00 UTC: 4347.59; NY open 13:30 UTC: not yet; session VWAP since 00:00 UTC: 4382.44
- Round numbers: 4450 / 4460 ($10), 4450 / 4500 ($50)

## Indicator library (trading/indicators.py; windows are in bars of that timeframe)
indicator,15m,1h
ret_1w,0.0192,0.0174
ret_1m,0.0209,0.0141
ret_3m,0.0236,0.0126
dist_sma10,0.0129,0.0158
dist_sma20,0.0168,0.0176
dist_sma50,0.0206,0.0113
dist_sma100,0.0209,0.0112
dist_sma200,0.0159,0.0114
dist_ema20,0.0147,0.015
sma50_over_200,-0.00462,0.000111
sma200_slope_20d,-0.000496,-0.000371
macd_pct,0.00448,0.000249
macd_hist_pct,0.00209,0.00183
adx14,47,29.7
plus_di,55.7,41.4
minus_di,4.07,14.2
ichi_tenkan_kijun,0.00157,0.00102
ichi_above_cloud,0.0244,0.00693
aroon_up,100,100
aroon_down,0,56
rsi2,99.7,98.3
rsi14,88.6,74.6
stoch_k,95,97.2
stoch_d,95.1,91.5
williams_r,-4.99,-2.77
cci20,240,354
roc10,0.0195,0.0176
vol20,0.0412,0.061
vol60,0.0272,0.0437
atr14_pct,0.00254,0.00372
bb_pctb,1.09,1.44
bb_width,0.0282,0.0186
keltner_pos,1.93,1.49
donchian20_pos,0.953,0.972
vol_ratio_20_120,1.74,1.78
obv_slope_20,0.861,0.286
cmf20,0.531,0.0652
mfi14,96.5,85.9

## Calendar
- Not available in this replay (no historical calendar on the allowed hosts).
- Limitation: no intraday DXY or US yields available (allowed hosts only).

Book: equity 10000.00 USD, open position: none.
Risk engine (hard, in code): stop = 1.0-3.0 x ATR14(5m) = 12.45-37.35 USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
Second screen: skipped in this replay test (Opus decides directly).

## Headlines
[gold price] 61 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-08-18: Wells Fargo revamps gold price target for the rest of 2026 - TheStreet
- 2026-08-18: Wells Fargo reiterates positive outlook for precious metals, still sees gold at $4,900 in 2026 - Kitco
- 2026-08-18: The Market Is Betting on the Wrong Jackson Hole Signal. - GoldSilver
- 2026-08-18: Morgan Stanley: Gold prices have moved quicker than we expected - CNBC
- 2026-08-18: Local Gold Prices Drop to JD89.50 per Gram... - Jordan News
- 2026-08-18: Gold, silver slide as AI selloff, Hormuz risk lift rate concerns - Kitco PM Report - Kitco
- 2026-08-18: Gold retreats as bond yields surge to highest levels in decades - Reuters
- 2026-08-18: Gold prices today, Tuesday, August 18, 2026: Gold falters as U.S. Treasury yields rise - Yahoo Finance
[Fed OR dollar OR Treasury yields] 7 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-08-18: Why Treasury Yields Are Surging—and What It Means for Your Money - Investopedia
- 2026-08-18: U.S. government debt yields are surging at a bad time. Here's what's behind the move - CNBC
- 2026-08-18: The 30-year Treasury yield just hit a 19-year high. Three things could drive it even higher - CNBC
- 2026-08-18: Bond yields are climbing. Here’s what that means for mortgages and other consumer borrowing - CNBC
- 2026-08-18: 30-year Treasury yield tops 5.33%, new 19-year high, on inflation and spending concerns - CNBC
- 2026-08-17: What rising Treasury yields are telling us - Axios
- 2026-08-17: 30-year Treasury yield tops 5.31%, the highest in 19 years - CNBC
ROLE: senior decision-maker on a PAXG/USDT PAPER intraday desk (no real money). Every entry needs your
approval, and the desk must be very selective: most setups should be skipped. Expectancy after costs is the
goal, not win rate. Triage and the trader's proposal are shown above, together with headlines from the days before the setup day.
Enter ONLY if ALL hold, otherwise skip:
 (a) your probability that the target is hit before the stop is >= 0.65;
 (b) reward:risk >= 1.5 after costs: (target distance - 0.70) / (stop distance + 0.70) >= 1.5,
     where distances are in USD/oz and 0.70 = round-trip cost per oz (the code re-checks this);
 (c) the 15m and 1h trend agrees with the trade, OR you argue an explicit mean-reversion case;
 (d) the headlines show nothing high-impact against the trade.
State p_target on every answer, entered or skipped (it is logged for calibration).
Reply with ONLY this JSON, nothing else:
{"action": "enter" or "skip", "dir": "long" or "short", "stop_atr": 1.0-3.0, "target_r": 1.0-4.0,
 "risk_pct": 0.25-1.0, "p_target": 0.0-1.0, "trend_ok": true/false, "mean_reversion_case": "" or "argument",
 "news_clear": true/false, "why": "one line"}
