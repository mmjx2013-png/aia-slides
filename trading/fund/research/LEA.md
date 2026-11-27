# LEA (Lear Corp) - paper research memo, 2026-11-27

## Verdict
WATCH: very cheap on trailing numbers (about 10.5% FCF yield, about 5x EV/EBIT, net cash), but margins are thin, the stock fell 28% in 6 months for reasons the inputs do not explain (the latest 10-Q is not in the file), and 2026 brings a USMCA review plus union contract expiries.

Note on sourcing: the inputs file has no income statement. Operating income, EBITDA and net debt below are DERIVED from the XBRL screen ratios and are marked "derived"; treat them as approximate.

## Business
Lear is a Tier 1 auto supplier with two segments (10-K 0000842162-26-000011, Item 7, Executive Overview):
- Seating: complete seat systems and key seat components.
- E-Systems: electrical distribution and connection systems, high-voltage power distribution (battery disconnect units), low-voltage power distribution and electronic controllers.

Customers are all the major global automakers. Revenue for FY2025 was $23.26B (XBRL screen). Segment revenue and profit splits are not in the filing excerpt. Customer concentration percentages are not in the filing excerpt.

## Moat
Narrow, and mostly of the "scale and incumbency" kind, not pricing power.

For a moat:
- Purchase orders cover a customer's requirements for a vehicle model and plant for the life of the program (10-K, Item 1A/7 risk factors). Once a program is won, revenue is sticky for years.
- Tier 1 program management and engineering is hard to replicate; Lear coordinates many sub-suppliers per launch (10-K, risk factors).
- ROIC of 15.2% (XBRL screen) is decent for an auto supplier.

Against a moat:
- Contracts generally provide annual price reductions over the program life while Lear carries design and engineering responsibility (10-K, risk factors). That is a buyer holding the power.
- Customers can in-source or re-source, and can direct which sub-suppliers Lear uses (10-K, risk factors).
- Chinese suppliers with "lower financial return expectations" are challenging incumbents (10-K, risk factors).
- FCF margin is 2.3% with a standard deviation of only 0.3 points over the window (XBRL screen: fcf_margin 0.02267, fcf_margin_avg 0.02291, fcf_margin_std 0.002978). Steady, but steadily thin. That is the profile of a company that passes most of its economics to customers.
- 5-year total shareholder return of -19% against +96% for the S&P 500 (10-K, Item 5 performance graph: $80.56 vs $195.98 from a $100 start, end 2025). Peers did the same (79.15), so this is an industry problem, not a Lear-specific one.

Net: a competent operator in a structurally low-margin industry. Not a moat that justifies a premium multiple.

## Numbers
All FY2025 (year ended 2025-12-31) unless stated.
- Revenue: $23.26B (XBRL screen). Revenue CAGR 3.6% (XBRL screen).
- Free cash flow: $527.2M (XBRL screen); FCF margin 2.27% (XBRL screen). FCF CAGR 11.2% (XBRL screen).
- Market cap: $5.01B (XBRL screen).
- Net debt: about -$1.0B, i.e. net cash (derived: net_debt_fcf of -1.906 x FCF $527.2M; XBRL screen). Net debt/EBITDA -0.73 (XBRL screen).
- EV: about $4.0B (derived: market cap less net cash).
- Operating income (EBIT): about $777M, about 3.3% margin (derived: EV $4.0B / EV/EBIT 5.158). Reported operating income is not in the filing excerpt.
- EBITDA: about $1.38B (derived from net debt / net debt-to-EBITDA).
- ROIC 15.2%, ROE 8.7% (XBRL screen). The ROE below ROIC is consistent with an equity base that is large relative to debt-financed capital, i.e. a conservative balance sheet.
- Share count: the dilution metric is -0.1056 (XBRL screen), meaning shares outstanding fell roughly 10.6% over the screen window (window length not in the file). Buybacks are consistent with this: $5.9B repurchased since 2011 at an average of $95.01 per share, with $775M authorization left, expiring 2026-12-31 (10-K, Item 5). In Q4 2025 the company bought 1.63M shares at an average of $107.23 (10-K, Item 5).
- Screen scores (0 to 1): composite 0.669, balance 0.863, dilution 0.818, valuation 0.913, quality 0.484, growth 0.509, momentum 0.477 (XBRL screen). Balance sheet, buybacks and valuation score well; quality, growth and momentum score middling.
- Price: last close $104.05 on 2026-11-25; 1m -11%, 6m -28%, 1y +2%, 3y -16%; volatility 35%/y; drawdown from 5-year high -39%; worst 5-year drawdown -58% (price stats).

Not in the filing excerpt: reported operating income, capex, interest expense, dividend amount, pension and lease obligations, gross debt, segment margins, 2026 year-to-date results (the 10-Q accession 0000842162-26-000092 is listed but not excerpted).

## Why is it cheap?
Plain words: the market is saying Lear earns a thin, cyclical margin that can disappear with a bad year, and several things could go wrong in the next 12 months.

What the market is probably worried about, using the 10-K risk factors:
1. Tariffs and USMCA. Lear buys and builds across China, Mexico and Canada, and USMCA is up for trilateral review and renewal in 2026 (10-K, Item 7/1A). Management says it has contracts to recover "substantially all tariff costs incurred to date" and that mitigation "to date" has worked, but gives no assurance for the future.
2. Labor. Agreements covering about 67% of the roughly 75,000 unionized workers expire in 2026 (10-K, risk factors). A strike at Lear or at a customer would hit volumes.
3. Slower EV adoption leading to program cancellations and volume decreases (10-K, risk factors).
4. Chinese competition for both the automakers and their suppliers (10-K, risk factors).
5. Annual customer price-downs against fixed engineering burden (10-K, risk factors).

Is the worry right? Partly. The risks are real and several resolve in 2026-27, so a discount is fair. But an EV/EBIT of about 5x, at 0.48 of its own history (ev_ebit_vs_hist 0.4848, XBRL screen), plus net cash, implies the market is pricing something close to a margin collapse. If tariff costs are really recoverable and the USMCA review ends benignly, the stock is cheap. I cannot verify the recent 6-month decline of 28% from the inputs: the Q3 2026 10-Q was filed 2026-10-30 but is not in the file, and the headlines do not name a trigger. That gap is the main reason this is WATCH and not BUY-candidate. Whatever drove the 6-month fall may have changed the earnings base that the 10.5% yield rests on.

A caution on "cheap": auto suppliers are almost always cheap on trailing FCF at cycle highs and cheap again at cycle lows. Lear's own 5-year TSR (-19%) shows cheap has stayed cheap.

## Cyclical check
cyclical_normalized = True in the inputs, so use the normalized case.
- Normalized FCF yield: 10.63% (XBRL screen: fcf_yield_norm 0.1063), versus 10.51% on the latest year. Little difference, because FCF margin has been very stable (std 0.3 points).
- Normalized EV/EBIT: 4.84x (XBRL screen: ev_ebit_norm 4.835), versus 5.16x latest. Implied normalized EBIT is about $829M (derived: EV about $4.0B / 4.835).
- Caveat: the stability of the FCF margin is measured over the screen window only (length not in the file). It may not include a deep recession. The worst 5-year price drawdown of -58% shows the equity has been priced for severe stress before. A real downturn (volumes down 15 to 20%) on a 3% EBIT margin could remove most of operating profit, because the fixed cost base is large. I would stress-test FCF at half of normalized (about $260M); at today's market cap that is still a 5% yield.

## Disruption risk
Not mandatory for this name (not software, payments or internet). The nearest equivalents are EV transition and Chinese suppliers, covered in Risks. AI is cited as an internal-use risk, not a threat to the product (10-K, risk factors).

## Risks
Top 5 from Item 1A, most important first, in my words:
1. Tariffs, USMCA and trade policy. The 2026 USMCA review, plus tariffs on steel, aluminum and parts from China, Mexico and Canada, could raise costs or cut customer production. Recovery from customers so far is contractual, not guaranteed going forward.
2. Price-downs versus cost-downs. Customers contractually take annual price reductions; if Lear cannot out-engineer them, a 3% EBIT margin has little cushion.
3. Customer program and volume risk. Contracts are for requirements, not fixed quantities; a weak vehicle model or in-sourcing cuts sales. EV program cancellations have already occurred.
4. Labor disputes. About 67% of unionized workers (of about 75,000) have contracts expiring in 2026, and customer or supplier strikes would also stop Lear plants.
5. Competition from Chinese suppliers and new-entrant automakers, who may accept lower returns and can undercut on price and cost.

Others noted in the excerpt: supplier financial distress and sole-source components, heavy emerging-market exposure, joint ventures (especially in Asia), program launch execution, AI and cybersecurity risk.

## Valuation
- FCF yield: 10.5% latest, 10.6% normalized (XBRL screen).
- EV/EBIT: 5.16x latest, 4.84x normalized; the current multiple is 0.48 of its own history (XBRL screen), i.e. about half the historical level. The history window is not stated in the file.
- Net cash of about $1.0B is about 20% of market cap (derived), so the operating business is priced at about $4.0B EV.
- What is priced in: at a 10.5% yield, the market implies either that FCF falls structurally (for example, a margin squeeze from tariffs or the USMCA outcome) or that it is peak. If FCF merely holds at $527M and buybacks continue at about $100/share, the shrinking share count alone compounds per-share value. Reverse view: a 15% haircut to FCF still leaves a roughly 9% yield.
- A Seeking Alpha headline calls "over 25% upside if its cash flow holds" (2026-11-25); the "if" is the whole question and I cannot verify its model.
- Per-share value: shares outstanding are not in the filing excerpt; implied from market cap and last close, about 48M shares (derived: $5.014B / $104.05).

## Thesis
- Cash generation is high relative to price: $527M FCF on a $5.0B market cap, normalized yield 10.6% (XBRL screen).
- Balance sheet is a strength: net cash about $1.0B (derived), balance score 0.86 (XBRL screen), no refinancing pressure evident in the excerpt.
- Capital return: share count down about 10.6% (XBRL screen) and $775M buyback authorization remaining (10-K, Item 5), though it expires 2026-12-31 and renewal is not confirmed in the file.
- Valuation is about half its own history on EV/EBIT (XBRL screen), so modest margin stability could re-rate the stock.
- ROIC of 15.2% (XBRL screen) shows the capital is productive despite thin margins.

## What breaks the thesis
Checkable signals:
1. Adjusted EBIT margin below about 3.0% for two consecutive quarters (derived FY2025 level about 3.3%).
2. FCF over the trailing four quarters below about $350M (about a one-third drop from $527M).
3. Net cash turning to net debt, or net debt/EBITDA above 0.5x.
4. A USMCA review outcome that adds non-recoverable tariffs, or management stating that customers are no longer reimbursing tariff costs.
5. A strike at Lear or a major customer lasting more than a few weeks, following the 2026 contract expiries.
Also: no renewal of the buyback authorization after 2026-12-31.

## Headlines
The last 30 days show little hard news. The most relevant items are analyst-related: Seaport Global initiated coverage with a Neutral rating (2026-11-24, several outlets), and a Seeking Alpha piece arguing for over 25% upside if cash flow holds (2026-11-25, positive). A Kalkine piece asks whether the story stays on track (neutral). No headline mentions earnings, tariffs, USMCA or strikes, so the 11% fall in the last month is unexplained by this file. The remaining headlines are unrelated (name matches such as obituaries, option quotes and other companies) and carry no signal. Sentiment is neutral to mildly positive from analysts, which is consistent with a stock priced for trouble but without an identified catalyst.
