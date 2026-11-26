# US stocks side study (PAPER ONLY)
Question: does a low-frequency US-stock rule have an edge good enough for the owner's real 70 USD later? The owner would place
every real order by hand; nothing here connects to any account.
- `data.py`: unpacks the boss's Yahoo dump (commit 3fc1638) into `data/` (gitignored). It never fetches Yahoo itself.
- `bt.py`: daily backtester. 70 USD cash account, next-open fills, 0.107% commission (incl. VAT) + 0.05% slippage per side,
  SEC fee on sells, fractional shares, no leverage, no shorting.
- `strategies.py`: trend filter, dual momentum, sector rotation, RSI(2), and large-cap momentum (survivor-biased, a second check only).
- `run.py`: chooses on 2016-2022 and judges on 2023-2026. Writes `REPORT.md`, `results.csv` and `summary.txt` (2 lines for the 21:00 report).
- `test_bt.py`: synthetic checks (next-open fills, costs, no look-ahead).
- `orders.md`: the forward paper book's intended orders. It is only started if a rule passes out of sample (none has yet).
