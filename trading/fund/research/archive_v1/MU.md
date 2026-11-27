# MU (Micron Technology) - paper research memo, 2026-11-27

Source tags: [10-K] = 10-K accession 0000723125-26-000023 (FY ended 2026-09-03, filed 2026-10-09); [XBRL] = XBRL screen. Items marked "derived" are my arithmetic from those numbers. Anything else is "not in the filing excerpt".

## Verdict
**WATCH.** The business is exceptional at this point in the cycle, but the 6.5x EV/EBIT rests on an earnings peak (81% gross margin, revenue up 256%) that the memory industry has never held; on a normalized basis the stock is not cheap (28x EV/EBIT, 0.5% FCF yield).

## Business
Micron is a US memory and storage maker. It sells DRAM (HBM, DDR5, LPDDR, GDDR), NAND (SSDs, managed NAND) and NOR, as components, modules, SSDs, multi-chip packages and wafers. It runs its own fabs plus some subcontractors (Singapore, Taiwan and elsewhere) [10-K, Item 1].

FY2026 revenue by segment [10-K, Item 7]:
- CMBU (hyperscale cloud memory and all HBM): $43.1B, 32%, operating margin 72%.
- CDBU (data center SSD, enterprise/OEM/NeoCloud DRAM): $37.6B, 28%, margin 79%.
- MCBU (mobile and client): $36.6B, 27%, margin 80%.
- AEBU (automotive and embedded): $15.9B, 12%, margin 71%.

By product, DRAM was $100.7B and NAND $31.8B [10-K, Item 1]. The customers are hyperscalers, AI-focused NeoClouds, server and PC OEMs, smartphone makers and automakers.

## Moat
For:
- Memory is a three-player global oligopoly. Micron is one of the three, but the competitors are not named in the excerpt, so that is background knowledge, not from the file.
- Scale and process leadership. 1-gamma is the first EUV DRAM node and was the majority of Q4 DRAM bits. HBM4 36GB 12-high is in volume and HBM4E is planned for calendar 2027 [10-K, Item 1].
- New take-or-pay strategic customer agreements: multi-year, binding volumes, mostly with price floors and caps. Management says floor-price gross margins would be "meaningfully above" any past cycle peak [10-K, Item 7]. This is the only structural change to the moat and it is management's claim. I have no contract sizes, durations or customer names in the excerpt.

Against:
- DRAM and NAND are commodities. This year's profit came from price (DRAM average selling price up about 180%, NAND about 200%) far more than from volume (bits up mid-20%) [10-K, Item 7]. Price is not a moat.
- The same high margins invite supply additions from competitors, and customers can hold back orders.
- Capital intensity: FCF was $59.0B against operating income of $99.3B, so heavy reinvestment is already visible (capex not in the excerpt).

Net: a cyclical oligopoly with excellent execution, not a pricing-power franchise. The contracts could change that, but that is unproven.

## Numbers (FY2026, 53 weeks)
- Revenue $133.2B, up 256% from $37.4B (FY25) and $25.1B (FY24) (10-K, Item 7; XBRL screen).
- Gross margin 81% (FY25 40%, FY24 22%) (10-K, Item 7).
- Operating income $99.3B, 75% margin (FY25 $9.8B, 26%; FY24 $1.3B, 5%) (10-K, Item 7).
- Net income $85.0B, 64% margin; effective tax rate 14.8% (10-K, Item 7). Singapore Pillar Two largely offsets the tax incentive; the net benefit was $2.21B, or $1.93 per diluted share (10-K, Item 7).
- R&D $5.65B (up 49%), SG&A $1.95B (up 62%) (10-K, Item 7).
- FCF $59.0B, a 44.3% margin (XBRL screen). Operating cash flow and capex separately: not in the filing excerpt.
- Net debt: net cash of about $35B (derived from net debt/FCF of -0.595). Net debt/EBITDA is -0.32 (XBRL screen). The balance sheet is a strength.
- Share count: dilution of 4.6% (XBRL screen), so the count is rising, not falling. Exact share counts: not in the filing excerpt. Implied about 1.13B shares (derived from market cap $680B and price $601.25).
- ROIC 76%, ROE 61% (XBRL screen), both peak-cycle figures.
- Multi-year average FCF margin is only 2.5%, with a standard deviation of 29.6 points (XBRL screen). The screen flags "FCF margin moved >2x y/y".

## Why is it cheap?
On trailing numbers it looks very cheap: EV/EBIT 6.5 and FCF yield 8.7% (XBRL screen), which is only 17% of its own historical EV/EBIT multiple (XBRL screen, ev_ebit_vs_hist 0.17).

The market is saying that this is peak earnings. The 17% ratio is the market pricing a collapse in profit, not a bargain. The worries visible in the headlines:
- A weaker DRAM price outlook: TrendForce cut its DRAM pricing forecast.
- A warning about a future supply glut (MarketWatch, 2026-11-24).
- New tariffs on memory.
- Analyst moves: UBS cut its target and BNP Paribas downgraded.
- A "surprising spending increase", meaning higher capex.

The stock is down 35% in one month and in six months, but still up 169% in one year and 672% in three years.

Is the worry right? Partly. Memory has repeatedly seen margin spikes reverse when supply catches up. A year-on-year 180% price rise cannot repeat, and an 81% gross margin is far above anything in the history in the file. The take-or-pay contracts with price floors are a real counterweight, but they are new, mostly with bands (so prices can still fall to the floor), and signed from Q3 FY26 onward. I cannot verify the share of revenue they cover. My view: the market is right that the earnings are not durable at this level, and probably roughly right on direction, but I cannot say whether it is right on size.

## Cyclical check (cyclical_normalized = True)
Use the normalized case, not FY26:
- Normalized FCF yield is 0.48% (XBRL screen), against 8.67% on the peak year. That implies normalized FCF of only about $3.3B (derived: 0.48% x $680B).
- Normalized EV/EBIT is 28.1x (XBRL screen), implying normalized EBIT of about $23B (derived: EV of about $645B / 28.1), versus $99.3B this year.
- The normalization looks backward over a period that includes the FY23-FY24 trough, so it is probably too harsh if the strategic agreements really lift the floor. Even so, FY25 operating income of $9.8B and FCF history show how low it can go. A fair middle case is EBIT of $25-50B (my judgement, not a number from the file); at $50B EBIT the stock is still about 13x EV/EBIT.

Conclusion: on any normalized view, the stock is fairly valued to expensive, not cheap.

## Disruption risk
Not a software, payments or internet name. The relevant disruption is on the demand side: AI capex slowing, or model efficiency lowering memory content per accelerator, would hit demand. The file has no evidence either way.

## Risks (top five, most important first)
The excerpt of Item 1A contains mostly the Item 1 business text and not the risk factors themselves, so these are my reading of the Item 7 and Item 1 excerpts plus the headlines, not a list from Item 1A. Items 1A proper: not in the filing excerpt.
1. Price and margin reversal. FY26 growth was almost entirely price. If DRAM or NAND prices fall, a 75% operating margin falls fast.
2. Industry supply response. Constrained supply is what is holding prices up; capacity additions by competitors, and Micron's own rising capex, point toward a glut (analyst warning 2026-11-24).
3. Customer concentration and AI dependence. Data center (CMBU plus CDBU) is 60% of revenue. An AI capex pause would hit these hard. Supply allocation decisions "may impact certain customers" [10-K, Item 7], a relationship risk.
4. Contract quality. Take-or-pay agreements could be renegotiated, delayed or break down if customers' needs fall; band pricing leaves downside to the floor.
5. Tariffs, tax and geopolitics. New tariffs on memory (headline 2026-11-25), Pillar Two minimum tax (15%, effective rate 14.8% versus 11.6%), incentive expiry through 2034, and heavy Singapore and Taiwan manufacturing exposure [10-K, Item 7 and Item 1].

## Valuation
- FCF yield: 8.7% on FY26 (XBRL screen), but 0.5% normalized (XBRL screen). The truth for a cycle-average buyer is much closer to the second.
- EV/EBIT: 6.5x trailing, 28.1x normalized, and 17% of its own history (XBRL screen). The trailing multiple is low because the denominator is at an extreme.
- Price: $601.25 (2026-11-25), market cap about $680B; volatility 87% a year; 5-year drawdown from high -50%, worst -58% (price pack). Momentum is strong over 12 months (12-1 return +315%) but sharply negative over the last month.
- What is priced in: about $23B of mid-cycle EBIT and 28x on it, or equivalently that the current profit stays at roughly one-third of its level. In other words the market has already cut the peak substantially; the bull case needs the contracts to hold profit well above past cycles. If they do, the stock is cheap; if not, it is roughly fair. I cannot tell which from the file.
- Dilution is 4.6% a year, a modest cost.
- Screen composite 0.68, with growth and momentum at 1.0 and dilution 0.13, valuation 0.47 (XBRL screen); the valuation score is mid, consistent with a stock that is neither obviously cheap nor expensive after normalizing.

## Thesis (what would make it a BUY-candidate)
- Strategic customer agreements really do raise the floor: gross margin stays far above past cycle troughs (current 81%).
- AI-driven demand continues to outrun supply; HBM4 and HBM4E ramps keep Micron's share in the highest-value segment.
- Net cash of about $35B and 76% ROIC fund capex and R&D without leverage.
- At a price giving about 10% FCF yield on a defensible mid-cycle FCF (not the $59B), the position size up to 8% could be considered. That price is not visible in the file.
- Entry is better after the Dec 17 earnings, with contract and capex detail, than before.

## What breaks the thesis (checkable signals)
- Gross margin below 60% for two consecutive quarters (versus 81% in FY26).
- DRAM or NAND contract prices falling quarter on quarter for two quarters, or TrendForce cutting forecasts again.
- Capex guidance rising while bit-supply growth outside Micron accelerates (glut signal).
- Strategic agreement disclosure that shows small coverage (a minor share of revenue) or price floors with gross margins near past peak margins rather than above them.
- Any major hyperscaler cutting AI capex guidance, or CMBU margin falling below 50%.

## Headlines (last 30 days)
Heavily negative. On 2026-11-24 and 2026-11-25 the stock fell about 7% in a day on a TrendForce DRAM price forecast cut, a supply glut warning, new memory tariffs, a UBS target cut and a BNP Paribas downgrade, plus a "surprising spending increase". The positives are modest: David Tepper holds Micron as his biggest position, some "value play" commentary, and a buy-the-dip call ahead of the Dec 17 earnings date. The one-month return is -35%. Labels come from a fast model and are only indicative.
