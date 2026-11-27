# NVDA (NVIDIA Corp) - paper research memo, 2026-11-27

Source basis: inputs file only (10-K accession 0001045810-26-000021, fiscal year ended 2026-01-25; XBRL screen; price pack; labelled headlines). Anything else is "not in the filing excerpt". The 10-Q (0001045810-26-000075, period 2026-07-26) is listed but no figures from it are in the inputs.

## Verdict
**WATCH.** A superb business at its cheapest multiple on the screen's own history, but the earnings base is a cyclical, customer-concentrated AI capex peak with circular financing, and the stock is in a violent drawdown (-31% in a month) with no evidence yet that the worry has been priced out.

## Business
- NVIDIA sells accelerated-computing platforms: GPUs, systems and networking (NVLink, InfiniBand, Ethernet) for AI data centers, plus gaming GPUs, professional visualization and automotive/robotics platforms. It describes itself as "a data center scale AI infrastructure company" (10-K 0001045810-26-000021, Item 7 Overview).
- Two reportable segments (Item 7, Reportable Segments):
  - Compute & Networking: revenue $193.5B (+67%), segment operating income $130.1B. About 90% of revenue.
  - Graphics: revenue $22.5B (+57%), segment operating income $9.2B.
- Customers: direct customers include AIBs, distributors, ODMs, OEMs, cloud providers (CSPs), AI model makers and system integrators. Concentration is high: one direct customer was 22% of FY2026 revenue and another 14% (Item 7, Concentration of Revenue). Customers headquartered outside the US were 31% of revenue, down from 41% (same section), reflecting China export limits.
- Product cadence is now annual (Blackwell, Blackwell Ultra/GB300, Rubin next). Blackwell was the majority of Data Center revenue.

## Moat
Evidence for:
- Scale and profitability no rival in the excerpt matches: 71.1% gross margin and 60.4% operating margin (Item 7 results table), ROIC 66% and ROE 76% (XBRL screen).
- Full-stack system sale (compute plus NVLink fabric plus networking). Networking revenue grew 142% as NVLink ramped for GB200/GB300 (Item 7, Compute & Networking). This is the strongest evidence of lock-in beyond the chip.
- One-year product cadence and the ability to pre-buy supply (commitments with lead times beyond twelve months, Item 7, Inventories) are hard for smaller rivals to copy.
- Strategic investing ($17.5B into private companies and funds in FY2026, Item 7) extends its ecosystem pull.

Evidence against / limits:
- Gross margin fell 3.9 points as the mix moved to full Blackwell racks (Item 7, Gross Margin); some of that is the one-off $4.5B H20 charge, but the system model structurally carries lower margin than chip-only Hopper HGX.
- Open-source models "dependent on developer adoption" could be deployed on competitors' platforms (Item 7, Recent Developments). The excerpt does not quantify competitor share.
- The largest customers are also the likeliest builders of in-house silicon. A headline (2026-11-25) flags that Anthropic's chip choices could change the story; the content is not in the inputs, so treat it as an unverified signal.
- Moat durability is therefore good but not proven against hyperscaler self-supply: not in the filing excerpt.

## Numbers (fiscal year ended 2026-01-25)
| Item | Value | Source |
|---|---|---|
| Revenue | $215.9B, +65% (prior $130.5B) | (10-K 0001045810-26-000021, Item 7 FY Summary; XBRL screen) |
| Gross margin | 71.1% (prior 75.0%) | (10-K, Item 7 FY Summary) |
| Operating income | $130.4B, +60%; margin 60.4% | (10-K, Item 7 FY Summary and results table) |
| Operating expenses | $23.1B, +41% (R&D $18.5B, SG&A $4.6B) | (10-K, Item 7 Operating Expenses) |
| Net income / diluted EPS | $120.1B / $4.90 (prior $2.94) | (10-K, Item 7 FY Summary) |
| Free cash flow | $96.7B; FCF margin 44.8% | (XBRL screen) |
| FCF margin, multi-year average | 37.5% (std dev 13.5 points) | (XBRL screen) |
| Net debt | Screen shows net debt/FCF of -0.012 and net debt/EBITDA of -0.0085, i.e. roughly zero net debt. Absolute net debt and cash balance are not in the filing excerpt. | (XBRL screen) |
| Share count trend | Dilution metric -2.2%, i.e. share count shrinking (net buybacks exceed stock compensation). Share count itself not in the excerpt; net income / EPS implies roughly 24.5B diluted shares. | (XBRL screen; 10-K Item 7 FY Summary, arithmetic) |
| Growth | Revenue CAGR 100%, FCF CAGR 195% (multi-year, XBRL screen window not stated) | (XBRL screen) |
| Market cap | $3.60T at last close $149.30 | (XBRL screen; price pack) |

Notes and quality flags:
- Other income was 4.2% of revenue (up from 0.8%) (Item 7 results table), likely mark-to-market gains on the equity investments. Net income therefore flatters operating earnings; I use operating income and FCF instead.
- The segment table sums to $139.3B operating income versus $130.4B consolidated; the difference is unallocated costs (not itemised in the excerpt).
- Inventory provisions were $7.2B (FY2025: $3.7B), a 2.6-point margin drag (Item 7, Gross Margin).
- Off-balance-sheet-like exposure: $3.5B of land, power and shell guarantees to early-stage companies (Item 7, Recent Developments).

## Why is it cheap?
Is it cheap? Relative to its own history yes (EV/EBIT vs history 0.60, below). In absolute terms a 27.6x EV/EBIT on a peak-margin year is not cheap for a cyclical.

What the market is worried about, in plain words:
1. The AI build-out is a capex cycle. NVIDIA's revenue is other companies' spending, and the 10-K itself says data centers, energy and capital availability are "crucial" and could limit deployments (Item 7, Recent Developments). Headlines from the last week mention "five overhangs", a "penalty box" for 1-2 quarters and a bearish bet from Michael Burry; the details are not in the inputs.
2. Circularity. NVIDIA invests in AI model makers and startups that then buy its products, directly or via clouds, and it guarantees their data-center leases (Item 7). If those startups cannot raise money, demand and the investments both suffer together.
3. Concentration: two customers are 36% of revenue.
4. Competition and in-house chips from the biggest buyers.
5. China: the H20 licence cost a $4.5B charge; H200 licences exist but "we have not generated any revenue" and carry a 25% tariff (Item 7).
6. Execution on a one-year cadence with complex rack-scale products, with risk of delays, yield problems and higher warranty costs (Item 7).

My view: worries 1-3 are real and not fully answered; the excerpt gives no later-quarter data to show demand is still intact. The speed of the fall (-31% in a month, -38% from the 5-year high) looks at least partly like a sentiment and positioning unwind (the volatility is 52% a year), not a proven earnings break. I cannot tell from the inputs which it is, so I treat the discount as fair-ish until evidence arrives.

## Cyclical check (cyclical_normalized = True)
- Peak-year numbers: FCF $96.7B (44.8% margin), operating margin 60.4%.
- Normalized: the screen uses the multi-year average FCF margin of 37.5%, giving FCF of about $80.9B on FY2026 revenue (0.3747 x $215.9B; arithmetic). Normalized FCF yield is 2.25% versus 2.69% on reported.
- Normalized EV/EBIT is 34.6x versus 27.6x reported, implying normalized EBIT around $104B (EV about $3.6T / 34.6; arithmetic). That is the case I would underwrite: a roughly 20% haircut to peak earnings power.
- A harsher case is possible: the FCF margin standard deviation is 13.5 points. One standard deviation below average (about 24%) on the same revenue would be about $52B of FCF, a 1.4% yield. Revenue itself could also fall, and the history here is short and extraordinary (revenue CAGR 100%). The normalization is mild, not a downturn case.

## Disruption risk
Not a software, payments or internet name; main disruption vectors are hyperscaler custom silicon and efficiency gains or open-source models that shift workloads to rivals' platforms (Item 7, Recent Developments). Quantification is not in the filing excerpt.

## Risks (top 5, most important first)
Note: the Item 1A excerpt in the inputs actually repeats the Item 7 overview text and does not contain the enumerated risk factors. The ranking below therefore draws on the risk language in Item 7 / Item 1A excerpt, and is my judgment, not a list from Item 1A.
1. Demand cyclicality and customer financing: the AI buildout depends on customers' access to data centers, energy and capital, with weaker-capitalized customers most exposed; deployments could be delayed or shrink (Item 7, Recent Developments). With two customers at 36% of revenue, one customer pause is material.
2. Circular investments and guarantees: $17.5B of illiquid stakes in customers/startups and $3.5B of lease guarantees could be written down or called if those firms fail (Item 7).
3. Product-transition and inventory risk: annual cadence and rack-scale complexity can cause delays, yield issues, warranty costs and inventory provisions ($7.2B in FY2026) (Item 7, Inventories).
4. Export controls and tariffs: China licensing is uncertain and H200 sales may be zero; 25% tariff on licensed H200 shipments; broader tariffs affect supply cost (Item 7).
5. Competition and open-source models moving workloads to other platforms, plus supply concentration in Asia that is being diversified only gradually (Item 7).

## Valuation
- Market cap $3.60T (XBRL screen). FCF yield 2.69% reported, 2.25% normalized (XBRL screen).
- EV/EBIT 27.6x reported, 34.6x normalized. EV/EBIT versus own history is 0.60 (XBRL screen); I read that as the current multiple being about 40% below its historical level, though the screen's exact definition and window are not in the inputs.
- Composite screen score 0.67; valuation sub-score only 0.51 (mid-range), against growth 0.99 and balance sheet 0.86. The screen itself does not call this deeply cheap.
- What is priced in: at a 2.25% normalized FCF yield, the stock needs FCF to keep compounding at a high rate for years to deliver a decent return. At a 10% required return, today's price implies roughly 8% perpetual growth from normalized FCF, or a decade of strong double-digit growth; that is arithmetic, not a forecast. A 2.25% yield gives little cushion if FY2026 is near a peak.
- Momentum: 12-1 month momentum +20% in the screen, but the last month is -31%; the 3-year return of +197% shows how much already was earned.

## Thesis
- Best-in-class economics (60% operating margin, 45% FCF margin, 66% ROIC) and a net-cash-like balance sheet give staying power through a downturn.
- The full-stack system and networking position (networking +142%) is a deeper moat than the chip alone, and the annual cadence keeps pressure on rivals.
- Share count is shrinking, and the stock trades at about 0.6x its own historical EV/EBIT, so a recovery of sentiment has room if demand data hold.
- The sell-off may be sentiment: headlines show a wide split of views (negative analyst notes next to "cheapest valuation in 10 years"), suggesting capitulation risk both ways.
- Why only WATCH: the valuation is not cheap on a normalized basis, and customer concentration plus circular financing create a path to a large earnings reset.

## What breaks the thesis
Checkable signals (thresholds are my judgment, not from the filing):
- Gross margin (non-GAAP or GAAP) below about 70% for two consecutive quarters, excluding one-off charges; the FY2026 level was 71.1%.
- Quarterly Data Center revenue falling sequentially for two quarters, or guidance implying growth below about 30% year over year.
- Either top direct customer cutting orders or dropping below about 10% of revenue without replacement, or a 10-Q showing top-two concentration above 45%.
- Write-downs of the non-marketable equity investments or any call on the $3.5B guarantees in a 10-Q.
- Inventory and purchase-obligation provisions rising above about 4% of revenue, or a Rubin delay beyond management's stated schedule.
- Normalized FCF margin falling toward 30% while the multiple stays above 30x EV/EBIT.

What would move me to BUY-candidate: the latest 10-Q (period 2026-07-26) confirms growth and margins intact and the price is lower still, or the normalized FCF yield rises above about 3.5%. I have not seen the 10-Q numbers.

## Headlines (last 30 days)
Coverage is heavy and split. The stock fell sharply in the month (-31%); headlines note NVIDIA's market cap dropping below Microsoft's and an analyst listing five overhangs and a possible 1-2 quarter "penalty box" (negative, 0.7). Michael Burry is still reported as holding a bearish bet. Another concern is competition from other chips used by AI labs (Anthropic item, negative 0.6). The positive side: commentary that the valuation is the cheapest in ten years, a "Trump put" argument for growth through 2028, and a note that Jensen Huang's return (details not in the inputs) does not by itself make it a buy. Several pieces are retail-style "price prediction" articles with low information. The labels come from a fast model and are low-confidence (most 0.5-0.7). Net read: bearish tone on fundamentals worries and a bullish tone on price, with no hard new data in the inputs.

**Calibration note:** WATCH, not BUY. The inputs lack the latest 10-Q and balance-sheet detail, so the verdict can change quickly with that data.
