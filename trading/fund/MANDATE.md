# The fund: mandate (set by the boss, 2026-11-27)

The owner places every real order by hand. This code never connects to any brokerage account; it only writes
recommendations (`orders.md`) and keeps a shadow paper copy to measure skill.

- **Universe and rules:** long-only US equities in a cash account. No leverage, no options, no shorting.
- **Execution:** Webull Thailand, 0.107% per side (commission plus VAT), fractional shares.
- **Benchmark:** S&P 500 total return (SPY with dividends).
- **Core, 60%:** an S&P 500 ETF, the cheapest of VOO / IVV / SPYM (SPLG was renamed SPYM) that Webull TH lists (the owner checks). It is bought in
  3 weekly tranches from the week of 2026-11-30, because the market is very volatile now.
- **Satellite, 40%:** 5 to 8 stocks chosen on fundamentals.
  - Max 8% per name and 20% per industry; semiconductors and memory together are capped at 20%.
  - Rebalanced quarterly, or when a name drifts past 1.5x its target.
  - A name is sold when its written thesis breaks, not on price alone.
  - If the satellite trails the S&P 500 over any rolling 12 months, it is folded into the core and the boss is told.
- **Currency:** reported in USD and THB (FRED DEXTHUS, plus the Yahoo THB rate when available). No FX hedging.
- **Honesty:** every report says plainly when the satellite is behind the benchmark.

## The owner's real plan: monthly DCA (boss, 2026-11-27)
10,000 THB every month, converted to USD once a month (one FX conversion saves spread), bought on the first trading day of
the month. The monthly buys replace the 3 weekly lump-sum tranches. The split was set by the boss:
- **LOW, 20% (2,000 THB):** SGOV, a 0-3 month T-bill ETF (BIL if Webull TH does not list SGOV). This bucket never goes below
  zero, and profit skims from the HIGH bucket land here.
- **MEDIUM, 70% (7,000 THB):** the fund at its current target weights (portfolio.md: core S&P 500 ETF plus the satellite).
- **HIGH, 10% (1,000 THB):** reserved for the gold desk. It goes to MT5 only after the desk passes the 30 Nov verdict criteria.
  Until then it piles up in SGOV as the "high reserve". The existing 70 USD MT5 account is this bucket's seed.

`dca.py` writes each month's `orders.md` in THB and USD (FRED DEXTHUS, then Yahoo THB=X) at the last closes. The shadow book
(`shadow.py`) follows the same schedule from December 2026, against the same cash flows into SPY, using money-weighted returns.
