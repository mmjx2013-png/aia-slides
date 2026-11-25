# PAPER intraday desk, setup 20260723-1500-mean_reversion
Setup: mean_reversion (long) at 2026-07-23 15:00 Bangkok, price 4090.14. 15m RSI 15, z -2.4. Also firing: none
Indicators: ATR14 1m 1.826, 5m 4.559, 15m 6.632; 15m RSI 14.8, 15m z20 -2.4
Last 12 x 5m bars (Bangkok time, open high low close volume-PAXG):
14:00 4113.85 4114.16 4109.92 4109.92 7.2
14:05 4110.08 4110.86 4105.62 4105.62 6.5
14:10 4105.63 4105.63 4098.05 4101.56 30.2
14:15 4101.57 4106.14 4101.57 4103.43 10.5
14:20 4103.43 4103.73 4101.05 4101.05 11.2
14:25 4100.75 4104.55 4100.75 4102.74 26.4
14:30 4102.74 4102.74 4096.96 4100.23 68.9
14:35 4100.04 4100.04 4094.69 4095.52 12.7
14:40 4095.53 4096.15 4087.07 4090.60 13.7
14:45 4090.44 4091.22 4087.02 4087.78 7.8
14:50 4088.57 4090.33 4086.67 4088.97 50.1
14:55 4088.97 4091.64 4087.99 4090.14 11.0
## Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars)
| TF | Close vs EMA20 / 50 / 200 | ADX | Regime | ATR pct |
|---|---|---|---|---|
| 15m | EMA20 -0.50% EMA50 -0.65% EMA200 -0.20% | 25 | range | 70 |
| 1h | EMA20 -0.62% EMA50 -0.19% EMA200 +0.81% | 29 | trend up | 72 |
| 4h | EMA20 +0.23% EMA50 +0.79% EMA200 -0.47% | 39 | trend up | 83 |

## Key levels (price 4090.14; UTC sessions)
- Previous UTC day: high 4157.63, low 4071.38, close 4127.00
- Asian range 00-07 UTC: 4134.03 - 4107.10
- London open 07:00 UTC: 4113.85; NY open 13:30 UTC: not yet; session VWAP since 00:00 UTC: 4114.05
- Round numbers: 4090 / 4100 ($10), 4050 / 4100 ($50)

## Indicator library (trading/indicators.py; windows are in bars of that timeframe)
indicator,15m,1h
ret_1w,-0.00616,-0.00778
ret_1m,-0.00632,-0.00479
ret_3m,-0.0135,0.0208
dist_sma10,-0.00448,-0.00624
dist_sma20,-0.0059,-0.00831
dist_sma50,-0.00704,-0.00239
dist_sma100,-0.0077,0.00846
dist_sma200,-0.00251,0.0137
dist_ema20,-0.00505,-0.00621
sma50_over_200,0.00456,0.0161
sma200_slope_20d,0.00189,0.00203
macd_pct,-0.00155,0.00041
macd_hist_pct,-0.000708,-0.00129
adx14,24.9,29.3
plus_di,10,13.7
minus_di,40.9,31.9
ichi_tenkan_kijun,-0.00103,-0.00288
ichi_above_cloud,-0.00952,-0.000908
aroon_up,0,36
aroon_down,100,100
rsi2,3.55,3.27
rsi14,25.7,39.1
stoch_k,9.24,7.13
stoch_d,12.2,21.7
williams_r,-90.8,-92.9
cci20,-245,-196
roc10,-0.00692,-0.00896
vol20,0.017,0.0517
vol60,0.0171,0.0405
atr14_pct,0.00163,0.00338
bb_pctb,-0.099,-0.0848
bb_width,0.00985,0.0142
keltner_pos,-0.28,0.0375
donchian20_pos,0.0865,0.0489
vol_ratio_20_120,0.616,1.6
obv_slope_20,-0.478,-0.398
cmf20,-0.153,-0.149
mfi14,7.88,19.3

## Calendar
- Not available in this replay (no historical calendar on the allowed hosts).
- Limitation: no intraday DXY or US yields available (allowed hosts only).

Book: equity 10000.00 USD, open position: none.
Risk engine (hard, in code): stop = 1.0-3.0 x ATR14(5m) = 4.56-13.68 USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
Second screen: skipped in this replay test (Opus decides directly).

## Headlines
[gold price] 73 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-07-22: What is going on with gold? - BlackRock
- 2026-07-22: Thai gold prices surge 1,100 baht after 27 revisions in volatile trading - Nation Thailand
- 2026-07-22: Rising economic fears weakening inflation’s stranglehold on gold prices - CRU - Kitco
- 2026-07-22: John Paulson says we are in the early stages of a long-term bull market for gold - CNBC
- 2026-07-22: How to start investing in gold - MoneyWeek
- 2026-07-22: Gold’s long-term investment case is strong, and miners offer greatest upside - VanEck’s Casanova - Kitco
- 2026-07-22: Gold waits for no one - Kitco
- 2026-07-22: Gold rallies above $4,120 as buyers test resistance - Kitco AM Report - Kitco
[Fed OR dollar OR Treasury yields] 5 headlines from the 3 days BEFORE the setup day (no same-day news)
- 2026-07-22: U.S. 10-year Treasury yield rises as traders reassess Fed rate hike bets - CNBC
- 2026-07-22: 30-year Treasury yields stick above 5% - Marketplace.org
- 2026-07-21: Treasury yields edge higher as investors map geopolitical risks - CNBC
- 2026-07-21: The 10-year Treasury Yield Eclipsed 4.6%-2026-07-21 - Committee for a Responsible Federal Budget
- 2026-07-20: U.S. Treasury yields rise as Wall Street monitors Middle East tensions - CNBC
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
