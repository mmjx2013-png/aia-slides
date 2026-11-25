# PAPER intraday desk, setup 20260717-2000-mean_reversion
Setup: mean_reversion (long) at 2026-07-17 20:00 Bangkok, price 3965.97. 15m RSI 16, z -2.9. Also firing: none
Indicators: ATR14 1m 2.201, 5m 5.065, 15m 5.724; 15m RSI 16.3, 15m z20 -2.92
Last 12 x 5m bars (Bangkok time, open high low close volume-PAXG):
19:00 3992.40 3993.71 3988.48 3988.48 6.5
19:05 3988.48 3989.50 3986.89 3988.65 10.1
19:10 3990.19 3991.85 3988.53 3988.54 1.4
19:15 3987.98 3989.41 3987.18 3989.41 7.0
19:20 3989.81 3989.81 3983.31 3983.97 8.0
19:25 3983.73 3985.52 3983.30 3985.52 2.1
19:30 3985.52 3985.52 3980.19 3980.54 2.9
19:35 3980.19 3981.18 3977.49 3977.50 3.5
19:40 3977.50 3977.50 3965.54 3969.32 62.2
19:45 3969.04 3972.37 3965.70 3966.83 13.1
19:50 3966.83 3970.61 3964.71 3968.93 4.2
19:55 3968.91 3971.58 3965.39 3965.97 24.0
## Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars)
| TF | Close vs EMA20 / 50 / 200 | ADX | Regime | ATR pct |
|---|---|---|---|---|
| 15m | EMA20 -0.53% EMA50 -0.58% EMA200 -1.01% | 19 | range | 36 |
| 1h | EMA20 -0.61% EMA50 -1.00% EMA200 -2.07% | 17 | range | 37 |
| 4h | EMA20 -0.68% EMA50 -1.43% EMA200 -3.46% | 22 | range | 46 |

## Key levels (price 3965.97; UTC sessions)
- Previous UTC day: high 4054.03, low 3970.73, close 3986.13
- Asian range 00-07 UTC: 4006.49 - 3972.00
- London open 07:00 UTC: 3997.09; NY open 13:30 UTC: not yet; session VWAP since 00:00 UTC: 3988.24
- Round numbers: 3960 / 3970 ($10), 3950 / 4000 ($50)

## Indicator library (trading/indicators.py; windows are in bars of that timeframe)
indicator,15m,1h
ret_1w,-0.00613,-0.00651
ret_1m,-0.00757,-0.00994
ret_3m,-0.00274,-0.0211
dist_sma10,-0.00503,-0.00555
dist_sma20,-0.00606,-0.00477
dist_sma50,-0.0058,-0.0119
dist_sma100,-0.00563,-0.014
dist_sma200,-0.0119,-0.0236
dist_ema20,-0.00532,-0.00611
sma50_over_200,-0.00617,-0.0119
sma200_slope_20d,-0.000855,-0.00191
macd_pct,-0.000909,-0.00175
macd_hist_pct,-0.000775,0.000246
adx14,18.5,16.8
plus_di,12.9,18.5
minus_di,34.4,28
ichi_tenkan_kijun,-0.000969,-0.00422
ichi_above_cloud,-0.00589,-0.0218
aroon_up,0,0
aroon_down,100,100
rsi2,1.4,7.77
rsi14,26.5,35.9
stoch_k,3.79,3.02
stoch_d,9.35,37.1
williams_r,-96.2,-97
cci20,-333,-123
roc10,-0.00718,-0.00308
vol20,0.0171,0.0356
vol60,0.0192,0.0421
atr14_pct,0.00163,0.00359
bb_pctb,-0.23,-0.116
bb_width,0.0083,0.00774
keltner_pos,-0.323,0.0721
donchian20_pos,0.0357,0.0302
vol_ratio_20_120,0.518,0.979
obv_slope_20,-0.347,-0.269
cmf20,-0.222,-0.133
mfi14,16.1,40.5

## Calendar
- Not available in this replay (no historical calendar on the allowed hosts).
- Limitation: no intraday DXY or US yields available (allowed hosts only).

Book: equity 10000.00 USD, open position: none.
Risk engine (hard, in code): stop = 1.0-3.0 x ATR14(5m) = 5.07-15.20 USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
Second screen: skipped in this replay test (Opus decides directly).

## Headlines
[gold price] 5 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-07-16: Will gold prices extend their record-breaking run? - DW.com
- 2026-07-16: Predictive Discovery takes 12.3% stake in Awalé in $14.4 million placement - Mining.com.au
- 2026-07-16: Gold prices can go lower, but Bank of America suggests buying the dip and averaging down - Kitco
- 2026-07-16: 'This charade…': Democrats walk out after clash with GOP Senators at explosive ICE hearing - The Economic Times
- 2026-07-14: Gold Price on 14 July 2026 - Gold Price
[Fed OR dollar OR Treasury yields] 3 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-07-16: Treasury yields rise amid mounting U.S.-Iran tensions - CNBC
- 2026-07-15: Treasury yields fall as traders react to encouraging inflation data - CNBC
- 2026-07-14: Treasury yields slide after June CPI slows much more than expected - CNBC
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
