# PAA (Plains All American Pipeline LP) - paper research memo, 2026-11-27

Source rules: only the inputs file (10-K accession 0001070423-26-000014, FY ended 2025-12-31; XBRL screen; price stats; headlines). Anything else is "not in the filing excerpt". Research only, no order.

## Verdict
**WATCH** - the 13.8% FCF yield and ~7% distribution yield look cheap, but the stock is up 47% in a year, the FCF is not cleanly "ours" (noncontrolling interests, preferred units, a pending disposal), the balance-sheet screen numbers look unreliable, and the excerpt does not show enough to size a position.

## Business
- Plains is a crude-oil midstream company: pipelines, terminals, storage and gathering in the Permian and other basins, plus a large "supply aggregation" (merchant) arm that buys and sells crude (10-K 0001070423-26-000014, Item 7 Executive Summary). It also had NGL assets, mostly in Canada.
- Customers: producers, refiners and export terminals in the US and Canada (Item 7 Company Overview). The assets "connect major producing regions to key demand centers and export terminals".
- Revenue FY2025: product sales $42.5B (merchant, pass-through of crude prices) and services $1.76B (fee-based: pipeline tariffs, storage) (Item 7, Consolidated Results). So ~96% of revenue is commodity resale at thin margin; the fee-based service line is the real earnings engine. Segment table is not in the filing excerpt.
- Pending sale of the Canadian NGL business to Keyera (SPA 17 Jun 2025, expected close around end of Q1 2026), already shown as discontinued operations (Item 7). Whether it closed is not in the filing excerpt; a Nov-2026 headline refers to "the Canadian NGL Sale" in Q3 results, which suggests it is done or nearly so, but that is unverified.
- Structure: PAA is a partnership with ~705.5M common units (20 Feb 2026) (Item 5), Series A and B preferred units ranking senior to common, and noncontrolling interests. PAGP (the GP holding company) appears in headlines; its link to PAA is not explained in the excerpt.

## Moat
For:
- Hard-to-replicate physical network in the Permian and at market hubs and export terminals; pipelines are rarely duplicated. Management states the assets are "critical midstream infrastructure" (Item 7).
- Services revenue grew 4% in 2025 on higher volumes and tariff escalators plus acquisitions (Item 7). Equity earnings from joint ventures of $382M (Item 7) add stable income.
- Own 5-year total return index 320.92 vs 291.01 for the Alerian Midstream index and 195.98 for the S&P 500 (Item 5), so it has beaten its peers, which fits an advantaged asset base.

Against:
- The merchant business has no moat; it is a trading margin on a $42B revenue base.
- Certain Permian long-haul contract rates "reset to market in 2025" and trimmed services revenue (Item 7). That is evidence that some contracts were priced above market and the cushion is fading.
- Midstream returns are asset-intensive; ROIC and ROE are "nan" in the XBRL screen, so capital efficiency is not shown.
- Moat rating: moderate (physical, regional, volume-dependent), not wide.

## Numbers (FY2025, continuing operations unless stated)
- Revenue $44,262M (XBRL screen). Cross-check: 42,501 + 1,761 = 44,262 (10-K 0001070423-26-000014, Item 7 Consolidated Results). Revenue CAGR -8.3% (XBRL screen), mostly commodity price; NYMEX average fell to $65 from $76 (Item 7).
- Operating income: not reported as a line in the filing excerpt. My own derivation from the Item 7 table: 44,262 revenue - 40,433 purchases - 1,154 field costs - 342 G&A - 953 D&A = about $1,380M, or 3.1% of revenue; about $1,434M with the $54M asset-sale gain. Treat as approximate, not a reported figure. Equity earnings of $382M sit below that line.
- Income from continuing operations $1,386M (up from $882M); net income $1,769M; net income attributable to PAA $1,435M vs $772M; EPS per common unit $1.66 (continuing $1.12, discontinued $0.54) (Item 7).
- Free cash flow $2,293M, FCF margin 5.18% (XBRL screen). Five-year-style average FCF margin 4.42%, standard deviation 0.69 points (XBRL screen), so FCF margin is steady on a tiny margin base. FCF CAGR +5.5% (XBRL screen). FCF definition (before or after distributions to preferred and NCI, treatment of discontinued operations) is not in the filing excerpt.
- Net debt: the screen shows net_debt_fcf 0.1025 and net_debt_ebitda 0.098 (XBRL screen). These cannot be right: interest expense on third-party borrowings was $478M and the company issued $3.0B of senior notes in 2025 (Item 7), implying debt of many billions and multiples of 1x. I do not trust those two ratios and do not use them. Net debt in dollars: not in the filing excerpt. Treat leverage as unknown, and check it before any buy.
- Interest expense, net $554M, up 29% (Item 7), driven by the $3.0B of new notes and commercial paper and term loan used for the EPIC acquisition.
- Units: weighted average 704M in 2025 vs 702M in 2024 (Item 7); 705.5M at 20 Feb 2026 (Item 5). Flat to slightly up, no buybacks ("Issuer Purchases: None", Item 5). Dilution metric: nan.
- Distributions per common unit: 2025 quarters 0.3800, 0.3800, 0.3800, 0.4175; 2024: 0.3175 x3, 0.3800 (Item 5). Latest quarterly 0.4175 annualised = $1.67, or about 7.1% on the 23.52 close (my arithmetic). Up 10% from the prior quarter's level and 32% over the Q4-2024 level for Q1.. (0.4175 vs 0.3175).
- Market cap $16.65B (XBRL screen); last close $23.52 (2026-11-25).

## Why is it cheap?
Plain words: the market does not pay a high multiple for a business that earns most of its profit from a pipe network whose volumes depend on producers drilling in a world of $55-80 oil. The worries, as I read the file:
1. Oil price and volume: if Permian activity slows, pipeline volume and the merchant margin both fall. Management says the market is "well supplied near-term" (Item 7). The worry is partly right; it is a real cyclical exposure even though the screen flags cyclical_normalized False.
2. Contract resets: the Permian long-haul rates already reset to market in 2025 (Item 7). Further resets reduce the fee base. The worry is right and ongoing.
3. Leverage and interest: interest cost rose 29% after acquisition-funded borrowing (Item 7). Real, and the screen ratios cannot be trusted to dismiss it.
4. Structure: partnership with preferred units and NCI, so FCF per common unit is lower than headline FCF/market cap. This is the main reason the 13.8% yield overstates the cheapness. I think the market is partly right.
5. Sentiment: a Bank of America Sell rating (26 Nov 2026) and a -10% month. Rating details are not in the filing excerpt.

My view: the stock is not obviously cheap once the structure is accounted for. It is "fairly cheap with a decent income yield", not mispriced.

## Cyclical check
cyclical_normalized = False in the inputs, so I use FY2025 as the base. Still, caution: FCF margin has been stable (average 4.42%, sd 0.69 points), but that is measured on a revenue base that moves with crude prices, and the net-income step-up from $772M to $1,435M was helped by a $213M swing in asset gains/impairments and a lower tax charge (Item 7), so FY2025 is a good year, not a depressed one. Stress case, my assumption: if FCF falls 25% to about $1.72B, the yield on the $16.65B market cap is still about 10.3%, before NCI and preferred claims.

## Disruption risk
Not a software/payments/internet name. Long-run risk is demand-side (energy transition, EV adoption) and is not quantified in the excerpt; management argues oil demand keeps rising (Item 7).

## Risks (top 5; Item 1A text is mostly cyber disclosures in the excerpt, so these are drawn from Item 7 and the screen)
1. Crude price/volume decline hitting Permian throughput and merchant margins (Item 7; NYMEX range $55-80 in 2025).
2. Leverage and refinancing: $3.0B of new notes in 2025, commercial paper and term loan for EPIC, interest up 29% (Item 7); true leverage not verifiable from the inputs.
3. Contract repricing: Permian long-haul rates resetting to market (Item 7).
4. Execution on the Canadian NGL sale and acquisition integration; closing and use of proceeds not in the excerpt (Item 7). Transaction costs already lifted G&A.
5. Cyber/IT and operational risk (spills, outages, regulatory): the Item 1A excerpt covers cybersecurity governance only; other risk-factor text is not in the filing excerpt.

## Valuation
- FCF yield 13.77%; normalized 11.74% (XBRL screen). Headline FCF/market cap = 2,293 / 16,650.
- EV/EBIT 11.78 on the latest year; normalized 15.37 (XBRL screen). Comparison with its own history: nan (ev_ebit_vs_hist), so "vs history" is not available. The gap between 11.78 and 15.37 says the latest EBIT is above the multi-year average, which argues against calling 11.78 cheap.
- Distribution yield about 7.1% (my arithmetic from Item 5), a large part of the return. Coverage: common distributions of roughly $1.1B (about $1.56 x 704M) vs FCF $2.29B, but preferred and NCI payouts are not in the excerpt, so true coverage is unknown.
- What is priced in: roughly flat distributions and volumes plus a modest cushion for lower oil. After a +47% year (3y +91%, momentum score 0.89), much of the re-rating is done. The valuation score of 0.91 and composite of 0.69 (XBRL screen) are rank-style numbers and are not a margin of safety by themselves.

## Thesis (what would make it a BUY-candidate)
- Fee-based pipeline and storage income that is growing (services revenue +4%) and covers a distribution that has been raised repeatedly (0.3175 to 0.4175 in a year).
- FCF of $2.3B at a $16.7B market cap leaves room for distribution growth, deleveraging and the disposal proceeds from Keyera.
- Focus on core US crude with exits from commodity-sensitive NGL lowers earnings volatility (Item 7, stated strategy).
- Management's declared framework: higher distributions, disciplined accretive investment and investment-grade credit (Item 7).
- Peer-beating 5-year return (320.92 vs 291.01 AMNA) suggests good asset quality.

## What breaks the thesis (checkable)
- Net debt / adjusted EBITDA above about 4x in a 10-Q (to be computed; not in the inputs), or loss of investment-grade rating.
- Distribution per unit cut or frozen for two quarters after the Q4 2025 raise to $0.4175.
- Services (fee) revenue falling year on year in two consecutive quarters, or further long-haul contract resets below market.
- Annual FCF below about $1.7B (the stress case), or FCF margin below 3.5% (about 4 standard deviations from the 4.4% average is not needed; a sustained break of 3.5% already signals trouble).
- Canadian NGL sale fails or proceeds are used for something other than debt reduction/distributions.

## Headlines (last 30 days)
Mostly noise: eight of the 15 items are option-chain pages (puts and calls, neutral). The only substantive items are a Bank of America Sell rating (26 Nov, negative 0.8, rating details not in the inputs), and coverage of Q3 results, "the Canadian NGL Sale and the Silver Creek Deal" (25 Nov, via PAGP, neutral). A Yahoo piece asks whether the stock has "run ahead of earnings" (22 Nov), and a Seeking Alpha note on a peer (Genesis Energy) is neutral. No negative fundamental news in the inputs; the -10% month is explained by sentiment and a downgrade-type headline, not by a filing. The 10-Q for 2026-09-30 (accession 0001070423-26-000058) is listed, but its text is not in the filing excerpt, so Q3 2026 numbers are unknown.
