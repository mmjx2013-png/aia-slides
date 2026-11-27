# MPC (Marathon Petroleum Corporation): paper research memo, 2026-11-27

## Verdict
**WATCH.** A strong, integrated refiner plus a large MPLX midstream stake, but the stock is up 85% in a year, cash flow is cyclical, and the screen's cheapness depends on a normalized FCF that I cannot verify from this file; wait for a better entry or proof of mid-cycle earnings.

## Business
Marathon Petroleum is a US refiner and marketer with a large midstream arm. Segments named in the 10-K (10-K 0001510295-26-000009, Item 7 Results table):
- **Refining & Marketing**: 2,986 mbpcd of refining capacity at 12/31/2025 (2,963 in 2024, 2,950 in 2023). It buys crude, makes gasoline and diesel, and sells through wholesale and branded channels. The Marathon and ARCO trademarks are described as material (10-K, Trademarks section). Segment adjusted EBITDA was $6,138M in 2025 vs $5,703M in 2024.
- **Midstream** (via MPLX): pipelines, gathering and processing, fractionation and export, concentrated in the Permian to Gulf Coast gas and NGL chain. Segment adjusted EBITDA was $6,750M in 2025 vs $6,544M in 2024.
- **Renewable Diesel**: loss-making, adjusted EBITDA of -$110M in 2025 vs -$150M in 2024.

Customers are fuel wholesalers, dealers and retail channels for refining, and producers and shippers for midstream. The split of revenue by customer is not in the filing excerpt.

2025 portfolio moves (10-K, Item 7 Strategic Updates): MPLX bought Northwind Midstream ($2.4B), the rest of BANGL ($703M plus an earnout of up to $275M) and Whiptail's San Juan assets ($235M). It sold the Rockies assets for $980M. MPC sold its 49.9% ethanol JV stake for $427M. MPLX issued $4.5B of senior notes in August 2025.

## Moat
Evidence for:
- Scale and complexity. About 3.0 million bpd of capacity, able to run sweet and sour crude, with pricing sensitivities that reward sourcing discounted crude (10-K, Item 7 Overview of Segments).
- Integration. Midstream is about half of reportable segment adjusted EBITDA ($6,750M of $12,778M, 10-K Item 7) and is partly fee-based and FERC-regulated. This dampens refining swings.
- Regulatory barriers. New US refineries are not being built. Management argues US refiners hold structural advantages over the rest of the world (10-K Item 7 Business Update). This is management's view, not independent evidence.
- Returns. ROIC 0.409 and ROE 0.2337 (XBRL screen), though these are at a good point in the cycle.

Evidence against:
- Refining is a commodity business. Margin follows crack spreads and crude differentials, not pricing power. Sensitivity: $1.00/bbl on the blended crack is about $1,125M of annual R&M EBITDA, and $1.00/bbl on the sour or sweet differential is $520M each (10-K Item 7).
- The Los Angeles refinery faces costly California rules (SCAQMD Rule 1109.1 phased through 2032, Cap-and-Invest through 2045, low carbon fuel standard).
- Revenue CAGR is -9.2% and FCF CAGR -30.1% (XBRL screen, window not stated in the file), so there is no growth moat.

Net: a cost-position and asset-quality moat, not a durable pricing moat. The midstream stake is the better quality part.

## Numbers
Latest fiscal year is 2025 (period ended 2025-12-31).
- Revenue: $132.70B (XBRL screen).
- Operating income: not in the filing excerpt. Income before income taxes was $7,015M in 2025 vs $5,957M in 2024 (10-K 0001510295-26-000009, Item 7 Results table). This includes $897M of gains on asset sales, $253M of legal settlements and $57M of SRE benefit, so it overstates recurring earnings. Excluding those three items gives roughly $5.8B (my arithmetic: 7,015 - 897 - 253 - 57 = 5,808). The $1,276M net interest and financial cost (up from $839M) is included.
- Diluted EPS attributable to MPC: $13.22 in 2025 vs $10.08 in 2024 (10-K Item 7). Net income attributable rose $602M.
- FCF: $4.767B, a 3.59% margin (XBRL screen). Five-year average FCF margin 6.03%, standard deviation 2.05 points (XBRL screen).
- Return metrics: ROIC 0.409, ROE 0.2337 (XBRL screen).
- Net debt: the screen shows net_debt_fcf -0.2729 and net_debt_ebitda -0.1127, i.e. net cash on the screen's definition. I treat this with suspicion. MPLX issued $4.5B of notes in 2025 and interest cost rose 52%, which does not look like a net-cash company. The screen may net MPC's cash against parent-only debt, or a data quirk is at play. The dollar amount of net debt is not in the filing excerpt.
- Share count: not in the filing excerpt. The screen shows dilution -0.407 and s_dilution 0.9997, which means the share count is falling sharply (heavy buybacks). Units of the measure are not stated, so I do not quote a percentage per year.
- Market cap $94.28B; last close $346.27 on 2026-11-25 (XBRL screen, price pack).
- Cash from MPLX: $2.56B of distributions received in 2025 vs $2.27B in 2024. MPC owns about 647M MPLX units worth $34.55B at 12/31/2025 (10-K Item 7).

Caution: consolidated FCF includes MPLX's cash flow, part of which belongs to outside MPLX unitholders. Market cap covers MPC shareholders only. FCF yield on market cap therefore flatters MPC unless the minority share is deducted. The file does not give the figure.

## Why is it cheap?
The screen's composite is 0.671, with a low valuation sub-score (s_valuation 0.448) and a very high momentum sub-score (0.9749). So the stock is not cheap on the screen's own valuation measure; it looks cheap only against normalized numbers.

What the market is worried about, from the headlines and the filing:
1. Peak refining margins. A Seeking Alpha headline says it "looks cheap on windfall earnings, but fairly priced on 2028 earnings". If 2025-26 margins are above mid-cycle, trailing multiples are flattering.
2. A sharp fall. The stock is down 20% in a month, after an 8-day losing streak (16%) per Trefis headlines. DBS cut it to Hold. A consensus target cut to $460.38 still implies about 29% upside (TradingView).
3. Policy and demand. Lower EV mandates (EPA rescinded the Endangerment Finding and vehicle GHG standards in February 2026, a plus for fuel demand but under court challenge) cut the other way; a renewable fuel volume increase under the RFS and a possible reallocation of small refinery exemptions can raise compliance costs.

My view: the worry about peak margins is partly right. The price has rallied 39% in 6 months and 85% in 1 year, so the stock is not a deep-value setup. I cannot judge the cause of the 1-month drop from the file; the headlines give no company-specific bad news beyond analyst actions.

## Cyclical check (cyclical_normalized = True)
- Normalized FCF: about $8.0B (fcf_yield_norm 0.08482 x market cap $94.28B; consistent with 6.03% average FCF margin x $132.7B revenue). This compares with $4.77B reported for 2025. Normalized FCF yield: 8.5% vs 5.1% reported (XBRL screen).
- Normalized EV/EBIT: 8.49 vs 11.21 on reported EBIT (XBRL screen). That implies normalized EBIT is about 32% above 2025 EBIT (11.21 / 8.488 = 1.32).

Critical reading: 2025 is described by management as a year of higher realized margins, yet the screen's average-based normalization sits above 2025. FCF in 2025 was depressed relative to its average, by growth capex and acquisitions of $3.3B+ in MPLX (Northwind, BANGL, Whiptail), higher interest and a possibly weak working-capital year. The average comes from a window that probably includes the 2022-23 super-cycle, when refining margins were abnormal. I would not accept $8.0B as mid-cycle. A haircut case: take the midpoint of reported and normalized, about $6.4B, a 6.8% yield on market cap (my arithmetic, not a screen number). Also deduct the unknown MPLX minority share.

## Disruption risk
Energy refiner, not a software, payments or internet name. The relevant structural risk is gasoline and diesel demand erosion from EVs and low-carbon fuel mandates (10-K Item 7, Vehicle and Fuel Requirements). It is slow, and US policy currently leans against it.

## Risks (top 5, most important first)
Note the 1A excerpt in the file is mostly the executive summary and MD&A text, so these draw on the Item 7 environmental discussion and my reading of the segment data, not the full risk list.
1. **Margin cyclicality.** Crack spreads and crude differentials drive earnings. A $1.00/bbl fall in the blended crack costs about $1.1B of R&M EBITDA a year (10-K Item 7).
2. **Valuation after a large run.** +85% in 1 year, +146% in 3 years (price pack). A return to mid-cycle margins would hit both earnings and the multiple.
3. **Regulation and cost, especially California.** The Los Angeles refinery faces Rule 1109.1 through 2032, cap-and-invest and low carbon fuel standards. RFS volumes and RIN costs rise, and invalid RINs bring replacement costs and penalties.
4. **Leverage and capital allocation in midstream.** $4.5B of new MPLX notes, about $3.3B of 2025 acquisitions, an earnout of up to $275M. Interest cost rose from $839M to $1,276M. Returns on this spending are unproven.
5. **Environmental and safety liabilities.** PFAS (AFFF foam), CERCLA, hydrofluoric acid alkylation rules and a TSCA lawsuit that could ban HF in refineries. Management says it cannot predict the cost.

## Valuation
- FCF yield: 5.06% reported, 8.48% normalized (XBRL screen). My haircut case is about 6.8% (see above). All on MPC market cap, before any MPLX minority adjustment.
- EV/EBIT: 11.21 reported, 8.49 normalized. ev_ebit_vs_hist is 2.846 in the screen; the file does not define the units. If it is a ratio to the company's own history, MPC trades well above its own norm; I would not rely on it without the definition. Own-history EV/EBIT multiples are not in the filing excerpt.
- Sum of the parts: the MPLX stake was worth $34.55B at 12/31/2025, equal to about 37% of today's market cap ($94.28B), at the year-end unit price of $53.37 (current MPLX price not in the file). So the refining business plus corporate is implied at about $60B of equity, before the MPLX-level debt consolidation question. A Seeking Alpha headline calls the sum-of-the-parts case compelling; I cannot verify it.
- What is priced in: roughly mid-cycle refining margins, continued midstream growth and ongoing heavy buybacks. A margin fade toward 2028 earnings (the "fairly priced on 2028" view) would leave little margin of safety at $346.

## Thesis
- Integrated refiner with about 3.0 million bpd and a cost-advantaged crude slate; US refiners are structurally advantaged per management.
- Midstream provides about half of segment EBITDA and growing distributions ($2.56B to MPC in 2025, up 13%).
- Strong balance sheet on the screen (s_balance 0.8625), high ROIC (0.409) and heavy share buybacks (s_dilution 0.9997).
- Normalized yields of 8.5% FCF and 8.5x EV/EBIT would be attractive if mid-cycle is closer to the five-year average.
- The pullback of 20% in a month and 28% from the 5-year high is a possible entry, but not yet confirmed by evidence.

## What breaks the thesis
- Gulf Coast or blended crack spread falls more than $3/bbl below the 2025 level for two quarters (about $3.4B annualized R&M EBITDA loss from the $1,125M per $1 sensitivity).
- Reported FCF stays below about 4% of revenue for two more quarters, while Refining & Marketing adjusted EBITDA is flat or down year on year.
- Midstream segment adjusted EBITDA stops growing (below the $6,750M 2025 level on a trailing basis) or MPLX leverage rises further after acquisitions.
- Share count stops falling (buyback pauses) while the stock trades above $350.
- A final California or federal rule materially raises Los Angeles refinery costs, or the HF alkylation ban lawsuit succeeds.
- Entry rule for moving from WATCH to BUY-candidate: price near or below an FCF yield of 8% on a haircut normalized FCF of $6.4B (about $80B market cap, about $290 per share if the share count is unchanged; share count is not in the file, so this is a rough scaling of the current price: 346.27 x 80 / 94.28 = $294).

## Headlines (last 30 days)
Mostly price-driven and mixed. Trefis reports an 8-day losing streak and a 16% loss, and earlier a 14% slide over 6 down days. MarketBeat notes DBS cutting the stock to Hold and a 2.4% daily drop on 11-25. TradingView reports a 12-month price target cut to $460.38 (29% upside). Yahoo Finance calls the stock "reasonable" after strong Q3 results, and a Seeking Alpha piece says it is cheap on windfall earnings but fairly priced on 2028 earnings, while another calls the sum-of-the-parts compelling. The Q3 10-Q (accession 0001510295-26-000071, filed 2026-11-03) is not in the file excerpt, so I cannot give Q3 numbers. Net: the story is a sell-off after a very strong run, with analysts trimming targets but still seeing upside.
