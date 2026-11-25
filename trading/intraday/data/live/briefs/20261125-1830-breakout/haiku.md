# PAPER intraday desk, setup 20261125-1830-breakout
Setup: breakout (short) at 2026-11-25 18:30 Bangkok, price 3514.17. 5m close 3514.17 < 1h low 3519.03, vol 7.3x. Also firing: none
Indicators: ATR14 1m 1.666, 5m 3.248, 15m 7.533; 15m RSI 45.0, 15m z20 -1.49
Last 24 x 5m bars (Bangkok time, open high low close volume-PAXG):
16:30 3520.78 3523.37 3520.04 3523.10 7.8
16:35 3523.13 3525.78 3522.34 3522.83 8.7
16:40 3522.84 3523.38 3520.41 3522.91 3.5
16:45 3522.91 3523.71 3520.87 3523.71 6.7
16:50 3523.73 3523.80 3520.08 3522.53 3.6
16:55 3522.26 3524.92 3522.26 3524.34 3.3
17:00 3524.70 3530.61 3523.11 3530.61 6.9
17:05 3530.25 3531.78 3528.68 3531.29 4.8
17:10 3530.26 3530.68 3527.07 3528.82 1.7
17:15 3528.28 3530.08 3527.79 3530.08 2.4
17:20 3528.52 3528.98 3525.50 3525.68 2.4
17:25 3526.01 3526.17 3525.00 3525.82 0.4
17:30 3525.82 3528.97 3525.12 3526.37 5.9
17:35 3525.61 3526.43 3522.87 3524.98 3.4
17:40 3524.98 3528.08 3524.29 3524.34 19.4
17:45 3524.49 3526.87 3524.49 3525.31 5.1
17:50 3524.98 3526.17 3524.15 3526.17 2.1
17:55 3525.91 3527.74 3525.81 3527.74 1.4
18:00 3527.92 3527.92 3524.98 3524.99 2.7
18:05 3524.28 3524.91 3522.59 3523.50 1.0
18:10 3525.12 3525.12 3521.83 3522.87 3.7
18:15 3522.87 3524.98 3520.78 3521.74 5.9
18:20 3522.02 3522.53 3519.03 3519.52 7.0
18:25 3519.52 3519.52 3513.81 3514.17 32.6
Book: equity 10000.00 USD, open position: none.
Risk engine (hard, in code): stop = 1.0-3.0 x ATR14(5m) = 3.25-9.74 USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.

ROLE: triage analyst on a PAPER intraday gold desk (PAXG/USDT 1m, ~1:1 with spot gold). No real money.
A rule-based watcher flagged the setup above. Decide only whether it deserves a closer look by a senior
trader. Say no to setups in dead, choppy tape, setups that fight a strong 15m trend for no reason, or a
move that is already exhausted. Say yes when the setup is clean and fits the recent bars.
Reply with ONLY this JSON, nothing else:
{"look": true or false, "why": "one line"}
