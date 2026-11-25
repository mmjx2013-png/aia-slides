# PAPER intraday desk, setup 20261125-2217-momentum
Setup: momentum (short) at 2026-11-25 22:17 Bangkok, price 3432.91. 3-bar move -29.54 = 5.9x ATR1, vol 4.9x. Also firing: none
Indicators: ATR14 1m 6.283, 5m 9.556, 15m 17.896; 15m RSI 34.4, 15m z20 -1.56
Last 12 x 5m bars (Bangkok time, open high low close volume-PAXG):
21:15 3479.12 3480.16 3473.52 3476.98 12.9
21:20 3476.59 3476.67 3472.12 3475.00 42.7
21:25 3474.97 3478.24 3463.00 3467.12 118.4
21:30 3466.91 3469.68 3458.00 3462.06 48.9
21:35 3462.05 3467.41 3458.46 3459.51 34.5
21:40 3459.51 3461.26 3452.36 3453.88 69.5
21:45 3453.71 3464.16 3452.17 3458.39 35.6
21:50 3457.41 3462.19 3451.15 3461.23 65.2
21:55 3460.21 3470.51 3455.68 3469.37 28.3
22:00 3469.36 3469.36 3461.73 3468.53 59.9
22:05 3468.61 3470.17 3462.43 3463.36 46.8
22:10 3463.24 3464.40 3456.51 3459.46 42.1
## Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars)
| TF | Close vs EMA20 / 50 / 200 | ADX | Regime | ATR pct |
|---|---|---|---|---|
| 15m | EMA20 -0.91% EMA50 -1.53% EMA200 -2.78% | 45 | trend down | 100 |
| 1h | EMA20 -1.62% EMA50 -2.52% EMA200 -4.62% | 39 | trend down | 100 |
| 4h | EMA20 -2.41% EMA50 -4.15% EMA200 -9.54% | 28 | trend down | 84 |

## Key levels (price 3432.91; UTC sessions)
- Previous UTC day: high 3670.51, low 3542.78, close 3547.24
- Asian range 00-07 UTC: 3568.64 - 3510.34
- London open 07:00 UTC: 3513.46; NY open 13:30 UTC: 3504.29; session VWAP since 00:00 UTC: 3501.14
- Round numbers: 3430 / 3440 ($10), 3400 / 3450 ($50)

## Indicator library (trading/indicators.py; windows are in bars of that timeframe)
indicator,15m,1h
ret_1w,-0.00408,-0.0156
ret_1m,-0.0184,-0.0262
ret_3m,-0.029,-0.0306
dist_sma10,-0.00598,-0.011
dist_sma20,-0.0109,-0.0165
dist_sma50,-0.0164,-0.0323
dist_sma100,-0.0222,-0.0295
dist_sma200,-0.0352,-0.0441
dist_ema20,-0.00909,-0.0162
sma50_over_200,-0.0191,-0.0123
sma200_slope_20d,-0.00314,-0.00892
macd_pct,-0.00473,-0.00756
macd_hist_pct,-0.00119,-0.00111
adx14,44.9,39
plus_di,5.68,7.24
minus_di,34.9,34
ichi_tenkan_kijun,-0.0026,-0.0144
ichi_above_cloud,-0.0226,-0.0444
aroon_up,0,0
aroon_down,96,100
rsi2,34.7,19.6
rsi14,32.4,29.1
stoch_k,11.4,15.5
stoch_d,12.9,20.9
williams_r,-88.6,-84.5
cci20,-119,-211
roc10,-0.0163,-0.0209
vol20,0.0519,0.0714
vol60,0.0355,0.0664
atr14_pct,0.00408,0.00678
bb_pctb,0.11,-0.0672
bb_width,0.0279,0.0292
keltner_pos,-0.0621,-0.108
donchian20_pos,0.105,0.155
vol_ratio_20_120,2.14,0.87
obv_slope_20,-0.593,-0.381
cmf20,-0.299,-0.178
mfi14,23.5,32.7

## Calendar
- No USD High-impact event left this week
- Limitation: no intraday DXY or US yields available (allowed hosts only).

Book: equity 10080.23 USD, open position: none.
Risk engine (hard, in code): stop = 1.0-3.0 x ATR14(5m) = 9.56-28.67 USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
Second-screen proposal: {"action": "pass", "dir": "short", "stop_atr": 2.0, "target_r": 1.5, "risk_pct": 0.5, "why": "15m/1h/4h all trend down (ADX 45/39/28) with a 5.9x ATR1 volume-backed break; extended near 3430, so wide 2x ATR stop and a modest 1.5R target"}

## Headlines
[gold price] 78 headlines in the last 3 h
- 7 min ago: Gold price today slumps to fresh 52-week low after US GDP revised upwards - Invezz
- 10 min ago: Gold Sinks Below $3500 as Silver Crashes Thru' $40 - BullionVault
- 17 min ago: Gold drops below $3,500; prediction markets price moderate year-end targets (XAUUSD:CUR:Commodity) - Seeking Alpha
- 19 min ago: MQM-P seeks permission for Karachi rally, public meeting on November 29 - Aaj English TV
- 20 min ago: Nine dead, 18 trapped after illegal gold mine floods in Indonesia - Mining.com
- 26 min ago: Gold Drops Below $3,500 After Strong Q3 GDP and Contained Inflation Data - News and Statistics - IndexBox
- 27 min ago: Bitcoin Price Crash, Gold Silver Drop: What Next for Nvidia Stock? - Coin Gabbar
- 27 min ago: Gold Price Prediction as XAU/USD Hits a 15-Month Low of $3,500 After US PCE Inflation Data - Cryptonews.net
- 28 min ago: Gold Rate Today: Gold Falls to ₹1.21 Lakh on MCX, Silver Slides Sharply to One-Year Low - theopenpress.in
- 36 min ago: Gold Rate Today, November 25, 2026: 24K and 22K Gold Prices Fall, Silver Rates Also Under Pressure - theopenpress.in
[Fed OR Powell OR dollar OR Treasury yields] 45 headlines in the last 3 h
- 7 min ago: US PCE rises 3.8% in October: experts say Fed rate hike in December a done deal - Invezz
- 11 min ago: Treasury Yields Fall as Investors Seek Safety Amid Inflation - bsinews.id
- 18 min ago: Can Euro find traction as upbeat US economic data bolster hawkish Fed expectations? - www.tmgm.com
- 24 min ago: Ed Yardeni Wants Double the Fed Rate Hike the Market Expects - Yahoo Finance
- 26 min ago: Yields slide across the curve despite hotter core PCE print - TradingView
- 27 min ago: Euro struggles for traction as upbeat US economic data reinforce hawkish Fed outlook - FXStreet
- 32 min ago: Rising Inflation, Hot Economy Portend Another Fed Rate Hike - Newser
- 39 min ago: Gold, Silver Prices Today: Precious Metals Fall as Strong Dollar, US Fed Rate Concerns Weigh - The Indian Awaaz
- 50 min ago: What would a December Fed rate hike mean for my credit card, mortgage and savings? - Nacionale
- 50 min ago: AI Selloff Returns Despite Strong US Data — Stocks, Yields and Gold Slide Together - Action Forex
ROLE: senior decision-maker on a PAXG/USDT PAPER intraday desk (no real money). Every entry needs your
approval, and the desk must be very selective: most setups should be skipped. Expectancy after costs is the
goal, not win rate. Triage and the trader's proposal are shown above, together with the last 3 hours of
headlines (none published after the setup).
Enter ONLY if ALL hold, otherwise skip:
 (a) your probability that the target is hit before the stop is >= 0.65;
 (b) reward:risk >= 1.5 after costs: (target distance - 0.70) / (stop distance + 0.70) >= 1.5,
     where distances are in USD/oz and 0.70 = round-trip cost per oz (the code re-checks this);
 (c) the 15m and 1h trend agrees with the trade, OR you argue an explicit mean-reversion case;
 (d) the headlines show nothing high-impact against the trade.
Choose "leverage", an integer 1-10, with a one-line "lev_why". The code sizes the position as the SMALLER of (leverage x equity)
and the size that loses 1% of equity at your stop, so leverage can only reduce risk below 1%, never raise it. Anything
above 10 is clamped to 10 and logged.
State p_target on every answer, entered or skipped (it is logged for calibration).
Reply with ONLY this JSON, nothing else:
{"action": "enter" or "skip", "dir": "long" or "short", "stop_atr": 1.0-3.0, "target_r": 1.0-4.0,
 "risk_pct": 0.25-1.0, "p_target": 0.0-1.0, "trend_ok": true/false, "mean_reversion_case": "" or "argument",
 "news_clear": true/false, "leverage": 1-10, "lev_why": "one line", "why": "one line"}
