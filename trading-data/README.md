# Market data for the paper-trading worker
Fetched 2026-11-25 by the boss session from the Yahoo Finance chart API (the worker's IP got HTTP 429).
`market-data-2026-11-25.tgz` holds raw chart JSON:
- yahoo/: 62 SET stocks (`<TICKER>.json`, 10y daily, dividends and splits) plus INDEX_SET50.json and INDEX_SET.json. INTUCH returned 404 (delisted after its merger).
- yahoo-gold/: GC=F gold futures (10y daily, 730d hourly), GLD, SI=F, DXY, ^TNX, USD/THB, S&P 500 (10y daily).
Unpack: `tar xzf market-data-2026-11-25.tgz`
- TDEX_BK.json: ThaiDEX SET50 ETF (TDEX.BK), 10y daily with dividends. Use it as the SET50 benchmark: Yahoo returns only one bar for ^SET50.BK and ^SET.BK whatever range is asked.
