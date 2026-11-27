# NVDA (NVIDIA Corp): paper research memo, 2026-11-27

All numbers come from the inputs file only. Anything absent is marked "not in the filing excerpt". Filing: 10-K 0001045810-26-000021 (FY ended 2026-01-25). Latest 10-Q (0001045810-26-000075, period 2026-07-26) is listed, but no 10-Q figures are in the inputs.

## Verdict
**WATCH.** A superb business at a price that is lower than before but still 27.6x EBIT with only a 2.7% FCF yield, on peak-cycle numbers, with 36% of revenue in two customers, a -31% month that the inputs do not explain, and no 10-Q data to check whether the fiscal 2027 trend is intact.

## Business
NVIDIA sells accelerated-computing platforms: GPUs, networking (NVLink, Ethernet, InfiniBand) and full rack-scale data-center systems (Blackwell, Blackwell Ultra/GB300, Rubin next), plus gaming GPUs, professional visualization, automotive and software (AI Enterprise, Omniverse, DRIVE). It describes itself as "a data center scale AI infrastructure company" (10-K 0001045810-26-000021, Item 7 Overview).

Two reportable segments (10-K, Item 7, Reportable Segments):
- Compute & Networking: revenue $193.5B (+67%), segment operating income $130.1B. Data Center compute +59%, Data Center networking +142%.
- Graphics: revenue $22.5B (+57%), segment operating income $9.2B.

Customers are hyperscalers (CSPs), neoclouds, AI model makers, enterprises and OEM/ODM/distributor channels. Sales to customers headquartered outside the US were 31% of revenue (41% a year earlier) (10-K, Item 7, Concentration of Revenue).

## Moat
For:
- Scale of profit pool: 71.1% gross margin and 60.4% operating margin while growing revenue 65% (10-K, Item 7, FY2026 Summary). A business with weak pricing power does not hold those margins at this growth.
- Systems and networking: management says Blackwell moved the model from Hopper HGX to "full-scale datacenter solutions", and networking grew 142% (10-K, Item 7). This lock-in is at the rack level, not the chip level.
- Cadence: a one-year product cadence (Blackwell, Blackwell Ultra, Rubin) (10-K, Item 7).
- Returns: ROIC 66.0%, ROE 76.3% (XBRL screen).
- Ecosystem: the 10-K lists "expand the ecosystem for our products" as a success factor. The CUDA software lock-in is not described in the excerpts, so I rely on the margins as the evidence.

Against:
- Customers building in-house chips: "some of our customers have in-house expertise and internal development capabilities similar to some of ours and can use or develop their own solutions to replace those we are providing" (10-K, Item 1A, Competition).
- Open-source models: the 10-K warns that if open-source AI is deployed on competitors' platforms, demand for NVIDIA could fall (10-K, Item 7).
- Gross margin already fell from 75.0% to 71.1%. Part is the $4.5B H20 charge, part is the shift to full systems that carry more pass-through cost. The moat is real but is being priced into the margin.
- Competitors have fabs, larger customer bases and patent portfolios (10-K, Item 1A).

Judgment: strong moat today, evidence of erosion not yet in the numbers, but the customer base is concentrated enough that a few buyers could cap pricing.

## Numbers
Latest fiscal year (FY2026, ended 2026-01-25):

| Item | Value | Source |
|---|---|---|
| Revenue | $215.9B (+65%; prior $130.5B) | 10-K 0001045810-26-000021, Item 7; XBRL screen |
| Gross margin | 71.1% (prior 75.0%) | 10-K, Item 7 |
| Operating income | $130.4B (+60%); margin 60.4% (prior 62.4%) | 10-K, Item 7 |
| R&D / SG&A | $18.5B (+43%) / $4.6B (+31%) | 10-K, Item 7, Operating Expenses |
| Net income | $120.1B; diluted EPS $4.90 (prior $2.94) | 10-K, Item 7 |
| Free cash flow | $96.7B; FCF margin 44.8% | XBRL screen |
| FCF margin, multi-year | average 37.5%, standard deviation 13.5 pts | XBRL screen |
| Revenue CAGR / FCF CAGR | 100.5% / 195% (multi-year window not stated) | XBRL screen |
| Net debt | Roughly zero. Net debt/FCF -0.012, net debt/EBITDA -0.009 | XBRL screen |
| Share count trend | Dilution -2.2%, i.e. shares shrinking by about 2% (buybacks exceed stock compensation) | XBRL screen |
| Market cap | $3.598 trillion at last close $149.30 (2026-11-25) | XBRL screen; price pack |

Notes on quality of these numbers:
- Other income was 4.2% of revenue (vs 0.8%) and lifted pre-tax margin to 65.5% (10-K, Item 7). That is investment gains, not operations. I use operating income, not net income.
- Segment operating income totals $139.3B versus consolidated $130.4B. The $8.9B gap is presumably unallocated costs; the reconciliation is not in the filing excerpt.
- The net debt screen value looks small for a company with this much cash. I do not have the balance sheet in the excerpt, so treat "net cash, size not in the filing excerpt" as the safe reading.
- Quality of earnings flags: $17.5B invested in private companies and infrastructure funds, including AI model makers that buy NVIDIA products directly or through CSPs; $3.5B of land, power and shell guarantees to early-stage companies (10-K, Item 7). This is partly customer financing. FCF excludes the $17.5B.
- Inventory provisions were $7.2B (release $1.5B), net 2.6 pts hit to gross margin (10-K, Item 7).

## Why is it cheap?
It is not very cheap on an absolute basis. It is cheaper than it was: the stock is -31% in 1 month, -30% in 6 months, -18% in 1 year, and 38% below its 5-year high (price pack). EV/EBIT is 27.6x, which is 0.60 of its own historical level (XBRL screen: ev_ebit_vs_hist 0.5961), meaning about 40% below its usual multiple.

What the market is worried about (from the 10-K risk language and the headlines):
1. Peak earnings: FY2026 revenue +65% cannot repeat, and the cyclical flag is on. The market is capitalizing a possibly peak year.
2. The AI-spending loop: customers fund NVIDIA purchases with outside capital, and NVIDIA itself funds some of its customers (investments, guarantees). The 10-K states that "access to capital can be particularly constrained for less-capitalized companies" and that data center, energy and capital availability is "crucial".
3. Custom chips and open models from big customers.
4. China: H20 charge of $4.5B; H200 license granted in February 2026 but "we have not generated any revenue" under it and do not know if imports will be allowed (10-K, Item 7). Any China upside is not in the numbers.
5. Headlines point to some management or sentiment event ("Jensen Huang's Return", "penalty box for 1-2 quarters"). The inputs do not say what happened. I will not guess.

Is the worry right? Partly. The concentration and circular-financing worries are legitimate and checkable. The "growth stops" worry is not shown by anything in the inputs, since no FY2027 quarterly data is in the file. A 31% fall in a month with 52% annualized volatility looks like a sentiment and positioning event more than a fundamentals event, but I cannot confirm that from this file.

## Cyclical check (cyclical_normalized = True)
Screen-normalized figures:
- Normalized FCF yield 2.25% vs 2.69% on reported FCF. Implied normalized FCF about $81B (2.249% x $3.598T), against reported $96.7B.
- Normalized EV/EBIT 34.6x vs 27.6x reported. Implied normalized EBIT about $104B against reported $130.4B (3.598T / 34.6; EV roughly equals market cap given near-zero net debt).

So the normalized case takes roughly 16% off FCF and 20% off EBIT versus the peak-looking year. I consider this a reasonable but not conservative haircut. The 5-year drawdown record (-66% worst) and FCF margin standard deviation of 13.5 pts show the earnings stream is volatile. If margin reverted to the multi-year average of 37.5% on FY2026 revenue, FCF would be about $81B, matching the normalized figure. On a true downturn (revenue falling), normalized numbers would be lower still. The 10-K itself says supply/demand mismatches "significantly harmed our financial results and could reoccur".

## Disruption risk
Not a software, payments or internet name, but the equivalent risk is hyperscaler custom silicon and open-source models cutting NVIDIA's share and pricing (10-K, Item 1A and Item 7). Management's own software push (AI Enterprise, Omniverse) "may fail to sell any meaningful standalone software" (10-K, Item 1A).

## Risks
Top five, most important first, from Item 1A (excerpt covers only the first part of Item 1A: the summary, industry and demand/supply risks; export-control and legal risk text is mostly not in the excerpt):
1. **Customer concentration and counterparty risk.** One direct customer was 22% of FY2026 revenue and another 14%. An AI research company contributed a "meaningful amount" indirectly. Losing or being blocked from selling to any of these would hit revenue hard. Commercial arrangements (investments, guarantees) add counterparty risk (10-K, Item 7 Concentration; Item 1A summary).
2. **Supply-demand mismatch.** Long lead times (over 12 months), non-cancellable orders and growing purchase obligations and prepaids. If demand falls, NVIDIA may not cut commitments in time, so inventory write-downs and margin damage follow. Already $7.2B of provisions in FY2026 (10-K, Item 1A; Item 7).
3. **Competition and customer in-house chips.** Larger or fab-owning rivals, plus customers developing replacements; price or demand pressure "has resulted" before (10-K, Item 1A).
4. **Export controls and China.** H20 charge of $4.5B; H200 license with no revenue yet and a 25% tariff on import; international sales fell to 31% of revenue (10-K, Item 7). Detail of the regulatory risk factor is not in the filing excerpt.
5. **Ecosystem capacity and funding.** Data center, energy and capital may limit customers' buildouts; illiquid private investments ($17.5B) and the Groq IP license with large non-refundable payments may not earn a return (10-K, Item 7; Item 1A). Product-transition complexity (Blackwell to Rubin on a one-year cadence) can cause delays, quality issues and warranty costs.

## Valuation
- FCF yield: 2.69% reported, 2.25% normalized (XBRL screen). A 10-year Treasury-like alternative would likely yield more; the not-in-file rate is not quoted here. This is a low yield, so the thesis depends on strong growth continuing.
- EV/EBIT: 27.6x reported, 34.6x normalized; the current multiple is 0.60x its own history (XBRL screen). The discount to history is genuine, but history was set during a higher-growth, higher-margin phase.
- What is priced in: at 2.25% normalized yield, FCF must grow roughly 2.5x or more over the next decade-plus period for a mid-single-digit holder return from yield plus growth, with no multiple compression (my arithmetic, rough). In other words, the price assumes the AI buildout continues for years with margins near 60% operating. It does not price a bust, but it also does not offer a margin of safety.
- Screen scores: valuation 0.53, momentum 0.54, dilution 0.43, growth 0.99, balance 0.93, quality 0.73, composite 0.69. Valuation is middling, not cheap.

## Thesis
For a long-only, cash-account, long-term holding, the case if one buys:
- Best-in-class profitability (60% operating margin, 45% FCF margin, ROIC 66%) with net cash-like balance sheet and shrinking share count.
- The stock has de-rated to 0.6x its own EV/EBIT history after a 31% monthly fall; a buyer is paying less for the same franchise.
- Product cadence (Blackwell Ultra, Rubin) and networking growth (+142%) suggest the platform is widening, not narrowing.
- Optional upside not in the numbers: H200/China revenue (zero so far).

Why that is not enough for BUY-candidate today: the normalized yield is 2.25%, the quarterly trend after January 2026 is not in my file, and the sharp fall has an unexplained cause. WATCH, with a defined list of what would change it.

## What breaks the thesis
Checkable signals (thresholds are my judgment, not in the filings):
1. Gross margin below about 68% for two consecutive quarters (ex any one-off charge); FY2026 was 71.1%.
2. Either top direct customer exceeding about 25% of revenue, or a top-customer share decline that coincides with a revenue miss.
3. Data Center revenue down sequentially for two quarters, or inventory provisions above about $7.2B (the FY2026 level) in a single year.
4. Further growth in investments and guarantees to customers beyond the $17.5B and $3.5B disclosed in FY2026, or an impairment on these.
5. Operating margin below about 55%, or normalized FCF falling under about $70B.

What would move this to BUY-candidate: confirmation from the latest 10-Q that revenue and margin are intact, a price near or below normalized levels of about 20x EBIT, or a normalized FCF yield at or above 4%.

## If AI data-centre capex falls 30% next year
- Exposed: Compute & Networking $193.5B = 89.6% of FY2026 revenue (10-K, Item 7). A Data Center-only split is not in the filing excerpt, so I use the segment as a proxy. Two direct customers are 36% of revenue.
- Revenue: 0.30 x $193.5B = -$58.0B, about -27% of total, leaving about $157.9B.
- Margin (my assumption: 71.1% gross margin on lost sales; opex of $23.1B fixed): gross profit -$41.2B, operating income $130.4B to about $89.2B, margin about 56% (from 60.4%). Inventory and purchase-commitment charges would come on top; their size is not in the filing excerpt.
- FCF: FY2026 FCF was 74% of operating income ($96.7B / $130.4B), so about $66B. It stays strongly positive; FCF would not turn negative on this arithmetic. Working-capital swings are not in the excerpt.

## Headlines (last 30 days)
Sentiment is negative to mixed. The set mostly reports on the sharp decline ("dropped 31% in a month", "down 36% to 39% from their highs") and on Jensen Huang's "return", with analysts saying it does not make NVDA a buy and one flagging "5 major risks" and a possible "penalty box for 1-2 quarters". ETFs were net sellers on Nov 24 and a CNBC piece highlights single-stock ETF risk from volatile swings. Positive items are price predictions (Motley Fool, a $620 call from an AI-generated forecast) of little evidential value. Several items are just price quote pages. None of the headlines in the file gives a hard fundamental datum (no revenue, guidance or margin figures), so they do not change my view beyond confirming heavy selling pressure and uncertainty.

NVDA WATCH
