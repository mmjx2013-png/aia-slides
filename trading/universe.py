"""The stock universe.

SOURCE AND ITS LIMITS (read this):
- SET's own website (set.or.th) is blocked by this environment's network
  policy, so the list could NOT be checked against SET's official SET50 list.
- The list below is the SET50 membership as remembered for 2025 (after the
  GULF/INTUCH merger). It may differ by a few names from today's list.
- Every ticker is checked against Yahoo: names that do not load are dropped
  and reported, never replaced by guesses.
- Survivorship bias: these are companies that are big TODAY. Using them for
  2016-2023 makes the past look better than an investor could have known,
  because yesterday's losers that fell out of the index are missing.
"""
INDEX = "TDEX.BK"  # SET50 (TDEX ETF proxy): Yahoo returns only 1 bar for ^SET50.BK

TICKERS = [
    "ADVANC", "AOT", "AWC", "BANPU", "BBL", "BCP", "BDMS", "BEM", "BH", "BJC",
    "BTS", "CBG", "CCET", "CENTEL", "COM7", "CPALL", "CPF", "CPN", "CRC", "DELTA",
    "EGCO", "GPSC", "GULF", "HMPRO", "IVL", "KBANK", "KKP", "KTB", "KTC", "LH",
    "MINT", "MTC", "OR", "OSP", "PTT", "PTTEP", "PTTGC", "RATCH", "SCB", "SCC",
    "SCGP", "TCAP", "TIDLOR", "TISCO", "TLI", "TOP", "TRUE", "TTB", "WHA", "BGRIM",
]
