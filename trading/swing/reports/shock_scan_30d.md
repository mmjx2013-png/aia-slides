# Shock detector, 30-day replay (PAXG 1m, code only)

Data 2026-10-26 04:09 .. 2026-11-26 04:09 UTC. Rule: unscheduled (no USD High event within +/-30 min) move of more than 5 x ATR14(1m) in 5 min AND at least 1 x ATR14(1h), or more than 2% in 30 min; one per 30 min.

| Variant | Shocks in 30 days |
|---|---|
| as specified (5 x ATR(1m) or 2%/30m) | 690 (23.0 a day) |
| + 5-min move >= 0.5 x ATR(1h) | 212 |
| + 5-min move >= 1 x ATR(1h) (adopted) | 48 (1.6 a day) |
| + 5-min move >= 1.5 x ATR(1h) | 19 |

The 2%-in-30-min rule never fired in these 30 days. The calendar archive only covers the current week, so earlier
flags marked 'not covered' may be scheduled releases (13:3x UTC on Nov 6 and Nov 10 look like NFP / CPI).

| Bangkok time | Weekday | Dir | 5-min move USD | x ATR(1m) | 30-min % | Calendar |
|---|---|---|---|---|---|---|
| 2026-10-27 17:46 | Tue | up | +13.78 | 7.2 | +0.47 | not covered |
| 2026-10-29 03:02 | Thu | up | +14.29 | 7.4 | +0.56 | not covered |
| 2026-11-01 15:22 | Sun | down | -1.62 | 11.2 | -0.07 | not covered |
| 2026-11-01 23:07 | Sun | down | -1.86 | 23.2 | -0.05 | not covered |
| 2026-11-02 05:22 | Mon | down | -1.94 | 8.2 | +0.01 | not covered |
| 2026-11-02 06:04 | Mon | up | +5.89 | 5.2 | +0.17 | not covered |
| 2026-11-02 07:49 | Mon | up | +4.33 | 6.2 | -0.01 | not covered |
| 2026-11-02 09:36 | Mon | down | -5.22 | 6.0 | -0.17 | not covered |
| 2026-11-02 20:40 | Mon | up | +16.05 | 5.4 | +0.69 | not covered |
| 2026-11-03 20:29 | Tue | up | +13.76 | 6.2 | +0.36 | not covered |
| 2026-11-04 12:35 | Wed | up | +13.96 | 6.1 | +0.57 | not covered |
| 2026-11-05 07:32 | Thu | up | +13.26 | 5.4 | +0.63 | not covered |
| 2026-11-05 22:55 | Thu | down | -24.66 | 5.5 | -0.61 | not covered |
| 2026-11-06 20:31 | Fri | down | -20.49 | 7.5 | -0.63 | not covered |
| 2026-11-08 05:16 | Sun | down | -1.50 | 13.5 | -0.03 | not covered |
| 2026-11-09 04:54 | Mon | down | -3.79 | 12.5 | -0.11 | not covered |
| 2026-11-09 06:00 | Mon | up | +7.63 | 7.0 | +0.24 | not covered |
| 2026-11-09 07:04 | Mon | up | +8.13 | 5.3 | -0.07 | not covered |
| 2026-11-09 07:35 | Mon | up | +15.66 | 5.2 | +0.58 | not covered |
| 2026-11-09 08:42 | Mon | up | +16.51 | 5.8 | +0.32 | not covered |
| 2026-11-10 02:39 | Tue | up | +14.08 | 10.5 | +0.55 | not covered |
| 2026-11-10 16:02 | Tue | down | -18.48 | 10.2 | -0.50 | not covered |
| 2026-11-10 20:31 | Tue | down | -17.33 | 10.3 | -0.64 | not covered |
| 2026-11-11 21:38 | Wed | down | -10.61 | 7.0 | -0.36 | not covered |
| 2026-11-13 20:35 | Fri | up | +24.30 | 5.4 | +0.39 | not covered |
| 2026-11-14 21:27 | Sat | down | -5.14 | 12.0 | -0.18 | not covered |
| 2026-11-14 22:24 | Sat | down | -4.83 | 7.4 | -0.13 | not covered |
| 2026-11-15 03:55 | Sun | down | -45.42 | 51.7 | -1.31 | not covered |
| 2026-11-15 04:42 | Sun | up | +15.44 | 5.2 | +0.43 | not covered |
| 2026-11-16 06:01 | Mon | up | +23.69 | 14.2 | +0.51 | not covered |
| 2026-11-16 06:47 | Mon | up | +9.54 | 5.3 | +0.46 | not covered |
| 2026-11-16 08:01 | Mon | down | -20.23 | 11.1 | -0.31 | not covered |
| 2026-11-16 12:50 | Mon | down | -21.78 | 7.7 | -0.68 | not covered |
| 2026-11-17 08:44 | Tue | up | +15.18 | 5.6 | +0.46 | not covered |
| 2026-11-19 09:59 | Thu | down | -19.00 | 7.0 | -1.10 | not covered |
| 2026-11-20 04:27 | Fri | down | -18.09 | 8.2 | -0.78 | not covered |
| 2026-11-20 06:38 | Fri | down | -18.99 | 6.5 | -0.78 | not covered |
| 2026-11-21 01:57 | Sat | up | +28.68 | 9.2 | +0.55 | not covered |
| 2026-11-21 10:33 | Sat | down | -24.06 | 13.9 | -0.68 | not covered |
| 2026-11-21 20:27 | Sat | up | +13.88 | 14.9 | +0.51 | not covered |
| 2026-11-22 01:50 | Sun | up | +13.18 | 9.4 | +0.37 | not covered |
| 2026-11-23 03:29 | Mon | down | -8.69 | 13.4 | -0.21 | not covered |
| 2026-11-23 06:01 | Mon | up | +12.83 | 9.0 | +0.34 | not covered |
| 2026-11-23 07:46 | Mon | up | +10.67 | 5.2 | +0.17 | not covered |
| 2026-11-23 20:57 | Mon | up | +29.68 | 10.4 | +0.49 | clear |
| 2026-11-24 22:18 | Tue | down | -19.78 | 5.5 | -1.27 | clear |
| 2026-11-25 18:59 | Wed | down | -17.59 | 10.0 | -0.72 | clear |
| 2026-11-25 22:17 | Wed | down | -26.95 | 5.3 | -0.74 | clear |

Headlines are not classified in this replay (Google News cannot be queried for past hours); live shocks pull them.
