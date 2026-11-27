# Fund portfolio: target weights (PAPER research; the owner places real orders by hand)

**Funding (from 2026-11-27):** 10,000 THB a month by DCA. The weights below are the MEDIUM bucket's (70% of each month).
LOW (20%) goes to SGOV, and HIGH (10%) is a gold-desk reserve held in SGOV until approved. See MANDATE.md and orders.md.

Decided 2026-11-27 09:50 Bangkok by one Opus call (89,198 tokens) on 12 Sonnet memos, then checked in code against MANDATE.md.

| Holding | Weight | Group | Reason |
|---|---|---|---|
| SPYM (core, S&P 500; expense ratio 0.02%/y, the lowest of SPYM, VOO, IVV) | 96.0% | core | the benchmark itself, bought monthly by DCA; includes 36.0% of unfilled satellite |
| ADBE | 4.0% | SIC 73 | Only memo rated BUY-candidate: 10.9% FCF yield, 10.5x EV/EBIT, ARR +11.5%, near-zero net debt. Starter size because of AI-disruption and earnings event risk. |

**The satellite is partly unfilled: 4.0% of 40%.** Only ADBE has a margin of safety and a written BUY case. Every other finalist is WATCH: fully priced, or cyclical names that look expensive on normalized numbers. The remaining 36% stays in the core ETF. The unfilled 36.0% sits in SPYM until a name passes research (WATCH names are re-checked at each quarterly review or new 10-Q/10-K).

Industry exposure in the satellite: SIC 73 4.0%.

## Correlation with the S&P 500 (daily total returns, SPY)
| Name | 1-year correlation | 1-year beta | 5-year correlation | 5-year beta |
|---|---|---|---|---|
| ADBE | 0.08 | 0.24 | 0.52 | 1.14 |

The 1-year number alone understates how ADBE moves in a broad sell-off: over 5 years it moved with the market (beta about 1.1).

## Theses and what breaks them
### ADBE (4.0%)
Thesis: A cash machine priced for decline. ARR, RPO and margins are still rising, and buybacks are shrinking the share count about 9%. Holding low-single-digit FCF growth beats the index from a 10% yield, and stabilisation re-rates it.
Breaks if:
- Total ARR growth below 8% at FY2026 year end, or two quarters of deceleration
- FCF margin below 35% for two quarters
- RPO growth below revenue growth for two quarters, or share count stops shrinking / acquisition over ~10% of market cap

## Not chosen
- JBL: AI-concentrated, FCF flattered by payables timing, 39% above own EV/EBIT history
- MU: Peak-cycle memory; 28x normalized EBIT, 0.5% normalized FCF yield, 87% volatility
- LRCX: 31x normalized EBIT, 2.7% FCF yield; cyclical capex and China risk
- NVDA: No margin of safety at 34.6x normalized EBIT; core already carries it
- ROST: Quality fully priced: 25x EV/EBIT, 2.5% normalized FCF yield
- AAPL: 33x EV/EBIT at 5-year high; already a large core weight
- BBY: Thin moat, shrinking revenue, 46% above own multiple history after rally
- MA: Superb but full price, 32x EV/EBIT; already heavy in the core
- LMT: Above own multiple history; F-35 and single-customer concentration, little cushion
- MCK: Fair, not cheap; good news priced in near 5-year high
- FLEX: Expensive mid-cycle (23x normalized EBIT); AI and spin-off risk

## Portfolio risks
One small position is a contrarian value/anti-momentum bet on AI not disrupting creative software. It is barely correlated with the S&P 500 over 1 year (0.08; but 0.52 over 5 years, see above), so its tracking error is mostly idiosyncratic. The satellite trails if ADBE keeps de-rating on AI fears or earnings show ARR slowing. Its 4% size limits the damage, and the core carries the market and AI exposure.

Memos: research/<TICKER>.md. Rules: MANDATE.md. This is research, not advice: weights are percentages of whatever amount the owner chooses.
