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
