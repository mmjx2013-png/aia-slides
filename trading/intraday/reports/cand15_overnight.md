# cand15: flat by 03:30 (A) vs hold overnight (B), code-only replay

Data: PAXG/USDT 1m, 2026-02-25 .. 2026-11-26 (394,444 1m bars). Signal (live rule, watcher.candidate): 15m Donchian-20 break with volume > 1.5x, FADED; entry at the next 1m open; stop 2.5 x ATR14(15m); ATR trailing stop at the same distance (ratchets on the best price so far); no target. Entries only 14:00-03:30 Bangkok and not at weekends (unchanged in both). Size: 1% risk at the stop, notional <= 3x. Costs: 0.25 half spread + 0.10 slippage per side. In B, exits/stops between 04:00 and 06:00 Bangkok (the daily break) pay 3x the half spread; each rollover held (22:00 UTC = 05:00 Bangkok) costs a swap per oz, triple on the Wednesday rollover. Two swap assumptions are run (see SWAPS). The calendar guard is OFF in both (no historical calendar on the allowed hosts), and the daily loss halt is not modelled: both are the same for A and B. 

| Variant | Trades | Win | Net P&L (10k start) | Return | Max DD | Avg hold (h) | Swap paid | Held past 03:30 |
|---|---|---|---|---|---|---|---|---|
| A: flat by 03:30 (live rule) | 437 | 41% | +1,116.52 | +11.2% | -15.3% | 2.5 | +0.00 | 0 |
| B: hold overnight, flat before the weekend; boss figure swap | 413 | 38% | +1,736.86 | +17.4% | -20.9% | 4.0 | -756.97 | 66 |
| B: hold overnight, flat before the weekend; typical retail swap | 413 | 39% | +2,638.89 | +26.4% | -18.4% | 4.0 | -78.36 | 66 |
| C: no clock rules (weekend gap at the Monday open); boss figure swap | 405 | 38% | +1,553.15 | +15.5% | -20.0% | 7.3 | -807.22 | 88 |
| C: no clock rules (weekend gap at the Monday open); typical retail swap | 405 | 39% | +2,477.57 | +24.8% | -17.5% | 7.3 | -83.70 | 88 |
| D: keep at 03:30 only if >= 0.5R and the 1h trend agrees (stop to breakeven), flat before the weekend; boss figure swap | 435 | 40% | +344.89 | +3.4% | -15.7% | 2.7 | -521.97 | 14 |
| D: keep at 03:30 only if >= 0.5R and the 1h trend agrees (stop to breakeven), flat before the weekend; typical retail swap | 435 | 40% | +858.18 | +8.6% | -14.2% | 2.7 | -53.36 | 14 |

## P&L from the extra hours alone (same entries; trades that A closed at 03:30)
| Swap assumption | Matched trades | A P&L on them | B P&L on them | Extra hours P&L | of which swap |
|---|---|---|---|---|---|
| boss figure (long -6.00, short +2.00 per oz per night) | 90 | +5,486.26 | +5,861.77 | +375.51 | -756.97 |
| typical retail (long -0.60, short +0.20 per oz per night) | 90 | +5,486.26 | +6,890.03 | +1,403.77 | -78.36 |

Bootstrap of the extra-hours P&L (5,000 resamples of the matched trades): boss figure: 90% interval [-1,161, +2,056], P(> 0) 63%, 31% of trades gained; typical retail: 90% interval [-103, +3,077], P(> 0) 93%, 39% of trades gained

## Pre-agreed decision rule (highest net P&L; max DD no more than 25% deeper than A's; >= 30 trades)
- boss figure (long -6.00, short +2.00 per oz per night): winner **A**; A +1,117 (DD -15.3%, n 437), B +1,737 (DD -20.9%, n 413), C +1,553 (DD -20.0%, n 405), D +345 (DD -15.7%, n 435); failed the DD/trades test: B, C
- typical retail (long -0.60, short +0.20 per oz per night): winner **B**; A +1,117 (DD -15.3%, n 437), B +2,639 (DD -18.4%, n 413), C +2,478 (DD -17.5%, n 405), D +858 (DD -14.2%, n 435)

Note: B also changes which later signals are taken (one position at a time), so the totals differ by more than the extra hours.
The boss's swap figure (-6 USD per 0.01 lot per night) is about 10x what retail brokers typically charge on XAUUSD (about -0.4 to
-0.8 USD per oz long); both are shown.
