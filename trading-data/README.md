# Market data for the paper-trading worker
Fetched 2026-11-25 by the boss session from the Yahoo Finance chart API (the worker's IP got HTTP 429).
`market-data-2026-11-25.tgz` holds raw chart JSON:
- yahoo/: 62 SET stocks (`<TICKER>.json`, 10y daily, dividends and splits) plus INDEX_SET50.json and INDEX_SET.json. INTUCH returned 404 (delisted after its merger).
- yahoo-gold/: GC=F gold futures (10y daily, 730d hourly), GLD, SI=F, DXY, ^TNX, USD/THB, S&P 500 (10y daily).
Unpack: `tar xzf market-data-2026-11-25.tgz`
- TDEX_BK.json: ThaiDEX SET50 ETF (TDEX.BK), 10y daily with dividends. Use it as the SET50 benchmark: Yahoo returns only one bar for ^SET50.BK and ^SET.BK whatever range is asked.

## US stocks (fetched 2026-11-26)
`us-stocks-2026-11-25.tgz` -> yahoo-us/: 10y daily chart JSON (dividends and splits) to 2026-11-25 for
SPY QQQ IWM DIA, the 11 SPDR sector ETFs, TLT IEF HYG, VIX, GSPC, NDX and 34 large caps
(AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO BRK_B JPM LLY V UNH XOM MA COST HD PG JNJ NFLX AMD ORCL CRM ADBE WMT KO PEP BAC CVX MRK ABBV TMO INTC CSCO),
plus SPY_1h and QQQ_1h (730 days hourly).
Caveat: the large-cap list is today's winners, so a stock-picking backtest on it has survivorship bias. Judge strategies on the ETFs first.
