# PAPER fund launch: portfolio decision (research test; the owner places real orders by hand)

## Mandate (hard rules, re-checked in code)
- Core 60%: one S&P 500 ETF, bought in 3 weekly tranches from the week of 2026-11-30. You do not choose it (code picks the lowest
  expense ratio of SPYM 0.02%, VOO 0.03%, IVV 0.03%).
- Satellite up to 40%: choose 0 to 8 of the 12 finalists below, ONLY names you can stand behind with a written thesis.
  Never force picks: every unfilled slot stays in the core ETF. Each name at most 8%. Weights sum to at most 40.
- At most 20% in one industry group; energy (oil, refining, pipelines, oilfield equipment) counts as ONE group, semis/memory as ONE.
- At most ONE refiner (PSX, MPC). At most 2 energy names in total.
- AI hardware (MU, LRCX, NVDA and any name with > 30% of revenue from data-centre/cloud/AI customers, incl. JBL and FLEX):
  at most 2 names and at most 12% of the whole fund together; at most 1 of JBL/FLEX; a name with negative FCF is not eligible.
  The core ETF already carries heavy AI/mega-cap exposure, and the AI leaders are in a sharp drawdown. These positions are
  bought in 3 weekly tranches like the core. Mark each holding "ai_hardware": true/false.
- A holding is sold when its thesis breaks, not on price alone. So each holding needs a thesis and concrete, checkable "breaks" signals.
- Benchmark: S&P 500 total return. The satellite is folded into the core if it trails the S&P 500 over any rolling 12 months,
  so pick names you expect to beat the index, not just to be good companies.

## Screen rows (percentile scores 0-1; cyclicals on normalized numbers)
ticker,group,composite,s_quality,s_growth,s_balance,s_valuation,s_momentum,mom_12_1,fcf_yield_used,ev_ebit_used,cyclical_normalized
JBL,SIC 36,0.696,0.753,0.53,0.645,0.436,0.809,0.438,0.05,14.18,True
MU,semis/memory,0.692,0.54,1.0,0.928,0.477,1.0,3.152,0.005,28.19,True
LRCX,semis/memory,0.686,0.766,0.56,0.928,0.214,0.889,0.609,0.027,31.43,True
NVDA,semis/memory,0.686,0.732,0.991,0.928,0.528,0.543,0.197,0.022,34.6,True
ROST,SIC 56,0.673,0.742,0.711,0.928,0.324,0.683,0.332,0.031,25.39,False
ADBE,SIC 73,0.661,0.8,0.677,0.85,0.923,0.08,-0.221,0.109,10.5,False
AAPL,SIC 35,0.649,0.864,0.606,0.78,0.359,0.603,0.261,0.026,33.02,False
BBY,SIC 57,0.644,0.726,0.378,0.928,0.418,0.749,0.372,0.058,15.08,False
MA,SIC 73,0.641,0.81,0.778,0.725,0.405,0.482,0.141,0.029,32.14,False
LMT,SIC 37,0.639,0.793,0.462,0.405,0.494,0.789,0.417,0.05,20.49,False
MCK,SIC 51,0.636,0.71,0.678,0.705,0.51,0.407,0.116,0.046,20.64,False
FLEX,SIC 36,0.636,0.569,0.565,0.605,0.246,0.829,0.464,0.034,23.15,True

## 1-year daily-return correlations (with SPY)
,JBL,MU,LRCX,NVDA,ROST,ADBE,AAPL,BBY,MA,LMT,MCK,FLEX,SPY
JBL,1.0,0.6,0.73,0.49,0.13,-0.33,0.02,-0.07,-0.12,0.02,-0.14,0.8,0.61
MU,0.6,1.0,0.81,0.52,0.04,-0.26,-0.02,-0.07,-0.19,-0.01,-0.25,0.6,0.59
LRCX,0.73,0.81,1.0,0.55,0.17,-0.34,0.0,-0.05,-0.15,0.02,-0.21,0.71,0.68
NVDA,0.49,0.52,0.55,1.0,0.08,-0.04,0.1,-0.09,-0.05,-0.02,-0.16,0.47,0.69
ROST,0.13,0.04,0.17,0.08,1.0,0.08,0.31,0.24,0.15,0.08,0.17,0.06,0.35
ADBE,-0.33,-0.26,-0.34,-0.04,0.08,1.0,0.2,0.18,0.39,0.02,0.08,-0.29,0.08
AAPL,0.02,-0.02,0.0,0.1,0.31,0.2,1.0,0.23,0.2,-0.09,0.13,-0.02,0.34
BBY,-0.07,-0.07,-0.05,-0.09,0.24,0.18,0.23,1.0,0.21,0.03,0.08,-0.05,0.19
MA,-0.12,-0.19,-0.15,-0.05,0.15,0.39,0.2,0.21,1.0,0.1,0.22,-0.19,0.19
LMT,0.02,-0.01,0.02,-0.02,0.08,0.02,-0.09,0.03,0.1,1.0,0.08,0.04,0.04
MCK,-0.14,-0.25,-0.21,-0.16,0.17,0.08,0.13,0.08,0.22,0.08,1.0,-0.27,-0.09
FLEX,0.8,0.6,0.71,0.47,0.06,-0.29,-0.02,-0.05,-0.19,0.04,-0.27,1.0,0.57
SPY,0.61,0.59,0.68,0.69,0.35,0.08,0.34,0.19,0.19,0.04,-0.09,0.57,1.0

## Condensed memos (Sonnet drafts from the 10-K, XBRL and 30 days of headlines)
### JBL
# JBL (Jabil Inc) - PM brief, 2026-11-27

## Verdict
WATCH. Good operator, fair-not-cheap price for a cyclical, FCF probably flattered by payables timing, and AI concentration is rising. Revisit at lower prices or after cleaner cash flow.

## What it is
Contract manufacturer and supply-chain services company (turnkey, so mostly pass-through materials). FY2026 (to 2026-08-31) revenue mix: Intelligent Infrastructure 50% (AI/cloud/networking, +45% y/y), Regulated Industries 35% (auto, health, energy, +7%), Connected Living and Digital Commerce 15% (-4%) (10-K 0001628280-26-067038, Item 7). Mix was 32% / 42% / 26% in FY24.

## Key numbers (FY26)
- Revenue $35,954M, +20.6% (FY25 $29,802M; FY24 $28,883M) (10-K, Item 7).
- Gross margin 9.2%; operating income $1,704M, margin 4.7% (FY24 was $2,013M, 7.0%) (10-K, Item 7).
- Diluted EPS $9.75 (FY25 $5.92; FY24 $11.17) (10-K, Item 7).
- FCF $1,374M, 3.8% margin; five-year average margin 3.25% (XBRL screen).
- Net debt about $2.1B (derived), 0.9x EBITDA, 1.6x FCF (XBRL screen). Cash and gross debt: not in the filing excerpt.
- Shares: screen shows -21% dilution (a shrinking count) over an unstated window; about 103M shares implied (XBRL screen, derived).
- ROIC 35.9%, ROE 64.6% (XBRL screen).
- Market cap $23.5B; price $228.14; 6-month -37%, 1-month -19%, 50% volatility, -41% from the 5-year high.

## Cash-flow quality flag
Q4 payables days 135 vs 96 a year earlier; sales cycle 2 days vs 18; inventory days 82 vs 69 (10-K, Item 7, KPIs). The filing attributes the payables rise to timing in Intelligent Infrastructure. A reversal would cut FCF materially, so treat $1.37B as the upper end.

## Why it is cheap (or is not)
The stock fell on AI-capex-digestion worry, thin margins, and a sentiment reset after a 5-year run. The worry is partly right: half of revenue and nearly all the growth sit in a few AI infrastructure programs whose customers can cancel on a one-quarter horizon (Item 1A). But EV/EBIT is 15.0x (14.2x normalized), still 39% above its own history (XBRL screen), and P/E is about 23x. It looks cheap only against the peak.

## Valuation (cyclical, so normalized)
FCF yield 5.85% reported, 4.98% normalized (about $1.17B FCF). If payables unwind and margins revert, a yield near 3.8% is plausible (illustration). Priced in: durable AI growth and margins above the historical band. Valuation sub-score 0.44; quality 0.75; overall composite 0.70.

## Top risks
1. Short-horizon customer orders and cancellations, with fixed costs.
2. Customer and end-market concentration in AI.
3. Component shortages (memory) and price changes between repricings.
4. Ramp-up and growth strain on cash flow.
5. Credit and technology risk with newer customers.

## Thesis (what would make it a BUY-candidate)
- AI programs prove repeatable and keep gross margin at or above 9.2%.
- Buybacks continue with leverage at or below about 1x EBITDA.
- Regulated Industries gives a partial cycle buffer.
- Entry nearer 11-12x normalized EBIT or a normalized FCF yield above 6%.

## What breaks the thesis
1. Gross margin below 8.5% for two quarters.
2. Intelligent Infrastructure revenue down y/y in any quarter.
3. Payables days back near 100 with sales cycle above 15 days; FY27 FCF below $1.0B.
4. Operating margin back below 4.0%.
5. Inventory days above 90 with write-downs, or the loss of a top-customer program.

## If AI data-centre capex falls 30% next year
- Exposure: Intelligent Infrastructure is 50% of revenue, 0.50 x $35,954M = about $17,977M (10-K, Item 7). Cloud/data-centre alone is not sized in the excerpt, but it drove 33 of the segment's 45 points of growth. Is more than 30% of revenue tied to data-centre/cloud/AI? Probably yes, but not provable from the excerpt; 50% is the upper bound. Customer percentages: not in the filing excerpt.
- Revenue (upper bound): -0.30 x $17,977M = -$5,393M, -15.0% of total, leaving about $30.6B.
- Margin: 9.2% gross margin gives -$496M; an assumed 15% decremental margin gives -$809M. Operating income falls from $1,704M to about $1,208M-$895M; margin 3.9%-2.9%.
- FCF: roughly $0.7-1.0B before working capital, so positive on earnings alone. A payables unwind not offset by lower receivables and inventory could push one year negative.

## Headlines (30 days)
Baird cut its target to $270 from $440 (negative). Valuation screens from Yahoo and GuruFocus call it undervalued, and a MarketBeat piece cites a stale $418 average target. An India AI MoU has no financial detail. The 2026-11-26 JBL Charge speaker item is unrelated. No fundamental shock; the drop looks like a sentiment unwind.

### MU
# MU brief for the portfolio manager (2026-11-27)

**Verdict: WATCH.** Cheap on peak numbers (6.5x EV/EBIT, 8.7% FCF yield), expensive on normalized ones (28.2x EV/EBIT, 0.5% FCF yield). FY2026 is a cycle peak. The new take-or-pay contracts may raise the floor, but this is unproven.

## Key numbers (FY ended 2026-09-03, 53 weeks)
- Revenue $133.2B, up 256% (FY2025 $37.4B). Almost all of it is price: DRAM and NAND average selling prices up about 180% to 200%, bits up mid-20% (10-K 0000723125-26-000023, Item 7).
- Gross margin 81% (FY2025 40%, FY2024 22%). Operating income $99.3B, 75% margin. Net income $85.0B (Item 7).
- FCF $59.0B, 44.3% margin. Multi-year average FCF margin is 2.5% (XBRL screen).
- Net cash about $33B, net debt/EBITDA -0.30 (XBRL screen). Share count not in the filing excerpt; dilution 4.6% a year (XBRL screen).
- ROIC 74.6%, ROE 61.4% (XBRL screen), both peak-year figures.
- Price $601.25. Market cap about $680B. 1m -35%, 1y +169%, drawdown -50% from the 5y high, volatility 87% a year.

## Why it is cheap
The market treats FY2026 as non-recurring. Memory prices rose 180% to 200% in a year, and the 10-K says annual price changes have ranged from +200% to -50% over five years. The last two days brought a TrendForce cut to its DRAM price forecast, an analyst supply-glut warning, a UBS target cut, a BNP Paribas downgrade, new tariffs and a headline about higher spending. I think the worry is mostly right. Strategic agreements started only in Q3 and Q4 FY2026, most have price bands, and the share of volume they cover is not in the excerpt.

## Cyclical view
Normalized FCF is about $3.3B (0.48% yield) and normalized EBIT about $23B (28.2x EV/EBIT), both my arithmetic from the XBRL screen. At FY2025 EBIT of $9.8B, EV/EBIT would be about 66x. The screen's averaging is conservative if the contracts truly lift the floor.

## Moat
An oligopoly with high capital needs and strong peak returns, but the product is a commodity and the margin was only 5% operating in FY2024. Take-or-pay contracts are the one structural change, and management claims floor margins above any past peak. That is a claim, not a result.

## Top risks
1. Price collapse with a largely fixed cost base.
2. AI demand overbuild and rising capex across the industry.
3. Demand destruction and new entrants because of high prices.
4. Geopolitics and tariffs (Taiwan, Singapore, Japan, Malaysia, China, India).
5. Node and capacity execution, plus Singapore tax change.

## Thesis (needs all four)
- Strategic agreements cover a large share of volume with floors that keep gross margin well above 40% in a downturn.
- AI memory demand outgrows supply for several more quarters.
- Operating income stays above about $40B a year (about 16x EV/EBIT).
- Cash generation funds capex and returns with no more dilution.

## What breaks the thesis
- Quarterly gross margin below 60% for two quarters.
- Capex or capacity guidance rising while industry supply growth exceeds demand growth.
- DRAM or NAND contract prices down two consecutive months (TrendForce), or a contract renegotiated at its floor.
- Strategic agreements disclosed as under about one-third of volume.
- FCF margin below 25% for two quarters, or share count growth above 5% a year.
- Tariff or export rules cutting shipments to a major region.

## If AI data-centre capex falls 30% next year
Customer concentration: not in the filing excerpt. Segment data: CMBU plus CDBU are $80.7B, 60% of FY2026 revenue (Item 7), treated as the exposed share.
- Base case: 30% x $80.7B = about $24.2B lost (18% of revenue). COGS ($25.7B) is largely fixed, so gross margin falls from 81% to about 76% and operating income to about $75B.
- Harsh case (prices fall twice as hard): about $48.4B lost, gross margin about 70%, operating income about $51B.
- FCF: capex not in the excerpt, assumed unchanged. Base about $38B, harsh about $18B ($59.0B less lost revenue x (1 - 14.8% tax)). FCF stays positive.
- Caveat: margins stay near peak in this math, so a larger price drop is the real risk.

## Headlines
15 headlines on 2026-11-24 and 11-25, 11 labelled negative. Positive items are opinion pieces (Tepper holding, price predictions, a buy-before-earnings call). Next checkpoint: earnings on 17 December.

## Sizing note
Volatility of 87% and a 58% worst drawdown mean any position should be sized well below the 8% cap until the contract coverage is known.

MU WATCH

### LRCX
# LRCX brief for the portfolio manager (2026-11-27)

## Verdict
WATCH: top-quality cyclical equipment maker, but still 28x EBIT and a 2.1% FCF yield (2.7% normalized) after a 42% six-month fall. Not a BUY-candidate until the price or the cash conversion improves.

## Key numbers (FY ended 2026-06-28; 10-K 0000707549-26-000037, Item 7, and XBRL screen)
- Revenue $23.23B (+26.0%). Systems $14.89B (+29.5%); customer support $8.35B (+20.2%).
- Gross margin 50.5% (+180 bps). Operating income about $8.2B, margin about 35% (derived).
- Net income $7.27B; diluted EPS $5.76 (+38.8%).
- FCF $4.89B, margin 21.05% (average 26.45%); OCF $5.86B, capex $966M. FCF CAGR 1.5% vs revenue CAGR 10.0%.
- Net cash about $1.8B (derived from net debt/FCF of -0.37). Share count falling (dilution -7.2%).
- Returned $5.12B (buybacks $3.85B, dividends $1.27B), more than FCF.
- Mix: Foundry 54%, Memory 39%, Logic/IDM 7%. China 34% of revenue.
- Price 185.01; 1m -23%, 6m -42%, 1y +24%; volatility 71%; drawdown from 5y high -57%. Market cap $231B.

## Valuation
EV/EBIT 28.0x (normalized 31.4x), 1.33x its own history (implied history about 21x). FCF yield 2.1% (normalized 2.7%). Trailing P/E about 32x. Valuation score 0.21 of 1; quality and balance sheet scores are high. Cyclical flag is True: the normalized case is not cheaper on EBIT.

## Why it is cheap (it is only cheaper)
The market fears an AI-capex peak, China curbs (34% of revenue) and Street estimate cuts. The 2026-11-25 fall of about 10% came with a wider tech and chip-equipment selloff. I think the fears are partly right: equipment demand follows capex and is cyclical. The fall reset a rich multiple but not below normal.

## Moat in one paragraph
Installed-base lock-in on qualified production lines, a growing service base, and scale in R&D ($2.38B) support high margins. Weaknesses: China competitors, state-backed rivals, export-control asymmetry, and AI changing process development (Item 1A).

## Top risks
1. Capex cycle downturn. 2. China and export controls. 3. Customer concentration and competition. 4. Technology and AI shifts. 5. Valuation leaves no room for estimate cuts (Item 1A excerpt was cut off; later risks not in the filing excerpt).

## Thesis if it becomes a candidate
- Leader in deposition and etch for 3D scaling and advanced packaging.
- Net cash, 35% operating margin, large capital return.
- AI-driven fab spending is rising across memory and non-memory.
- A further 20-25% fall would reach its own historical EV/EBIT.
- Size small, well below the 8% cap, given 71% volatility.

## What breaks the thesis
- Gross margin below 48% for 2 quarters.
- Sequential revenue decline over 15% in a quarter.
- China share above 40% or a new export rule hitting a major customer.
- Deferred revenue below $2.0B (now $2.43B).
- Trailing FCF below $4B, or payouts above FCF for a second year.

## Headlines
The 2026-11-25 selloff dominates (negative 0.7-0.8). The following day brought mild positive and neutral pieces ("oversold", "cheaper, not cheap", memory makers spending again). No company-specific news such as guidance or orders appears in the inputs.

## If AI data-centre capex falls 30% next year
Not in the excerpt: AI share of revenue and customer concentration. Proxy: systems revenue $14.89B is 64% of $23.23B (10-K, Item 7); support $8.35B is steadier. Worst case, the 30% cut hits all systems revenue.
- Revenue: 14.885 x 30% = -$4.47B (-19.2%), to about $18.77B.
- Gross profit: -4.47 x 50.5% = -$2.26B; opex $3.53B flat, so operating income about $5.94B, margin about 31.6% (from 35.3%).
- FCF: -2.26 x (1 - 12.1% tax) = about -$2.0B, leaving about $2.9B (1.3% yield). Not negative, but well short of the $5.12B FY26 payouts.
Rough upper bound; working capital not modelled.

### NVDA
# NVDA brief for the portfolio manager (2026-11-27)

## Verdict
**WATCH.** Exceptional business, but 27.6x EBIT (34.6x normalized) and a 2.25% normalized FCF yield leave no margin of safety. The latest 10-Q figures are not in my inputs and the cause of the -31% month is unexplained.

## What it is
Accelerated-computing and AI infrastructure: GPUs, networking and full rack-scale systems (Blackwell, Rubin next). Segments: Compute & Networking $193.5B revenue (+67%), Graphics $22.5B (+57%) (10-K 0001045810-26-000021, Item 7).

## Key numbers (FY ended 2026-01-25)
- Revenue $215.9B, +65%. Operating income $130.4B (60.4% margin). Gross margin 71.1% (was 75.0%). EPS $4.90 (10-K, Item 7).
- FCF $96.7B, 44.8% margin; multi-year average FCF margin 37.5% (XBRL screen).
- Net debt about zero (net debt/FCF -0.012); shares shrinking about 2% a year (XBRL screen).
- Market cap $3.6T at $149.30. FCF yield 2.69% (2.25% normalized). EV/EBIT 27.6x (34.6x normalized), 0.60x its own history (XBRL screen).
- ROIC 66%, ROE 76% (XBRL screen).
- Price: 1m -31%, 6m -30%, 1y -18%, volatility 52%, 5-year worst drawdown -66%.
- Quality flags: other income 4.2% of revenue lifted pre-tax margin; $17.5B invested in private companies including customers; $3.5B guarantees; $7.2B inventory provisions (10-K, Item 7).

## Moat
Strong: margins at this growth, rack-level systems and networking (+142%), one-year cadence. Weakness: customers' in-house chips, open-source models, and gross margin already down 3.9 pts.

## Why it is cheaper
It de-rated to about 40% below its historical EV/EBIT, but it is not cheap in absolute terms. Worries: peak-year earnings (cyclical flag on), customer concentration (22% and 14% of revenue), circular AI funding, custom chips, China (H200 license, zero revenue so far). Concentration and circular funding are legitimate worries. A growth collapse is not shown in the inputs.

## Cyclical view
Normalized FCF about $81B and EBIT about $104B (roughly -16% and -20% vs reported). A real downturn could be worse; the 10-K says supply-demand mismatches "significantly harmed" results before.

## Top risks
1. Customer concentration and counterparty exposure.
2. Supply-demand mismatch with non-cancellable commitments.
3. Competition and customer-built chips.
4. Export controls and China.
5. Funding and energy limits on customers' buildouts; low-return investments (Groq license, private stakes).

## Thesis (what a buyer believes)
- 60% operating margin, 66% ROIC, net-cash-like balance sheet, buybacks.
- Stock at 0.6x its own multiple history after a 31% fall.
- Platform widening: networking, Blackwell Ultra, Rubin.
- Free option on China H200 revenue.

## What breaks the thesis (my thresholds)
1. Gross margin below about 68% for two quarters.
2. A top customer above about 25% of revenue, or a loss of one.
3. Data Center revenue down sequentially two quarters, or inventory provisions above $7.2B a year.
4. More customer investments and guarantees than $17.5B and $3.5B, or an impairment.
5. Operating margin below about 55%, or normalized FCF below about $70B.

Upgrade trigger: the latest 10-Q confirms revenue and margins, and either price near 20x EBIT or normalized FCF yield at or above 4%.

## If AI data-centre capex falls 30% next year
- Exposed: Compute & Networking $193.5B = 89.6% of FY2026 revenue (10-K, Item 7). A Data Center-only split is not in the filing excerpt, so I use the segment as a proxy. Two direct customers are 36% of revenue.
- Revenue: 0.30 x $193.5B = -$58.0B, about -27% of total, leaving about $157.9B.
- Margin (my assumption: 71.1% gross margin on lost sales; opex of $23.1B fixed): gross profit -$41.2B, operating income $130.4B to about $89.2B, margin about 56% (from 60.4%). Inventory and purchase-commitment charges would come on top; their size is not in the filing excerpt.
- FCF: FY2026 FCF was 74% of operating income ($96.7B / $130.4B), so about $66B. It stays strongly positive; FCF would not turn negative on this arithmetic. Working-capital swings are not in the excerpt.

## Headlines (30 days)
Sentiment negative to mixed: sharp sell-off coverage, analysts saying the CEO's "return" is not a buy signal, one flagging five risks and a possible "penalty box for 1-2 quarters", ETF net selling. Bullish items are price predictions with little evidence. No headline in the file carries hard fundamental data.

NVDA WATCH

### ROST
# ROST (Ross Stores): PM brief, 2026-11-27

## Verdict
WATCH. High-quality, net-cash off-price retailer, but 25x EV/EBIT and a 3.1% FCF yield already price in the quality. No margin of safety in the file.

## Business
Largest US off-price apparel and home chain: Ross Dress for Less (1,904 stores) and dd's DISCOUNTS (363), 2,267 stores in total. Brand-name goods at 20-60% off department store prices; stores only, no e-commerce. About 110 new stores planned for 2026 (10-K 0000745732-26-000006, Item 7).

## Key numbers (fiscal 2025, year ended 2026-01-31)
- Revenue $22,751M, up 8%; comparable sales +5% (3% basket, 2% traffic) (10-K, Item 7).
- Operating income $2,707M, 11.9% margin (12.2% a year earlier, which included a $61.6M warehouse gain); EPS $6.61, up 5%; tariffs cost about $0.16 per share (10-K, Item 7).
- FCF $2,208M, a 9.7% margin versus a 7.9% average; it was helped by payables timing (XBRL screen; Item 7).
- Net cash: $4.6B cash against $1.5B of notes (10-K, Item 7). Net debt/EBITDA -0.80 (XBRL screen). Leases of $3.9B are separate.
- Diluted shares down about 2% a year; $1.05B buybacks; new $2.55B program (10-K, Item 7).
- ROIC 59%, ROE 35% (XBRL screen). Fiscal 2026 capex about $1.1B versus $819M, which pressures FCF.

## Why is it cheap?
It is not. The valuation sub-score is 0.32. EV/EBIT is 25.4x, 1.29 times its own history; FCF yield is 3.1% (2.5% normalized); the stock is up 29% in a year and 12% off its high (XBRL screen; price stats). Worries are tariffs (over half of goods from China), a stretched low-income consumer and distribution-center costs. They are real but modest. The price already assumes they stay modest.

## Moat
Scale in buying and opportunistic closeout purchasing, shown by high returns and stable 11-12% margins. But the 10-K admits entry barriers are low, and supply depends on vendors. A real but operational moat.

## Top risks
1. Tariffs and trade policy (China). 2. Consumer weakness. 3. Closeout supply. 4. Low-barrier competition and AI. 5. Expansion and distribution-center execution.

## Valuation
FCF yield 3.1% (2.5% normalized); EV/EBIT 25.4x versus a higher-than-history multiple. The price assumes about 7-8% growth with margins near 12%. Expected return is a low double-digit number at best, with a worst 5-year drawdown of 38%.

## Thesis
- Steady compounder: revenue CAGR 6.7%, high ROIC.
- Net cash, no solvency risk.
- About 5% unit growth plus comps supports high-single-digit sales growth.
- Buybacks and a rising dividend.
- Margin guided slightly higher in fiscal 2026.
Would turn into a buy at a better entry: high-teens EV/EBIT or a 4%+ FCF yield.

## What breaks the thesis
- Operating margin below 11.0% for two quarters.
- Comparable sales negative for two quarters.
- Merchandise margin down more than 50 bps.
- Inventory outgrowing sales, or packaway above 45% with markdowns.
- FCF margin below 7% as capex rises.

## Headlines
Mixed. A full-year guidance raise (positive) and a Burlington read-across lifted the stock. Analyst fair-value items are mixed. Two executives sold small amounts (about $697K, and 3,083 shares at $226.27). The 1-month return is -3%. Q3 details are not in the filing excerpt.

### ADBE
# ADBE (Adobe Inc.): brief for the portfolio manager, 2026-11-27

## Verdict
**BUY-candidate (starter size, 2-3% suggested, cap is 8%).** The price implies a shrinking business, but fiscal 2025 shows 11% growth, 41% FCF margin and 55% ROIC. The real risk is generative AI eroding the franchise; the 10-K says so itself. Latest 10-Q (period 2026-08-28) is not in the excerpt, so fiscal 2026 trends are not verified.

## What it is
Subscription software (96% of revenue). Digital Media $17.65B (74%, +11%: Creative Cloud, Acrobat, Express, Firefly), Digital Experience $5.86B (25%, +9%: marketing and analytics platform), and a legacy Publishing and Advertising segment of $0.26B (10-K 0000796343-26-000003, Item 7). Total ARR $25.20B, +11.5%; RPO $22.52B, +13%.

## Key numbers (fiscal year ended 2025-11-28)
- Revenue $23,769M, +11% (10-K, Item 7; XBRL screen).
- Operating income: not stated in the excerpt; derived about $8.7B, about 37% margin (my arithmetic from revenue, cost of revenue and operating expenses; consistent with EV/EBIT of 10.5).
- Net income $7.13B, +28%; operating cash flow $10.03B, +25% (10-K, Item 7).
- FCF $9,852M, margin 41.5%, average 39.0%, std 2.8 points (XBRL screen).
- Net debt about $0.8B (net debt/FCF 0.079, derived); effectively debt-free (XBRL screen).
- Share count shrinking: dilution -9.3% (XBRL screen). Absolute count: not in the filing excerpt.
- ROIC 55.5%, ROE 61.3% (XBRL screen).
- Price $232.83 (2026-11-25); market cap $90.6B; 1-year -27%, 3-year -62%, drawdown from 5-year high -66%; volatility 42%.

## Valuation
FCF yield 10.9% (normalized 10.2%); EV/EBIT 10.5 (normalized 11.2); ev_ebit_vs_hist 0.31, meaning far below its own history (exact definition not in the excerpt) (XBRL screen). Not cyclical, so no normalization beyond that. A 10% FCF yield prices near-zero long-term growth. Illustration (mine): FCF growing 3-5% at an unchanged multiple gives roughly 13-15% a year; FCF shrinking 5% a year for a decade still gives roughly 5% a year.

## Why is it cheap?
Fear that AI makes creative and PDF tools cheaper or free, shrinks the number of designers and marketers who buy seats, and that AI inference costs eat margins. Momentum score is 0.08 against a valuation score of 0.92. My view: the worry is about long-run value, not current earnings (ARR, RPO, revenue and margins all still rising), so pricing looks too harsh, though not absurdly so. Proof is needed from fiscal 2026 ARR growth.

## Moat
Real today: high ROIC, stable cash margins, workflow lock-in across products. Contested tomorrow: the 10-K cites AI and cloud-native rivals, low barriers to entry and price-sensitive customers. Wide but contested.

## Disruption risk
High: generative and agentic AI could displace tool-based creation and document workflows (10-K, Item 1A).

## Top risks
1. AI competition and failure to innovate. 2. Pricing pressure from low entry barriers. 3. AI compute cost and access to third-party models. 4. AI regulation, IP and training-data liability (EU AI Act). 5. Brand backlash and M&A execution (the $1B Figma termination fee in fiscal 2024).

## Thesis
- Cash machine at a distressed price: 41% FCF margin, almost no net debt, 10-11% FCF yield.
- Growth intact: ARR +11.5%, RPO +13%, flat opex, so operating leverage.
- Shrinking share count (about 9%) funded by FCF.
- Asymmetric: little growth priced in; modest AI success gives upside.
- Embedded, high-switching-cost products that are adding AI.

## What breaks the thesis
1. Total ARR growth below 8% at fiscal 2026 year end, or two quarters of deceleration.
2. Digital Media ARR growth under 8% or falling net new ARR.
3. FCF margin below 35% for two quarters, or cost of subscription revenue growing over 15% without revenue acceleration.
4. Share count stops shrinking, or a large acquisition (over about 10% of market cap) replaces buybacks.
5. RPO growth below revenue growth for two quarters.

## Headlines (30 days)
Mostly earnings previews and price commentary, neutral in tone, with some bearish chart notes and some positive AI-upside pieces. No new fundamental event in the labels; 1-month return -6%. Earnings are close, so near-term event risk is high. Low-grade sources; little weight.

## Gaps
Not in the file: the operating income line, cash and debt balances, absolute share count, fiscal 2026 results, competitor data, and risks beyond the first 14,000 characters of Item 1A.

ADBE BUY-candidate

### AAPL
# AAPL brief for the PM (2026-11-27)

**Verdict: WATCH.** Superb business, fully priced. 33x EV/EBIT, 2.6% FCF yield, stock at 5-year high; FY2026 flattered by one-offs.

## Key numbers (FY to 2026-09-26; 10-K 0000320193-26-000026, XBRL screen)
- Revenue $478.8B, +15% (3-yr CAGR 7.7%). iPhone $254.1B +21%, Services $123.3B +13%, Greater China +28%.
- Gross margin 48.8% (46.9% prior). Services GM 76.2%.
- Operating income about $158B (derived: gross margin $233.6B less opex $75.5B), 33% margin. R&D +32% to $45.8B.
- FCF $136.1B, 28.4% margin, 11% CAGR.
- Net debt: screen says about $52B (0.38x FCF); 10-K excerpt implies net cash about $56B ($136.9B cash and securities vs $80.7B debt). Not reconciled; immaterial either way.
- Returned $101.5B in FY2026 ($85.8B buybacks, $15.7B dividends); new $100B authorization. Shares shrinking (-6.9% per screen).
- Market cap $5.17T; FCF yield 2.63% (norm 2.46%); EV/EBIT 33.0, 1.13x own history.
- Price: +29% 1y, +88% 3y, vol 25%, worst 5y drawdown -33%.

## Why it is not cheap, and what to watch
No cheapness: the market pays for the iPhone cycle, Services and a defensive AI-era image. FY2026 includes tariff refunds in product cost of sales (size not in excerpt), an iPhone +21% cycle spike and a China snap-back. Management guides gross margin to "volatility and downward pressure" and expects memory and storage costs to worsen. Disruption: AI agents could erode device and App Store pull; Apple spends more (R&D +32%) while behind frontier model vendors.

## Top risks
1. Tariffs and concentrated Asian supply chain. 2. Memory and chip cost squeeze on margin. 3. Competition and AI investment returns. 4. Regulation hitting Services. 5. Macro and geopolitical shocks.

## Thesis (conditional)
- Services mix lifts margin; low-teens growth.
- iPhone Pro cycle and China sustain mid-to-high single digit growth.
- 75% of FCF returned, share count falling.
- No balance-sheet risk.
- Would turn BUY-candidate near a 3.5% FCF yield (about 25% lower price at current FCF).

## What breaks the thesis
- Gross margin below 46% for 2 quarters.
- Services growth below 8% for 2 quarters.
- iPhone revenue down year on year after the iPhone 18 launch.
- Greater China back to decline.
- New semiconductor tariffs or lost refunds; regulatory ruling cutting App Store revenue.
- R&D growth again well above sales growth with no AI revenue.

## Headlines (30 days)
Positive tone, near-record price, "spared by AI sell-off", Apple AI-agent push; small negatives (exec sale of about $19M, App Store pulled an AI app). Reads as momentum, not new fundamentals.

### BBY
# BBY (Best Buy) brief for the portfolio manager, 2026-11-27

**Verdict: WATCH.** Good quality, net cash, but the price has run (+41% in 6 months, 46% above its own EV/EBIT history) and the moat is thin.

## Key numbers (FY ended 2026-01-31; XBRL screen, 10-K 0000764478-26-000009)
- Revenue $41.69bn, 3-year-style CAGR -3.4%.
- FCF $1.258bn, margin 3.0% (5-year average 2.5%); FCF CAGR +12%.
- Operating income not in the file; implied EBIT about $1.4bn, margin about 3.3% (my derivation from EV/EBIT 15.08).
- Net cash about $0.56bn (derived from net debt/FCF -0.45); share count shrinking (dilution -6.0%).
- ROIC 45.7%, ROE 36.1%. Market cap $21.5bn; price $102.58.
- FCF yield 5.85% (4.77% normalized); EV/EBIT 15.1 (14.5 normalized, 1.46x its history).
- Price: 1y +43%, vol 40%, worst 5-year drawdown -44%.

## Why it is not clearly cheap
The market feared falling sales, tariffs and online/AI competition. Those fears are partly justified: revenue is shrinking and the company says its service-heavy cost base is higher than rivals. The recent rally follows a Q3 EPS beat and a raised outlook. One headline shows a 12-month target of $94.62, below the price.

## Moat and risks
Narrow or none: services and memberships help, but competition from e-commerce, carriers and vendors selling direct is strong. Top risks: competition and cost structure; consumer demand; tariffs and China/Taiwan exposure; product-cycle and AI change; weather in CA, TX, FL and labor costs.

## Thesis
- Net-cash FCF generator with buybacks.
- High returns on capital; FCF growing while sales fall.
- Earnings momentum and raised guidance.
- Upside from membership, Marketplace and ads (size not in the excerpt).

## What breaks it
- Revenue down again in the next two quarters.
- FCF margin below 2.5%.
- Operating margin below 3% for 2 quarters.
- Net cash turns to net debt, or buybacks stop.
- Guidance cut.
Upgrade trigger: EV/EBIT near 12x or normalized FCF yield above 6.5% with stable revenue.

## Limits
The MD&A excerpt was truncated, so segment data, gross margin, Q3 figures and guidance values are not in the filing excerpt.

### MA
# MA (Mastercard): brief for the portfolio manager

**Verdict: WATCH.** Superb business, full price. FCF yield 2.9% and EV/EBIT 32.1x (1.10x its own history) with the stock about 2% below its 5-year high. Revisit on a pullback.

## Key numbers (FY2025; sources: 10-K 0001141391-26-000013 Item 7, XBRL screen)
- Revenue $32,791m (+16%). Operating income $18,897m (+21%), margin 57.6% GAAP, 59.2% adjusted.
- Free cash flow $17,159m, margin 52.3%. Net income $14,968m; diluted EPS $16.52 (adjusted $17.01).
- Net debt about $9.3bn (derived), net debt/EBITDA 0.47x. ROIC 87%.
- Diluted shares 946m, then 927m, then 906m over 2023-2025. Buybacks $11.7bn and dividends $2.8bn, about 85% of FCF.
- Revenue CAGR 13.8%, FCF CAGR 16.9%. Tax rate rose to 19.4% from 15.6% (Pillar 2).
- Market cap about $598bn. Price 659.97; +23% in 1 year, +34% in 6 months, volatility 24%.
- Latest 10-Q (period 2026-09-30) numbers are not in the inputs.

## Business and moat
Global card network (switching: authorize, clear, settle) plus value-added services and account-to-account capabilities. Not a bank: no credit risk, no interest income, does not set interchange. Gross dollar volume +9%, cross-border volume +18% (USD), switched transactions +10%. Revenue grows faster than volume because of cross-border, processing and services. Margins and ROIC at this level show a wide moat. The main threats are political and technological, not a rival card brand.

## Why is it cheap?
It is not. The valuation score is only 0.40 of 1; quality is 0.81. Past worries (stablecoins, regulation, consumer slowdown) have not stopped the re-rating, and payment networks are being bought in a rotation out of AI names. The risk now is the multiple, not the business.

## Cyclical check and disruption
Not cyclical-normalized; normalized figures are nearly the same (FCF yield 2.71%, EV/EBIT 33.1x). Disruption (stablecoins, real-time account-to-account payments, agentic AI checkout) is real at the margin, mostly in cross-border and B2B; slow so far, and Mastercard is building into it. Cross-border is about 37% of gross assessments (derived), the most exposed piece.

## Top risks
1. Regulation of network fees and interchange; the 10-K says several jurisdictions are interested in network fees.
2. Interchange, surcharging (US and Canada merchants may now surcharge credit) and recurring litigation ($504m in 2025).
3. Sovereign and local networks, data localization, sanctions.
4. Privacy, AI and cyber regulation and breaches.
5. Macro or travel downturn hitting cross-border (not covered in the excerpt).

## Valuation
FCF yield 2.87% (2.71% normalized); EV/EBIT 32.1x vs 1.10x its own history. Price assumes 12-15% growth and stable margins for years. If the multiple stays flat, expect a low-to-mid-teens annual return; mean reversion would cost a point or two a year (my estimate). Analyst targets in headlines are inconsistent ($77, $770, $751), so they are ignored.

## Thesis (for a future BUY)
- Compounding at 14-17% with 50%+ FCF margins.
- Revenue outgrowing volume (16% vs 9%).
- Share count shrinking about 2% a year.
- Almost no financial risk (0.47x net debt/EBITDA).
- A 15-20% pullback would make it attractive.

## What breaks the thesis
- Currency-neutral revenue growth below 10% for two quarters.
- Adjusted operating margin below 57%.
- Cross-border growth below 10% for two quarters.
- A binding cut to network fees or interchange, or loss of no-surcharge rules, in the US, UK or EU.
- Effective tax rate sustained above 22%.
- Entry signal: FCF yield above 3.5% or EV/EBIT below about 26x.

## Headlines (30 days)
Strongly positive and analyst-led (Tigress target raise, Wedbush Outperform), plus a rotation into payment networks during an AI selloff. One negative item on stablecoins. Strong momentum and enthusiasm suggest the stock has already re-rated, which supports WATCH.

### LMT
# LMT brief for the portfolio manager (2026-11-27)

## Verdict
**WATCH.** A high-quality defence prime, but priced at about 20x EV/EBIT (20% above its own history) and a 5% FCF yield after a +36% one-year run. Not a bargain, and concentrated in one customer and one program.

## Key numbers (FY2025, 10-K 0001628280-26-004195 and XBRL screen)
- Revenue $75.05B; FCF $6.91B; FCF margin 9.2% (5-year average 8.8%, std 0.8 pts). (XBRL screen)
- Revenue CAGR 4.4%, FCF CAGR 4.1%. ROIC 22.9%. (XBRL screen)
- Net debt/FCF 2.89x, net debt/EBITDA 2.12x, so net debt is roughly $20B (derived). (XBRL screen)
- Share count change -11.75%, i.e. fewer shares (window not in the filing excerpt). (XBRL screen)
- Market cap about $138B; EV/EBIT 20.5x (normalized 18.6x; 1.195x its own history); FCF yield 5.0% (normalized 4.8%). (XBRL screen)
- Operating income, exact net debt and absolute share count: not in the filing excerpt. Implied EBIT is about $7.7B (about 10% margin), derived.
- Not cyclical-normalized (cyclical_normalized = False).
- Price $599.24 (2026-11-25); 1m -4%, 6m +13%, 1y +36%, 3y +46%; volatility 31%; -10% from the 5-year high; worst 5-year drawdown -32%.

## Business and moat
- Defence prime. 72% of 2025 sales from the US Government (63% DoW). F-35 is 27% of sales. (10-K, Item 1A)
- Moat: incumbency, classified work, certification and a multi-decade sustainment tail; ROIC 22.9%; stable FCF margin.
- Limits: a single powerful customer with termination for convenience, unilateral definitization and bid protests; thin margins; more competition from startups and non-traditional entrants.

## Why is it cheap?
It mostly is not. The valuation score is mid-pack (0.494), and the multiple is above its history. The market's worries are:
1. Budget timing (shutdowns, continuing resolutions).
2. F-35 concentration.
3. An Executive Order that could restrict buybacks, dividends and executive pay for contractors that miss performance requirements. The 10-K says it applies only after DoW finds a failure.
4. Fixed-price program execution (specific charges not in the filing excerpt).

My view: the budget and F-35 worries are real but slow and well known. The EO is probably overstated as a near-term risk, but it matters because the buyback is a central pillar of per-share growth. The share price already pays for good news; there is little cushion.

## Disruption
Not a software, payments or internet name. The main threat is non-traditional entrants and next-generation platforms. Medium and slow.

## Top 5 risks (Item 1A)
1. US Government dependence and budget timing (72% of sales).
2. F-35 concentration (27% of sales).
3. Procurement reform and limits on shareholder returns.
4. Contract-terms risk (termination, definitization, protests).
5. Competition and pricing pressure.

(The Item 1A excerpt is truncated; later risks are not in the filing excerpt.)

## Valuation
A 5% FCF yield plus about 4% growth implies roughly a 9% total return if the multiple holds. A reversion to its own history would cost about 16%. The case improves at an FCF yield of 6% or more (roughly $500 or below, all else equal).

## Thesis (if bought at a better price)
- 20%+ ROIC franchise with a locked-in F-35 and missile stream, and steady 9% FCF margins.
- Multi-year procurement shifts could lengthen visibility.
- A shrinking share count lifts per-share FCF above the roughly 4% business growth, if buybacks continue.
- Munitions and hypersonics demand is a growth leg beyond the F-35 (size not in the filing excerpt).
- Fair-value compounder at today's price, not a bargain.

## What breaks the thesis
1. The DFARS clause for the buyback and dividend EO is published and DoW finds LMT failed a performance requirement.
2. F-35 falls below about 25% of sales, or a partner nation cuts its order.
3. Reach-forward losses or large charges on a fixed-price program in any quarter.
4. FCF margin below about 8% for two consecutive annual periods.
5. Net debt/FCF above 3.5x, or buybacks cut materially.

## Headlines (30 days)
Mostly low-information price-move and analyst-page coverage. Mizuho initiated coverage on 24 Nov and called defence names underappreciated (price target not in the file). A Seeking Alpha piece frames the company as moving "from buyback machine to munitions compounder". No clearly negative item. The one-month return was -4% despite a late-month bounce. Labels were made by a fast model.

## Sizing note
At a maximum 8% weight, a repeat of the worst 5-year drawdown (-32%) costs about 2.6% of the portfolio. Watch for a pullback toward a 6% FCF yield before opening a position.

### MCK
# MCK (McKesson): PM brief, 2026-11-27

**Verdict: WATCH.** A high-quality, cash-generative distributor, but at 20.6x EV/EBIT (10% above its own history), a 4.6% FCF yield and a price 3% below its 5-year high after +43% in 6 months, the good news is priced in.

## What it is
US/Canada healthcare distributor, $403.4 billion FY2026 revenue (FY ends 31 March) (10-K 0000927653-26-000069, Item 7). Four segments: North American Pharmaceutical (drug distribution to pharmacies), Oncology & Multispecialty (specialty drugs, U.S. Oncology Network, PRISM Vision, Core Ventures), Prescription Technology Solutions (prior auth, access and adherence services), Medical-Surgical Solutions (to be separated; Apollo to take about 13% for about $1.25 billion preferred, pending approval). Norway sold in January 2026 for $821 million.

## Moat
Real but narrow: scale and licensing in a small oligopoly; low capital needs (ROIC 298% on the screen, a capital-light artefact); mix shift to oncology and technology. Against: gross margin only 3.61% and down 10 basis points; little pricing power on the core product; retail national accounts drove growth.

## Key numbers (FY2026)
- Revenue $403.4 billion, +12% (Item 7).
- Gross profit $14.55 billion (3.61%); opex $8.34 billion (2.07% of revenue); operating income about $6.2 billion (derived), flattered by a $480 million Norway gain and a $210 million LIFO credit. Clean run-rate about $5.5 to 5.7 billion.
- FCF $5.72 billion, 1.42% margin, average 1.49%, very stable (std 0.17 points) (XBRL screen).
- Net income to MCK $4.76 billion; diluted EPS $38.38 (vs $25.72); FY2025 also distorted by one-offs.
- Net debt about $3.8 billion (derived); net debt/EBITDA 0.59x (XBRL screen).
- Diluted shares 124.1 million vs 128.1 million (-3%); $4.8 billion buybacks plus $381 million dividends; $7.7 billion repurchase authorization total after April 2026 (Item 7).
- Market cap about $124.4 billion; FCF yield 4.6% (4.8% normalized); EV/EBIT 20.64 (22.62 normalized) (XBRL screen).
- Not cyclical (cyclical_normalized False).

## Why is it cheap?
It is not. The screen picked it for quality, low dilution and balance sheet (composite 0.64, valuation only 0.51). Market worries are opioid litigation (largely priced; claims charge about nil in FY2026), drug-pricing and reimbursement policy, and separation execution. A 4.6% yield for 6% FCF growth (revenue +12%, margins not yet expanding in cash) is fair, not a bargain.

## Risks (most important first)
1. Opioid and controlled-substance litigation, consent decrees, new state taxes.
2. Healthcare regulation and fraud-and-abuse exposure (Anti-Kickback, qui tam).
3. Loss of DEA, FDA or state licences at key sites.
4. Goodwill and intangible impairments after $3.4 billion of FY2026 oncology deals.
5. Privacy, cybersecurity and AI law.
Disruption (not mandatory): direct-to-patient and manufacturer-direct channels, and AI or PBM-platform competition for the technology units, long term.

## Valuation
FCF yield 4.6%/4.8% normalized; EV/EBIT 20.6x/22.6x, 10% above its own history (implied average about 18.7x, derived). Priced for at least 6% FCF growth plus buybacks of about 4% of market cap a year. Plausible return roughly 11 to 15% a year if the multiple holds; a reversion to the historical average costs about 3% a year over 3 years. No margin of safety.

## Thesis
- FCF of $5.7 billion with a steady margin funds about $5 billion a year of returns.
- Per-share compounding: shares -3% a year, new $5 billion authorization.
- Mix shift to oncology, specialty and technology lifts profit per dollar of revenue.
- Medical-Surgical separation with Apollo as outside validation.
- Net debt/EBITDA 0.59x leaves room for deals and buybacks.
Mostly in the price today.

## What breaks the thesis
1. Gross margin below about 3.4% for two consecutive quarters.
2. Trailing FCF margin below about 1.2% or FCF under $5 billion.
3. A new opioid or controlled-substance charge above about $1 billion, or a new state tax or consent-decree cost.
4. Loss of a major retail national account or a major licence.
5. A goodwill impairment on the oncology deals, or the Medical-Surgical separation or Apollo deal failing.

Upgrade trigger: normalized FCF yield above about 5.5% (price near $900, my arithmetic) or EV/EBIT at or below about 18.7x, with the breakers above intact.

## Headlines (last 30 days)
Thin and mostly noise: 12 of 14 items are Yahoo quote or option-chain pages (neutral). The rest are a positive growth-stock pitch (0.6), a Benzinga "$1000 over 15 years" piece (0.4) and a "most searched" note. No negative news, no litigation or earnings event in the window; stock +11% over 1 month. The latest 10-Q (filed 2026-11-04) is not in the filing excerpt, so current-quarter trends are unknown.

### FLEX
# FLEX (Flex Ltd.): PM brief, 2026-11-27

**Verdict: WATCH.** Improving EMS quality, but normalized FCF yield is only 3.4% and EV/EBIT is about 1.4x its own history after a 59% drawdown. The price still assumes AI-infrastructure growth and a clean spin-off.

## Key numbers
FY ended 2026-03-31 (10-K 0000866374-26-000012; XBRL screen unless noted)
- Revenue $27.9B (CAGR -0.7%). FCF $1.05B (margin 3.8%, average 3.0%). Normalized FCF about $0.84B (derived).
- Operating income: not in the filing excerpt. Derived EBIT about $1.4B and operating margin about 4.9% (estimate from EV/EBIT).
- Net debt about $1.4B (derived), 1.3x FCF and 1.0x EBITDA.
- Share count down 18% ("dilution" -0.18); exact counts not in the filing excerpt.
- ROIC 16.6%, ROE 17.1%. Market cap $24.8B.
- FCF yield 4.2% reported, 3.4% normalized. EV/EBIT 19.2x, 23.2x normalized, 1.42x its own history.
- Price $67.23. Return: 1m -19%, 6m -54%, 1y +18%, 3y +236%. Volatility 78%/y.
- Screen scores: composite 0.64, valuation 0.25 (weak), momentum 0.83, dilution 0.95.

## Business and moat
Contract electronics manufacturer and design/engineering provider, with growing Cloud and Power Infrastructure businesses for data centers. The top ten customers are 45% of sales (37% two years ago); none exceeds 10%. Moat is modest: ROIC is good and qualification creates stickiness, but there are no firm long-term commitments, termination for convenience exists, and margins are thin. Segment detail is not in the filing excerpt.

## Why is it cheap?
It is not really cheap. It is cheap only against its own recent peak. Concerns: AI-trade fade (named among AI names that plummeted on 11-24), spin-off risk, thin margins and tariff exposure. I think the valuation worry is mostly right: the multiple is still above history, and mid-cycle yield is only 3.4%.

## Cyclical check
cyclical_normalized = True. Using average margin (3.0%), FCF is about $0.84B and the yield is 3.4%. EV/EBIT normalizes to 23.2x. Mid-cycle, the stock is expensive.

## Risks (most important first)
1. Short order commitments and fixed costs, so downturns hit margins.
2. Customer concentration, especially hyperscalers in Cloud and Power.
3. Spin-off execution, cost and timing.
4. Tariffs, trade policy and export controls.
5. Impairment (equipment, goodwill) and working capital.

Disruption: customer in-sourcing or an AI-capex slowdown; not a software, payments or internet name.

## Valuation
3.4% normalized FCF yield, 23x normalized EV/EBIT, 1.42x history. Priced in: continued data-center growth, higher margins and a clean spin-off. If the multiple returned to history, the stock would be about 30% lower, all else equal (my rough estimate). Skew is not clearly favorable.

## Thesis (what would make it a BUY)
- Quality: ROIC 16.6%, FCF CAGR +49%, low leverage.
- Per-share support from the 18% lower share count.
- AI infrastructure exposure, and possible value unlock from the spin-off (UBS buy initiation reported).
- A lower entry price after the 59% drawdown. Upgrade trigger: normalized FCF yield above about 5%, or normalized FCF margin above 4%.

## What breaks the thesis
- Top-ten customer share above about 50%, or the loss of a major hyperscaler.
- Revenue down year-on-year for 2 consecutive quarters (check the 10-Q for 2026-09-25 first; numbers not in file).
- Operating margin below about 4% or FCF margin below 3%.
- Spin-off delayed, cancelled, or one-time costs far above guidance.
- Net debt/EBITDA above about 2x, or the share count stops falling.

## If AI data-centre capex falls 30% next year
- Exposed share of revenue: not in the filing excerpt (no segment split; Item 1A gives only top-ten customers at 45% of sales). Whether more than 30% of revenue is data-centre/cloud/AI is unknown.
- Per 10% of revenue exposed: 30% x 10% x $27.9B = about $0.84B revenue loss (3% of sales). At an assumed 15-20% decremental margin, EBIT falls $125-170M (9-12% of derived ~$1.37B); margin ~4.9% to ~4.6%.
- If 30% were exposed: revenue -$2.5B (-9%), EBIT -$375-500M, margin ~4.1-4.4%.
- FCF ($1.05B) stays positive in both cases (roughly $0.55-0.9B), before working-capital effects.

## Headlines (30 days)
Mixed and driven by the AI trade: UBS buy initiation, an 11.6% one-day jump, spin-off financing progress, and a ChartMill "undervalued" note on one side; an AI-name sell-off on 11-24 and a 19% monthly decline on the other. No new fundamental data in the file; labels are from a fast model, so I weight them lightly.

Flex WATCH


## Your answer
Reply with ONLY this JSON:
{"holdings": [{"ticker": "XXX", "weight": 6.0, "ai_hardware": false, "reason": "<= 25 words", "thesis": "<= 40 words",
                "breaks": ["signal 1", "signal 2", "signal 3"]}],
 "unfilled_reason": "<= 40 words if the satellite is below 40%",
 "rejected": {"TICKER": "<= 15 words why not"},
 "risks": "<= 60 words on the portfolio as a whole (factor bets, correlation, what would make the satellite trail the index)"}
