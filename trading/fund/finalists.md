# Finalists v2 (2026-11-27, after the debt and risk-factor fixes; code only, before research)

Selection as before: top composite among scored names with a valuation; at most 3 per industry group (energy and
semis/memory each one group); at least 5 groups. Composite = 80% fundamentals + 20% 12-1 momentum; cyclicals normalized.

| # | Ticker | Name | Group | Composite | Quality | Balance | Valuation | Momentum (12-1) |
|---|---|---|---|---|---|---|---|---|
| 1 | JBL | JABIL INC | SIC 36 | 0.696 | 0.75 | 0.65 | 0.44 | +44% |
| 2 | MU | Micron Technology, Inc. | semis/memory | 0.692 | 0.54 | 0.93 | 0.48 | +315% |
| 3 | LRCX | LAM RESEARCH CORPORATION | semis/memory | 0.686 | 0.77 | 0.93 | 0.21 | +61% |
| 4 | NVDA | NVIDIA CORP | semis/memory | 0.685 | 0.73 | 0.93 | 0.53 | +20% |
| 5 | ROST | Ross Stores, Inc. | SIC 56 | 0.673 | 0.74 | 0.93 | 0.32 | +33% |
| 6 | ADBE | ADOBE INC. | SIC 73 | 0.661 | 0.80 | 0.85 | 0.92 | -22% |
| 7 | AAPL | Apple Inc. | SIC 35 | 0.649 | 0.86 | 0.78 | 0.36 | +26% |
| 8 | BBY | BEST BUY CO., INC. | SIC 57 | 0.644 | 0.73 | 0.93 | 0.42 | +37% |
| 9 | MA | Mastercard Incorporated | SIC 73 | 0.641 | 0.81 | 0.72 | 0.40 | +14% |
| 10 | LMT | LOCKHEED MARTIN CORPORATION | SIC 37 | 0.639 | 0.79 | 0.41 | 0.49 | +42% |
| 11 | MCK | McKESSON CORPORATION | SIC 51 | 0.636 | 0.71 | 0.70 | 0.51 | +12% |
| 12 | FLEX | FLEX LTD. | SIC 36 | 0.636 | 0.57 | 0.60 | 0.25 | +46% |

## What changed from v1
- Total debt was understated: some filers report it only under tags the screen did not read (MAR $16.2bn, PAA $11.3bn,
  MPC $33.3bn, PSX $19.7bn under DebtAndCapitalLeaseObligations). Debt is now the largest of the reported total and
  (long-term + current) measures. With real leverage, PAA, PSX, MPC, LEA and MAR fall out; AAPL, MA, LMT, MCK and FLEX come in.
- The risk-factor parser sometimes took the table of contents or a cross-reference; it now takes the real Item 1A / Item 7.
- v1 memos (all 12 WATCH) are kept in research/archive_v1/ and not used.
