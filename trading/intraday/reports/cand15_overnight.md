# cand15: flat by 03:30 (A) vs hold overnight (B), code-only replay

Data: PAXG/USDT 1m, 2026-02-25 .. 2026-11-26 (394,444 1m bars). Signal (live rule, watcher.candidate): 15m Donchian-20 break with volume > 1.5x, FADED; entry at the next 1m open; stop 2.5 x ATR14(15m); ATR trailing stop at the same distance (ratchets on the best price so far); no target. Entries only 14:00-03:30 Bangkok and not at weekends (unchanged in both). Size: 1% risk at the stop, notional <= 3x. Costs: 0.25 half spread + 0.10 slippage per side. In B, exits/stops between 04:00 and 06:00 Bangkok (the daily break) pay 3x the half spread; each rollover held (22:00 UTC = 05:00 Bangkok) costs a swap per oz, triple on the Wednesday rollover. Two swap assumptions are run (see SWAPS). The calendar guard is OFF in both (no historical calendar on the allowed hosts), and the daily loss halt is not modelled: both are the same for A and B. 

| Variant | Trades | Win | Net P&L (10k start) | Return | Max DD | Avg hold (h) | Swap paid | Held past 03:30 |
|---|---|---|---|---|---|---|---|---|
| A: flat by 03:30 (live rule) | 437 | 41% | +1,116.52 | +11.2% | -15.3% | 2.5 | +0.00 | 0 |
| B: hold overnight, boss figure (long -6.00, short +2.00 per oz per night) | 413 | 38% | +1,736.86 | +17.4% | -20.9% | 4.0 | -756.97 | 66 |
| B: hold overnight, typical retail (long -0.60, short +0.20 per oz per night) | 413 | 39% | +2,638.89 | +26.4% | -18.4% | 4.0 | -78.36 | 66 |

## P&L from the extra hours alone (same entries; trades that A closed at 03:30)
| Swap assumption | Matched trades | A P&L on them | B P&L on them | Extra hours P&L | of which swap |
|---|---|---|---|---|---|
| boss figure (long -6.00, short +2.00 per oz per night) | 90 | +5,486.26 | +5,861.77 | +375.51 | -756.97 |
| typical retail (long -0.60, short +0.20 per oz per night) | 90 | +5,486.26 | +6,890.03 | +1,403.77 | -78.36 |

Bootstrap of the extra-hours P&L (5,000 resamples of the matched trades): boss figure: 90% interval [-1,161, +2,056], P(> 0) 63%, 31% of trades gained; typical retail: 90% interval [-103, +3,077], P(> 0) 93%, 39% of trades gained

Note: B also changes which later signals are taken (one position at a time), so the totals differ by more than the extra hours.
The boss's swap figure (-6 USD per 0.01 lot per night) is about 10x what retail brokers typically charge on XAUUSD (about -0.4 to
-0.8 USD per oz long); both are shown.
