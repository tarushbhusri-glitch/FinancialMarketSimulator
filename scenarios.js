/* ============================================================
   FINANCIAL TRADING SYSTEM SIMULATOR — SCENARIO LIBRARY

   Copyright (c) 2026 Tarush Bhusri. All rights reserved.

   This software and its accompanying materials are the exclusive property of
   Tarush Bhusri. Unauthorised use, reproduction, modification, distribution,
   public display or derivative work, in whole or in part, is strictly prohibited
   without the prior written permission of the copyright holder. Violations will be
   pursued to the fullest extent of applicable law, including civil action and
   criminal prosecution where available.

   100 events. Each carries its market impact and, where relevant, the private
   hints analysts receive the round BEFORE it lands.

   Field key (kept short because there are a hundred of them):
     id   unique code            cat  category
     h    headline               b    body copy read to the room
     d    per-equity % shock     iv   volatility multiplier
     r5   5y rate move (%)       r2   2y rate move (%)
     hy   high yield spread (bp) ig   investment grade spread (bp)
     hint hints seeded to analysts the round before: {r:role, re:subject, t:text}

   Tickers: HLX healthcare · NVR semis · ATB bank · ORC energy
            VDT consumer   · KYN industrials
   ============================================================ */

const SCENARIOS = [

/* ---------- MACRO & INFLATION (1-12) ---------- */
{id:'CPI_HOT',cat:'macro',h:'Core inflation surprises to the upside, curve bear-flattens',
 b:'Core CPI comes in four tenths above consensus. The front end sells off hard and rate-sensitive equities are marked down.',
 d:{ATB:+0.03,VDT:-0.05,KYN:-0.03,NVR:-0.04},iv:1.12,r5:0.40,r2:0.62,hy:25,ig:8,
 hint:[{r:'MACRO',re:'rates',t:'Three regional central bank speakers used the word "persistent" about inflation this week. That language is new.'},
       {r:'EQUITY',re:'VDT',t:'Retail input costs are rising faster than pass-through. Margins get squeezed before revenue does.'}]},

{id:'CPI_COOL',cat:'macro',h:'Inflation cools sharply, everything rate-sensitive rallies',
 b:'Headline and core both undershoot. The market prices cuts and long duration assets rip higher.',
 d:{NVR:+0.09,VDT:+0.06,KYN:+0.05,ATB:-0.02,HLX:+0.03},iv:0.86,r5:-0.35,r2:-0.48,hy:-30,ig:-12,
 hint:[{r:'MACRO',re:'rates',t:'Used car and shelter components both rolled over in the regional surveys. Those lead the headline print.'}]},

{id:'WAGE_SPIRAL',cat:'macro',h:'Wage growth accelerates, second-round effects feared',
 b:'Average earnings jump and the central bank signals it is watching services inflation closely.',
 d:{VDT:-0.07,KYN:-0.05,ATB:+0.02},iv:1.15,r5:0.28,r2:0.44,hy:20,ig:7,
 hint:[{r:'MACRO',re:'rates',t:'Two large employers settled union contracts well above inflation. Others will follow.'}]},

{id:'GDP_BEAT',cat:'macro',h:'Growth surprises to the upside, soft landing hopes build',
 b:'GDP beats across the board with consumption leading. Cyclicals outperform defensives.',
 d:{KYN:+0.08,NVR:+0.07,VDT:+0.06,ATB:+0.05,HLX:-0.02},iv:0.88,r5:0.15,r2:0.18,hy:-25,ig:-9},

{id:'GDP_MISS',cat:'macro',h:'Growth stalls, recession probability repriced',
 b:'GDP contracts unexpectedly. Defensive rotation is immediate and credit widens.',
 d:{KYN:-0.11,NVR:-0.09,VDT:-0.08,ATB:-0.07,HLX:+0.03},iv:1.25,r5:-0.30,r2:-0.40,hy:60,ig:22,
 hint:[{r:'MACRO',re:'rates',t:'Freight volumes and job postings have both turned down. Those lead GDP by about a quarter.'}]},

{id:'PMI_CONTRACT',cat:'macro',h:'Manufacturing surveys fall into contraction',
 b:'New orders and employment components both drop below fifty. Industrial names lead the decline.',
 d:{KYN:-0.10,NVR:-0.06,ORC:-0.04},iv:1.14,r5:-0.18,r2:-0.22,hy:35,ig:14,
 hint:[{r:'EQUITY',re:'KYN',t:'Two logistics peers have cut hiring plans. Volume data is deteriorating faster than guidance implies.'}]},

{id:'UNEMP_SPIKE',cat:'macro',h:'Unemployment jumps, labour market cracks',
 b:'The jobless rate rises four tenths in one month. Consumer discretionary is hit hardest.',
 d:{VDT:-0.13,KYN:-0.07,ATB:-0.06,HLX:+0.02},iv:1.28,r5:-0.38,r2:-0.55,hy:70,ig:26},

{id:'STAGFLATION',cat:'macro',h:'Stagflation scare: weak growth with sticky prices',
 b:'The worst combination. Growth disappoints while inflation refuses to fall, leaving policymakers boxed in.',
 d:{VDT:-0.12,KYN:-0.10,NVR:-0.09,ATB:-0.05,ORC:+0.06},iv:1.35,r5:0.20,r2:0.30,hy:80,ig:30,
 hint:[{r:'MACRO',re:'rates',t:'Breakevens are rising while growth forecasts fall. That combination has no comfortable policy answer.'}]},

{id:'PRODUCTIVITY',cat:'macro',h:'Productivity surge revises the growth outlook higher',
 b:'Output per hour jumps, allowing growth without inflation. Equities broadly higher, rates stable.',
 d:{NVR:+0.11,KYN:+0.06,VDT:+0.04,HLX:+0.03},iv:0.84,r5:0.05,r2:0.02,hy:-30,ig:-11},

{id:'TRADE_WAR',cat:'macro',h:'Tariffs imposed across major trading partners',
 b:'Sweeping import duties announced. Supply chains reprice and margin assumptions everywhere are wrong.',
 d:{KYN:-0.12,NVR:-0.10,VDT:-0.09,ORC:+0.02},iv:1.30,r5:0.10,r2:0.14,hy:55,ig:20,
 hint:[{r:'EQUITY',re:'KYN',t:'Customs brokers report a surge in pre-emptive shipping. Somebody expects duties.'}]},

{id:'CURRENCY_CRISIS',cat:'macro',h:'Currency slides, imported inflation follows',
 b:'A sharp devaluation lifts import costs. Domestic consumers squeezed, exporters relieved.',
 d:{VDT:-0.10,KYN:+0.04,NVR:+0.05,ORC:+0.03},iv:1.22,r5:0.32,r2:0.40,hy:45,ig:16},

{id:'DEBT_CEILING',cat:'macro',h:'Sovereign debt standoff rattles funding markets',
 b:'A political impasse over borrowing limits pushes bill yields wildly and freezes risk appetite.',
 d:{ATB:-0.09,NVR:-0.05,KYN:-0.04,VDT:-0.04},iv:1.32,r5:0.18,r2:0.55,hy:50,ig:24,
 hint:[{r:'CREDIT',re:'credit',t:'Money market funds are shortening maturities aggressively. They are positioning for a funding accident.'}]},

/* ---------- CENTRAL BANK & POLICY (13-22) ---------- */
{id:'EMERGENCY_CUT',cat:'policy',h:'Emergency rate cut as policymakers step in',
 b:'An unscheduled fifty basis point cut. Rates rally, credit stabilises and high beta rips off the lows.',
 d:{NVR:+0.17,ATB:+0.13,VDT:+0.09,KYN:+0.08,HLX:+0.05,ORC:+0.04},iv:0.80,r5:-0.30,r2:-0.75,hy:-85,ig:-35,
 hint:[{r:'MACRO',re:'rates',t:'Policymakers have called an unscheduled meeting. That has only ever meant one thing.'},
       {r:'CREDIT',re:'credit',t:'Spreads have overshot fundamentals. If policy responds, this is the sharpest snap-back in the market.'}]},

{id:'HAWKISH_SURPRISE',cat:'policy',h:'Central bank hikes more than expected and signals more to come',
 b:'A larger hike than priced, with guidance that the terminal rate is higher than the market believes.',
 d:{NVR:-0.11,VDT:-0.08,KYN:-0.06,ATB:+0.04},iv:1.20,r5:0.45,r2:0.70,hy:40,ig:15},

{id:'DOVISH_PIVOT',cat:'policy',h:'Policy pivot signalled, tightening cycle declared over',
 b:'The statement drops its tightening bias. Everything long duration rallies hard.',
 d:{NVR:+0.14,VDT:+0.09,KYN:+0.07,HLX:+0.05,ATB:-0.03},iv:0.82,r5:-0.42,r2:-0.60,hy:-55,ig:-22,
 hint:[{r:'MACRO',re:'rates',t:'The language about "further tightening" was quietly dropped from two recent speeches. Nobody has noticed yet.'}]},

{id:'QT_ANNOUNCE',cat:'policy',h:'Balance sheet runoff accelerated',
 b:'Quantitative tightening steps up. Liquidity drains out of the system and long rates back up.',
 d:{NVR:-0.07,ATB:-0.04,KYN:-0.04},iv:1.10,r5:0.30,r2:0.18,hy:30,ig:12},

{id:'QE_RESTART',cat:'policy',h:'Asset purchases restarted to calm markets',
 b:'The central bank returns as a buyer. Risk assets respond immediately, credit spreads compress.',
 d:{NVR:+0.12,ATB:+0.10,KYN:+0.07,VDT:+0.06},iv:0.78,r5:-0.28,r2:-0.32,hy:-70,ig:-30},

{id:'YIELD_CURVE_CTRL',cat:'policy',h:'Yield curve control introduced at the long end',
 b:'The central bank caps long rates. Banks squeezed on margin, growth assets rewarded.',
 d:{NVR:+0.09,HLX:+0.05,ATB:-0.11},iv:1.05,r5:-0.50,r2:-0.15,hy:-20,ig:-8},

{id:'POLICY_ERROR',cat:'policy',h:'Policy mistake acknowledged, credibility questioned',
 b:'Officials concede they moved too slowly. Inflation expectations become unanchored and the curve steepens violently.',
 d:{VDT:-0.09,KYN:-0.07,NVR:-0.08,ORC:+0.05},iv:1.38,r5:0.35,r2:0.10,hy:65,ig:25},

{id:'FISCAL_STIMULUS',cat:'policy',h:'Large fiscal package passes',
 b:'Major infrastructure and industrial spending approved. Cyclicals and industrials lead.',
 d:{KYN:+0.14,NVR:+0.08,ORC:+0.06,VDT:+0.04},iv:0.92,r5:0.22,r2:0.16,hy:-25,ig:-10,
 hint:[{r:'EQUITY',re:'KYN',t:'Committee markups suggest the infrastructure bill has the votes. Logistics is the least priced beneficiary.'}]},

{id:'AUSTERITY',cat:'policy',h:'Spending cuts announced to restore fiscal credibility',
 b:'Sharp consolidation. Domestic demand suffers, but sovereign risk premium falls.',
 d:{KYN:-0.09,VDT:-0.08,ATB:-0.03},iv:1.12,r5:-0.20,r2:-0.14,hy:20,ig:8},

{id:'BANK_STRESS_TEST',cat:'policy',h:'Bank stress test results disappoint',
 b:'Several institutions fall short on capital. Dividends questioned and the sector de-rates.',
 d:{ATB:-0.16,NVR:-0.03},iv:1.24,r5:-0.12,r2:-0.16,hy:35,ig:20,
 hint:[{r:'CREDIT',re:'credit',t:'Bank capital ratios have been flattered by unrealised losses staying off the income statement. Stress tests will not allow that.'}]},

/* ---------- CREDIT & BANKING (23-34) ---------- */
{id:'CRE_PROVISION',cat:'credit',h:'Atlas Bancorp takes a $2.1bn commercial property provision',
 b:'Regional bank credit stress resurfaces. Financials gap lower, investment grade spreads widen, rates catch a flight-to-quality bid.',
 d:{ATB:-0.28,NVR:-0.04,VDT:-0.03},iv:1.30,r5:-0.35,r2:-0.48,hy:70,ig:40,
 hint:[{r:'CREDIT',re:'credit',t:'Atlas credit protection traded three times normal volume yesterday. Somebody is buying insurance in size.'},
       {r:'EQUITY',re:'ATB',t:'An internal audit memo has leaked to a trade publication. It references "provisioning adequacy".'}]},

{id:'DEPOSIT_FLIGHT',cat:'credit',h:'Deposit outflows accelerate at regional banks',
 b:'Uninsured deposits move to larger institutions. Funding costs jump and lending contracts.',
 d:{ATB:-0.22,VDT:-0.05,KYN:-0.04},iv:1.34,r5:-0.30,r2:-0.45,hy:75,ig:38},

{id:'HY_SHUTDOWN',cat:'credit',h:'High yield issuance window slams shut',
 b:'Two deals pulled in a week. Refinancing risk moves from theoretical to immediate for leveraged borrowers.',
 d:{ORC:-0.09,VDT:-0.07,KYN:-0.05},iv:1.20,r5:-0.10,r2:-0.12,hy:95,ig:28,
 hint:[{r:'CREDIT',re:'credit',t:'Two high yield deals were pulled this week citing conditions. Issuance windows are narrowing.'}]},

{id:'DEFAULT_WAVE',cat:'credit',h:'Corporate default rate doubles',
 b:'Rating agencies revise default forecasts sharply higher. Recovery assumptions come down with them.',
 d:{ORC:-0.12,VDT:-0.10,ATB:-0.11,KYN:-0.07},iv:1.32,r5:-0.25,r2:-0.32,hy:130,ig:45},

{id:'CREDIT_RALLY',cat:'credit',h:'Credit spreads compress as recession fears fade',
 b:'Inflows return to credit funds. The riskiest borrowers rally hardest.',
 d:{ORC:+0.08,VDT:+0.07,ATB:+0.09,KYN:+0.05},iv:0.85,r5:0.08,r2:0.06,hy:-90,ig:-30},

{id:'PRIVATE_CREDIT',cat:'credit',h:'Private credit marks questioned by regulators',
 b:'A review finds valuations inconsistent with public comparables. Confidence in the asset class wobbles.',
 d:{ATB:-0.12,NVR:-0.03},iv:1.22,r5:-0.10,r2:-0.14,hy:60,ig:26},

{id:'RATINGS_DOWNGRADE',cat:'credit',h:'Major issuer cut to junk, forced selling follows',
 b:'A fallen angel triggers mandate-driven liquidation. Index rebalancing amplifies the move.',
 d:{ORC:-0.15,ATB:-0.06},iv:1.26,r5:-0.08,r2:-0.10,hy:85,ig:32},

{id:'BANK_MERGER',cat:'credit',h:'Forced merger arranged for a failing lender',
 b:'A weekend deal prevents disorderly failure. Relief rally, but questions about who is next.',
 d:{ATB:+0.11,NVR:+0.04,KYN:+0.03},iv:1.05,r5:0.10,r2:0.14,hy:-40,ig:-18},

{id:'LEVERAGED_LOAN',cat:'credit',h:'Leveraged loan market seizes on covenant concerns',
 b:'Loose documentation from the boom years comes back to bite. Secondary prices gap lower.',
 d:{ORC:-0.10,VDT:-0.08,KYN:-0.06},iv:1.24,r5:-0.14,r2:-0.18,hy:100,ig:34},

{id:'CONSUMER_CREDIT',cat:'credit',h:'Consumer delinquencies rise across card and auto',
 b:'The lower-income consumer is exhausting savings. Lenders reserve more, retailers see it in the numbers.',
 d:{VDT:-0.12,ATB:-0.09},iv:1.18,r5:-0.16,r2:-0.22,hy:55,ig:22,
 hint:[{r:'CREDIT',re:'credit',t:'Subprime auto delinquencies just hit a post-crisis high. That cohort leads the broader consumer by a quarter.'}]},

{id:'SHADOW_BANK',cat:'credit',h:'Non-bank lender gates redemptions',
 b:'A large private fund halts withdrawals. Contagion fear spreads through anything illiquid.',
 d:{ATB:-0.14,ORC:-0.06,VDT:-0.05},iv:1.40,r5:-0.28,r2:-0.36,hy:110,ig:42},

{id:'BASEL_RULES',cat:'credit',h:'New capital rules require banks to hold more equity',
 b:'Return on equity assumptions across the sector are cut. Lending capacity shrinks.',
 d:{ATB:-0.13,KYN:-0.04,VDT:-0.03},iv:1.12,r5:-0.06,r2:-0.08,hy:25,ig:14},

/* ---------- GEOPOLITICAL (35-44) ---------- */
{id:'WAR_OUTBREAK',cat:'geo',h:'Armed conflict erupts in a major energy producing region',
 b:'Energy spikes, defence bids, everything else sells. Correlations move toward one.',
 d:{ORC:+0.19,HLX:-0.04,NVR:-0.09,VDT:-0.08,KYN:-0.07,ATB:-0.06},iv:1.42,r5:-0.20,r2:-0.24,hy:70,ig:28,
 hint:[{r:'MACRO',re:'oil',t:'Shipping insurers have quietly raised war risk premiums for one region. They price these things before the news does.'}]},

{id:'CEASEFIRE',cat:'geo',h:'Ceasefire agreed, risk premium unwinds',
 b:'Energy gives back its geopolitical premium and risk assets rally on relief.',
 d:{ORC:-0.14,NVR:+0.08,VDT:+0.07,KYN:+0.06,ATB:+0.05},iv:0.80,r5:0.12,r2:0.14,hy:-50,ig:-20},

{id:'SANCTIONS',cat:'geo',h:'Sweeping sanctions imposed on a major economy',
 b:'Trade flows redirect overnight. Commodity supply tightens and compliance costs rise.',
 d:{ORC:+0.13,KYN:-0.08,NVR:-0.06,ATB:-0.04},iv:1.30,r5:0.08,r2:0.10,hy:50,ig:20},

{id:'CHIP_EXPORT_BAN',cat:'geo',h:'Advanced semiconductor exports restricted',
 b:'A whole end market disappears for the affected suppliers. Others gain share.',
 d:{NVR:-0.21,KYN:-0.04},iv:1.34,r5:-0.05,r2:-0.06,hy:30,ig:12,
 hint:[{r:'EQUITY',re:'NVR',t:'Export licence applications in one category have stopped being approved. Nobody has announced a policy change.'}]},

{id:'STRAIT_BLOCKADE',cat:'geo',h:'Key shipping route disrupted',
 b:'Freight rates triple on affected lanes. Delivery times blow out and inventories run down.',
 d:{ORC:+0.15,KYN:-0.11,VDT:-0.07,NVR:-0.05},iv:1.32,r5:0.14,r2:0.16,hy:45,ig:18},

{id:'ELECTION_SHOCK',cat:'geo',h:'Unexpected election result upends policy assumptions',
 b:'Regulatory and tax expectations reset overnight. Sector winners and losers swap places.',
 d:{HLX:-0.10,ATB:+0.08,ORC:+0.07,NVR:-0.05},iv:1.28,r5:0.18,r2:0.20,hy:35,ig:14},

{id:'CYBER_ATTACK',cat:'geo',h:'State-linked cyber attack hits critical infrastructure',
 b:'Operations halt at several large firms. The cost is unclear, which is the problem.',
 d:{KYN:-0.09,ATB:-0.08,ORC:-0.06,NVR:-0.04},iv:1.30,r5:-0.10,r2:-0.12,hy:45,ig:18},

{id:'RESOURCE_NATIONALISM',cat:'geo',h:'Mining and energy assets nationalised',
 b:'A producing country seizes foreign-owned assets. Supply security repriced globally.',
 d:{ORC:+0.12,NVR:-0.06,KYN:-0.05},iv:1.26,r5:0.06,r2:0.08,hy:40,ig:16},

{id:'ALLIANCE_SHIFT',cat:'geo',h:'Major trade bloc realignment announced',
 b:'Tariff schedules and supply chains will be redrawn over years, but the market prices it today.',
 d:{KYN:-0.07,NVR:+0.06,VDT:-0.04},iv:1.16,r5:0.10,r2:0.12,hy:25,ig:10},

{id:'PEACE_DIVIDEND',cat:'geo',h:'Long-running conflict resolved, reconstruction begins',
 b:'Industrials and materials rally on rebuilding demand. Energy risk premium deflates.',
 d:{KYN:+0.13,ORC:-0.10,NVR:+0.05,VDT:+0.04},iv:0.84,r5:0.10,r2:0.12,hy:-45,ig:-18},

/* ---------- COMMODITY & ENERGY (45-54) ---------- */
{id:'OPEC_CUT',cat:'commodity',h:'Producer group announces surprise supply cut, crude spikes 11%',
 b:'Energy rallies hard. Transport and consumer names are squeezed on input costs.',
 d:{ORC:+0.16,KYN:-0.07,VDT:-0.05},iv:1.08,r5:0.18,r2:0.20,hy:15,ig:5,
 hint:[{r:'MACRO',re:'oil',t:'A producer group meeting has been moved forward and the agenda is undisclosed. That is not routine.'}]},

{id:'OPEC_FLOOD',cat:'commodity',h:'Production quotas abandoned, crude collapses',
 b:'A price war breaks out. Energy producers crater while transport and consumers gain.',
 d:{ORC:-0.24,KYN:+0.08,VDT:+0.06,NVR:+0.03},iv:1.28,r5:-0.20,r2:-0.24,hy:55,ig:16},

{id:'DEMAND_DESTRUCT',cat:'commodity',h:'Energy demand falls as high prices bite',
 b:'Consumption data rolls over. The commodity complex gives back its gains.',
 d:{ORC:-0.15,KYN:+0.05,VDT:+0.04},iv:1.14,r5:-0.16,r2:-0.18,hy:35,ig:12},

{id:'REFINERY_FIRE',cat:'commodity',h:'Major refinery outage tightens product markets',
 b:'Crack spreads blow out. Crude producers benefit, downstream consumers do not.',
 d:{ORC:+0.11,KYN:-0.05,VDT:-0.04},iv:1.12,r5:0.10,r2:0.12,hy:15,ig:6},

{id:'GRID_CRISIS',cat:'commodity',h:'Power grid failures during extreme weather',
 b:'Industrial production halts in affected regions. Utilities and energy repriced.',
 d:{KYN:-0.10,ORC:+0.08,NVR:-0.06},iv:1.24,r5:-0.08,r2:-0.10,hy:35,ig:14},

{id:'GREEN_TRANSITION',cat:'commodity',h:'Aggressive decarbonisation targets legislated',
 b:'Long-term energy demand assumptions cut. Industrials with retooling exposure sell off.',
 d:{ORC:-0.16,KYN:-0.06,NVR:+0.07},iv:1.14,r5:0.05,r2:0.06,hy:30,ig:12},

{id:'CRITICAL_MINERALS',cat:'commodity',h:'Export controls on critical minerals',
 b:'Battery and semiconductor supply chains face a hard input constraint.',
 d:{NVR:-0.13,KYN:-0.07,ORC:+0.05},iv:1.26,r5:0.06,r2:0.08,hy:35,ig:14},

{id:'HARVEST_FAIL',cat:'commodity',h:'Crop failures push food prices sharply higher',
 b:'Food inflation feeds through to headline prints and squeezes discretionary spending.',
 d:{VDT:-0.11,KYN:-0.04},iv:1.16,r5:0.20,r2:0.24,hy:30,ig:12},

{id:'SHALE_BOOM',cat:'commodity',h:'New extraction technology lifts supply forecasts',
 b:'Long-run energy price assumptions fall. Producers de-rate, energy consumers gain.',
 d:{ORC:-0.18,KYN:+0.07,VDT:+0.05,NVR:+0.04},iv:1.10,r5:-0.14,r2:-0.16,hy:35,ig:12},

{id:'GOLD_SURGE',cat:'commodity',h:'Safe haven demand surges as confidence erodes',
 b:'Investors move to hard assets. Financials and long duration equities suffer.',
 d:{ATB:-0.08,NVR:-0.06,ORC:+0.04},iv:1.22,r5:-0.15,r2:-0.18,hy:40,ig:16},

/* ---------- TECHNOLOGY (55-64) ---------- */
{id:'AI_CONTRACT',cat:'tech',h:'Novara wins hyperscaler AI silicon contract',
 b:'A multi-year design win. Semis re-rate and the broader tape grinds higher on the read-through.',
 d:{NVR:+0.28,KYN:+0.04},iv:0.92,r5:0.12,r2:0.10,hy:-20,ig:-8,
 hint:[{r:'EQUITY',re:'NVR',t:'A hyperscaler has begun qualifying a second silicon supplier. Whoever wins gets a multi-year book.'}]},

{id:'AI_BUBBLE_POP',cat:'tech',h:'AI capex plans cut, the trade unwinds',
 b:'Two large buyers reduce spending guidance. Everything that rallied on the theme reverses.',
 d:{NVR:-0.26,KYN:-0.05},iv:1.36,r5:-0.12,r2:-0.14,hy:40,ig:16,
 hint:[{r:'EQUITY',re:'NVR',t:'Data centre construction permits have flattened for two months. Capex follows permits.'}]},

{id:'CHIP_GLUT',cat:'tech',h:'Semiconductor inventories build, pricing power fades',
 b:'Channel inventory reaches multi-year highs. Average selling prices come down.',
 d:{NVR:-0.17,KYN:-0.03},iv:1.22,r5:-0.06,r2:-0.08,hy:25,ig:10},

{id:'CHIP_SHORTAGE',cat:'tech',h:'Acute chip shortage halts downstream production',
 b:'Semis have pricing power, everyone who buys chips has a problem.',
 d:{NVR:+0.19,KYN:-0.09,VDT:-0.05},iv:1.18,r5:0.08,r2:0.10,hy:25,ig:10},

{id:'FAB_DISASTER',cat:'tech',h:'Fire destroys a major fabrication plant',
 b:'Capacity offline for quarters. Supply tightens sharply and lead times extend.',
 d:{NVR:+0.14,KYN:-0.07},iv:1.30,r5:0.04,r2:0.05,hy:30,ig:12},

{id:'ANTITRUST',cat:'tech',h:'Antitrust action filed against dominant platforms',
 b:'Break-up risk enters the valuation. Multiples compress across large technology.',
 d:{NVR:-0.12,VDT:-0.04},iv:1.24,r5:-0.04,r2:-0.05,hy:25,ig:10},

{id:'QUANTUM_BREAK',cat:'tech',h:'Cryptography breakthrough threatens existing security',
 b:'Financial infrastructure faces an urgent and expensive upgrade cycle.',
 d:{ATB:-0.11,NVR:+0.10,KYN:-0.03},iv:1.30,r5:-0.06,r2:-0.08,hy:35,ig:16},

{id:'CLOUD_PRICE_WAR',cat:'tech',h:'Cloud providers cut prices aggressively',
 b:'Margins compress across the sector even as volumes grow.',
 d:{NVR:-0.11,KYN:+0.03},iv:1.16,r5:-0.04,r2:-0.05,hy:20,ig:8},

{id:'DATA_BREACH',cat:'tech',h:'Massive data breach triggers regulatory response',
 b:'Fines and remediation costs are large but the reputational damage is larger.',
 d:{NVR:-0.09,ATB:-0.07,VDT:-0.05},iv:1.22,r5:-0.05,r2:-0.06,hy:30,ig:12},

{id:'AUTOMATION_WAVE',cat:'tech',h:'Automation adoption accelerates across logistics',
 b:'Margins improve structurally for early adopters. Labour intensive competitors lag.',
 d:{KYN:+0.12,NVR:+0.09,VDT:-0.04},iv:0.94,r5:0.06,r2:0.05,hy:-20,ig:-8},

/* ---------- HEALTHCARE (65-72) ---------- */
{id:'TRIAL_SUCCESS',cat:'health',h:'Helix Biosciences: Phase III trial hits primary endpoint',
 b:'The lead oncology asset succeeds. Peak sales estimates are revised sharply higher.',
 d:{HLX:+0.34},iv:0.94,r5:-0.05,r2:-0.05,hy:-10,ig:-3,
 hint:[{r:'EQUITY',re:'HLX',t:'A contract research firm has quietly staffed up for a commercial launch. Somebody expects this data to succeed.'},
       {r:'DERIV',re:'single-name vol',t:'Implied volatility in one healthcare name is pricing a far bigger move than the sell-side expects.'}]},

{id:'TRIAL_FAIL',cat:'health',h:'Helix Phase III misses primary endpoint',
 b:'The lead asset fails. Years of pipeline value is written off in a single session.',
 d:{HLX:-0.41},iv:1.30,r5:-0.04,r2:-0.05,hy:15,ig:6,
 hint:[{r:'EQUITY',re:'HLX',t:'Two senior clinical staff have left quietly ahead of the readout. That is rarely a good sign.'}]},

{id:'DRUG_PRICING',cat:'health',h:'Drug pricing reform passes',
 b:'Negotiated pricing compresses margins across the sector. Volume will not offset it.',
 d:{HLX:-0.19},iv:1.20,r5:-0.03,r2:-0.04,hy:20,ig:8},

{id:'PANDEMIC',cat:'health',h:'Novel pathogen outbreak, mobility restrictions imposed',
 b:'Travel and consumption collapse. Healthcare bid, everything cyclical sold.',
 d:{HLX:+0.16,VDT:-0.21,KYN:-0.14,ORC:-0.17,ATB:-0.11,NVR:-0.08},iv:1.55,r5:-0.50,r2:-0.65,hy:140,ig:55,
 hint:[{r:'EQUITY',re:'HLX',t:'Diagnostics orders from three regions have spiked without an obvious seasonal driver.'}]},

{id:'PANDEMIC_END',cat:'health',h:'Outbreak contained, restrictions lifted',
 b:'Reopening trade returns. Travel, retail and industrials rally, defensive healthcare lags.',
 d:{VDT:+0.18,KYN:+0.14,ORC:+0.13,ATB:+0.09,HLX:-0.09},iv:0.78,r5:0.25,r2:0.30,hy:-95,ig:-38},

{id:'FDA_REJECT',cat:'health',h:'Regulator rejects a key approval application',
 b:'A surprise complete response letter. Launch timelines pushed out by years.',
 d:{HLX:-0.24},iv:1.28,r5:-0.02,r2:-0.03,hy:15,ig:6},

{id:'BIOTECH_MA',cat:'health',h:'Large pharmaceutical bid launched for a mid-cap',
 b:'A takeover premium re-rates the whole sub-sector on read-across.',
 d:{HLX:+0.21},iv:1.05,r5:0.02,r2:0.02,hy:-15,ig:-6},

{id:'PATENT_CLIFF',cat:'health',h:'Key patent invalidated, generics enter early',
 b:'Revenue that was assumed protected for years disappears.',
 d:{HLX:-0.17},iv:1.18,r5:-0.02,r2:-0.02,hy:15,ig:6},

/* ---------- CONSUMER & RETAIL (73-80) ---------- */
{id:'GUIDANCE_CUT',cat:'consumer',h:'Verdant Retail cuts guidance, consumer rolls over',
 b:'Weak discretionary spend. Consumer and logistics de-rate and credit questions the recovery.',
 d:{VDT:-0.22,KYN:-0.08,ORC:-0.05},iv:1.15,r5:-0.15,r2:-0.18,hy:45,ig:15,
 hint:[{r:'EQUITY',re:'VDT',t:'Third-party foot traffic data shows visits down four percent for the second month running.'}]},

{id:'CONSUMER_BOOM',cat:'consumer',h:'Consumer spending surges on real income gains',
 b:'Wages finally outpace prices. Discretionary categories lead the market higher.',
 d:{VDT:+0.19,KYN:+0.08,NVR:+0.05},iv:0.86,r5:0.14,r2:0.16,hy:-35,ig:-14},

{id:'SAVINGS_EXHAUST',cat:'consumer',h:'Excess savings depleted, trade-down accelerates',
 b:'Consumers shift to value. Premium positioning becomes a liability.',
 d:{VDT:-0.15,KYN:-0.05},iv:1.18,r5:-0.14,r2:-0.18,hy:45,ig:16},

{id:'INVENTORY_GLUT',cat:'consumer',h:'Retail inventories balloon, discounting spreads',
 b:'Too much stock bought at the wrong price. Gross margins take the hit.',
 d:{VDT:-0.16,KYN:-0.06},iv:1.16,r5:-0.10,r2:-0.12,hy:35,ig:14},

{id:'BRAND_SCANDAL',cat:'consumer',h:'Product safety scandal triggers mass recall',
 b:'Recall costs are quantifiable, the brand damage is not.',
 d:{VDT:-0.20,KYN:-0.03},iv:1.26,r5:-0.03,r2:-0.04,hy:25,ig:10},

{id:'ECOMM_SHIFT',cat:'consumer',h:'Online share gains accelerate, store formats questioned',
 b:'Fixed cost bases become a problem. Logistics gains what retail loses.',
 d:{VDT:-0.13,KYN:+0.10},iv:1.10,r5:-0.02,r2:-0.03,hy:20,ig:8},

{id:'HOUSING_CRASH',cat:'consumer',h:'House prices fall sharply, wealth effect reverses',
 b:'Consumers feel poorer and spend less. Banks face collateral questions.',
 d:{VDT:-0.14,ATB:-0.15,KYN:-0.07},iv:1.30,r5:-0.32,r2:-0.40,hy:70,ig:30},

{id:'HOUSING_BOOM',cat:'consumer',h:'Housing market reaccelerates on lower rates',
 b:'Construction, banks and consumer durables all benefit.',
 d:{ATB:+0.12,VDT:+0.10,KYN:+0.08},iv:0.88,r5:-0.10,r2:-0.14,hy:-40,ig:-16},

/* ---------- INDUSTRIAL & SUPPLY CHAIN (81-88) ---------- */
{id:'SUPPLY_SNARL',cat:'industrial',h:'Port congestion returns, lead times extend',
 b:'Freight costs jump and delivery reliability collapses. Inventory build follows.',
 d:{KYN:-0.11,VDT:-0.07,NVR:-0.05},iv:1.20,r5:0.10,r2:0.12,hy:35,ig:14},

{id:'FREIGHT_COLLAPSE',cat:'industrial',h:'Freight rates collapse on overcapacity',
 b:'Good for shippers, terrible for carriers. Volume growth does not offset price.',
 d:{KYN:-0.14,VDT:+0.05},iv:1.16,r5:-0.08,r2:-0.10,hy:35,ig:14},

{id:'STRIKE_ACTION',cat:'industrial',h:'Widespread industrial action halts production',
 b:'Output stops and wage settlements will be higher when it restarts.',
 d:{KYN:-0.12,VDT:-0.06,NVR:-0.04},iv:1.22,r5:0.12,r2:0.15,hy:35,ig:14},

{id:'NEARSHORING',cat:'industrial',h:'Supply chains relocate closer to end markets',
 b:'Capital spending boom for domestic industrials, cost inflation for everyone.',
 d:{KYN:+0.13,NVR:+0.06,VDT:-0.04},iv:1.02,r5:0.14,r2:0.16,hy:-15,ig:-6},

{id:'AIRLINE_GROUND',cat:'industrial',h:'Safety directive grounds a major aircraft fleet',
 b:'Capacity leaves the market overnight. Logistics costs spike.',
 d:{KYN:-0.10,ORC:-0.05,VDT:-0.04},iv:1.24,r5:-0.05,r2:-0.06,hy:30,ig:12},

{id:'INFRA_BOOM',cat:'industrial',h:'Multi-year infrastructure programme begins',
 b:'Order books fill for years. Materials and logistics lead.',
 d:{KYN:+0.16,ORC:+0.06,NVR:+0.04},iv:0.92,r5:0.16,r2:0.14,hy:-25,ig:-10},

{id:'CAPEX_FREEZE',cat:'industrial',h:'Corporate capital spending frozen amid uncertainty',
 b:'Order cancellations arrive faster than the sell-side can model them.',
 d:{KYN:-0.13,NVR:-0.11},iv:1.24,r5:-0.20,r2:-0.24,hy:50,ig:20},

{id:'RARE_EARTH',cat:'industrial',h:'Rare earth supply disruption hits manufacturing',
 b:'A narrow input constraint with wide consequences across industrial production.',
 d:{KYN:-0.09,NVR:-0.10,ORC:+0.04},iv:1.24,r5:0.05,r2:0.06,hy:35,ig:14},

/* ---------- REGULATORY & LEGAL (89-94) ---------- */
{id:'CARBON_TAX',cat:'reg',h:'Carbon pricing introduced across major economies',
 b:'Emitters face a permanent new cost. Asset lives get shorter.',
 d:{ORC:-0.14,KYN:-0.08,NVR:+0.04},iv:1.14,r5:0.06,r2:0.06,hy:30,ig:12},

{id:'WINDFALL_TAX',cat:'reg',h:'Windfall tax levied on energy profits',
 b:'Cash flows redirected to the exchequer. Buybacks and dividends questioned.',
 d:{ORC:-0.17},iv:1.16,r5:-0.02,r2:-0.03,hy:25,ig:10},

{id:'CLASS_ACTION',cat:'reg',h:'Multi-billion class action verdict returned',
 b:'The size of the award surprises everyone, including the plaintiffs.',
 d:{HLX:-0.15,VDT:-0.08},iv:1.22,r5:-0.03,r2:-0.04,hy:25,ig:10},

{id:'ACCOUNTING_FRAUD',cat:'reg',h:'Accounting irregularities discovered at a major issuer',
 b:'Restatement announced. Every peer with similar disclosure gets marked down too.',
 d:{ATB:-0.13,KYN:-0.08,VDT:-0.06},iv:1.34,r5:-0.10,r2:-0.12,hy:60,ig:24},

{id:'DEREGULATION',cat:'reg',h:'Sweeping deregulation announced across finance and energy',
 b:'Compliance costs fall and balance sheet capacity expands.',
 d:{ATB:+0.15,ORC:+0.10,KYN:+0.05},iv:0.90,r5:0.10,r2:0.10,hy:-40,ig:-16},

{id:'SHORT_BAN',cat:'reg',h:'Temporary short selling ban imposed on financials',
 b:'A squeeze follows, then the underlying problem reasserts itself.',
 d:{ATB:+0.12,NVR:-0.03},iv:1.36,r5:-0.10,r2:-0.14,hy:30,ig:14},

/* ---------- TAIL EVENTS (95-100) ---------- */
{id:'RISK_CASCADE',cat:'tail',h:'Risk-off cascade, correlations go to one',
 b:'Systematic deleveraging. Every factor sells off together and diversification stops working.',
 d:{HLX:-0.09,NVR:-0.14,ATB:-0.11,ORC:-0.10,VDT:-0.10,KYN:-0.09},iv:1.45,r5:-0.45,r2:-0.55,hy:120,ig:55,
 hint:[{r:'DERIV',re:'index vol',t:'Correlation is at multi-year lows and dealers are short gamma. When it reverts, diversified books stop being diversified.'},
       {r:'CREDIT',re:'credit',t:'Investment grade is widening faster than high yield. That inversion usually precedes a broad risk-off.'}]},

{id:'FLASH_CRASH',cat:'tail',h:'Flash crash, liquidity disappears for twenty minutes',
 b:'Market structure fails. Prices gap through stops and partially recover.',
 d:{HLX:-0.06,NVR:-0.09,ATB:-0.08,ORC:-0.07,VDT:-0.07,KYN:-0.06},iv:1.50,r5:-0.15,r2:-0.18,hy:50,ig:24},

{id:'MELT_UP',cat:'tail',h:'Melt-up as sidelined cash chases performance',
 b:'Fear of missing out takes over. Valuation stops mattering for a while.',
 d:{NVR:+0.18,VDT:+0.12,KYN:+0.11,ATB:+0.10,ORC:+0.09,HLX:+0.08},iv:0.76,r5:0.15,r2:0.14,hy:-60,ig:-24},

{id:'VOL_SPIKE',cat:'tail',h:'Volatility complex breaks, short vol positions unwind',
 b:'A crowded trade unwinds violently. The move is mechanical rather than fundamental.',
 d:{NVR:-0.12,ATB:-0.09,VDT:-0.08,KYN:-0.08,ORC:-0.07,HLX:-0.05},iv:1.60,r5:-0.20,r2:-0.25,hy:65,ig:28,
 hint:[{r:'DERIV',re:'index vol',t:'Short volatility positioning is at a record. That trade works until it does not, and it ends fast.'}]},

{id:'NAT_DISASTER',cat:'tail',h:'Major natural disaster hits an industrial centre',
 b:'Insured losses are large, supply disruption is larger, and reconstruction follows.',
 d:{KYN:-0.11,ATB:-0.08,ORC:+0.06,VDT:-0.05},iv:1.32,r5:-0.12,r2:-0.15,hy:45,ig:20},

{id:'QUARTER_END',cat:'tail',h:'Quarter-end mark, books frozen at the bell',
 b:'A quiet tape into the close. Positions are marked and the quarter is done.',
 d:{},iv:0.95,r5:0.05,r2:0.05,hy:-10,ig:-4}
];

/* ------------------------------------------------------------
   CAMPAIGNS — curated 7-round arcs with narrative shape
   ------------------------------------------------------------ */
const CAMPAIGNS = [
 {id:'CLASSIC', name:'The Classic Cycle',
  desc:'Benign open, inflation shock, a single-name binary, a bank credit event, correlation cascade, policy rescue, quarter-end. The balanced default.',
  rounds:['GDP_BEAT','CPI_HOT','TRIAL_SUCCESS','CRE_PROVISION','RISK_CASCADE','EMERGENCY_CUT','GUIDANCE_CUT']},

 {id:'CREDIT_CRISIS', name:'Credit Crisis',
  desc:'A slow-motion banking collapse. Rewards anyone who reads credit spreads and owns protection before it is obvious.',
  rounds:['GDP_BEAT','HY_SHUTDOWN','CRE_PROVISION','DEPOSIT_FLIGHT','SHADOW_BANK','BANK_MERGER','DEFAULT_WAVE']},

 {id:'INFLATION', name:'The Great Inflation',
  desc:'Prices refuse to fall and policy is trapped. A rates and commodities game more than an equity one.',
  rounds:['CPI_HOT','WAGE_SPIRAL','HAWKISH_SURPRISE','OPEC_CUT','STAGFLATION','POLICY_ERROR','CPI_COOL']},

 {id:'TECH_CYCLE', name:'Boom and Bust in Tech',
  desc:'A euphoric AI-led rally followed by the unwind. Tests whether teams can tell a theme from a bubble.',
  rounds:['PRODUCTIVITY','AI_CONTRACT','MELT_UP','CHIP_EXPORT_BAN','AI_BUBBLE_POP','CHIP_GLUT','ANTITRUST']},

 {id:'GEOPOLITICAL', name:'Geopolitical Shock',
  desc:'War, sanctions and supply disruption. Energy leads and correlations behave badly.',
  rounds:['GDP_BEAT','WAR_OUTBREAK','OPEC_CUT','SANCTIONS','STRAIT_BLOCKADE','RISK_CASCADE','CEASEFIRE']},

 {id:'PANDEMIC', name:'Health Shock',
  desc:'Sudden stop, policy flood, then reopening. Brutal early, violently mean-reverting late.',
  rounds:['GDP_BEAT','PANDEMIC','RISK_CASCADE','EMERGENCY_CUT','QE_RESTART','PANDEMIC_END','CONSUMER_BOOM']},

 {id:'STAGFLATION_ARC', name:'Stagflation',
  desc:'Weak growth with sticky prices. Nothing works, which is the lesson.',
  rounds:['PMI_CONTRACT','CPI_HOT','STAGFLATION','WINDFALL_TAX','UNEMP_SPIKE','POLICY_ERROR','QUARTER_END']},

 {id:'CONSUMER_BUST', name:'The Consumer Cracks',
  desc:'A slow deterioration in household finances that eventually breaks the banks. Rewards patience.',
  rounds:['CONSUMER_BOOM','SAVINGS_EXHAUST','INVENTORY_GLUT','CONSUMER_CREDIT','HOUSING_CRASH','GUIDANCE_CUT','EMERGENCY_CUT']},

 {id:'GOLDILOCKS', name:'Goldilocks',
  desc:'A gentler arc for a first session or a non-finance audience. Fewer disasters, still real decisions.',
  rounds:['GDP_BEAT','CPI_COOL','TRIAL_SUCCESS','INFRA_BOOM','SUPPLY_SNARL','AI_CONTRACT','QUARTER_END']},

 {id:'EVERYTHING', name:'Everything, Everywhere',
  desc:'One shock from each category. Maximum variety, deliberately hard to build a single thesis around.',
  rounds:['CPI_HOT','WAR_OUTBREAK','AI_CONTRACT','CRE_PROVISION','PANDEMIC','EMERGENCY_CUT','QUARTER_END']}
];

/* ------------------------------------------------------------
   NOISE — plausible notes that lead nowhere, so analysts have to
   judge rather than just relay. Every round every analyst gets a
   note; only some of them mean anything.
   ------------------------------------------------------------ */
const NOISE = {
 EQUITY:[
  'A sell-side analyst upgraded the name this morning on valuation grounds. No new information in the note.',
  'Insider buying reported, though the amounts are small relative to holdings.',
  'The company presented at a conference and management sounded confident. They usually do.',
  'Short interest has ticked up modestly. Could be a hedge rather than a view.',
  'A competitor pre-announced weak numbers. Read-across is uncertain.',
  'Options volume is elevated but the flow looks like rolling rather than new positioning.',
  'The company announced a buyback. Often a confidence signal, sometimes a lack of ideas.',
  'A rating agency affirmed the outlook with no change to guidance.',
  'Channel checks are mixed. Two distributors positive, one negative.',
  'The stock has underperformed its sector for three weeks with no obvious catalyst.'],
 MACRO:[
  'A regional survey came in soft, though the series is volatile and often revised.',
  'Positioning data shows the market is already leaning this way. Crowded trades cut both ways.',
  'A policymaker gave a speech that broke no new ground.',
  'Seasonal adjustment may be distorting the last two prints. Nobody agrees by how much.',
  'Forward pricing has barely moved despite the noise. The market is unconvinced.',
  'Inventory data suggests a build, but the sample is narrow.',
  'A widely followed strategist changed their forecast. Their track record is unremarkable.'],
 CREDIT:[
  'Spreads widened a few basis points on light volume. Could easily be month-end.',
  'A rating agency placed a small issuer on watch. Not systemically relevant.',
  'New issue concessions are normal for this point in the cycle.',
  'Fund flows were negative last week but positive the week before.',
  'A distressed name traded up on restructuring hopes. Idiosyncratic.',
  'Dealer inventories are roughly unchanged from last month.'],
 DERIV:[
  'Implied volatility drifted lower into the weekend, which is typical.',
  'Skew is broadly in line with its one-year average.',
  'Open interest built at a strike that looks like an expiring hedge rolling.',
  'Term structure is mildly upward sloping, which is the normal state.',
  'Realised volatility has been running below implied, as it usually does.',
  'A large block traded but it looks like a delta-neutral structure.']
};

/* ------------------------------------------------------------
   AUTOMATIC SIGNAL GENERATION

   Hand-writing a hint for every role in every one of 100 scenarios would be 900
   notes, and only 26 got written. That left analysts reading pure noise for most
   of a session, which correctly taught them their seat was pointless.

   So signals are derived from each event's own market impact instead. If an
   event moves a company more than 8%, the analyst covering it hears something
   the round before. If it moves rates, the macro analyst does. And so on.

   Two rules keep it honest:
     · hand-written hints always win, they are better written than templates
     · a role only gets a signal if the coming event actually touches its patch.
       Otherwise it gets noise, so judging reliability is still the job.
   ------------------------------------------------------------ */

const NAMES = { HLX:'Helix Biosciences', NVR:'Novara Semiconductor', ATB:'Atlas Bancorp',
                ORC:'Orcus Energy', VDT:'Verdant Retail', KYN:'Kynos Logistics' };

const T = {
  eqUp:[
    'Order books at {n} suppliers are filling faster than the guided run-rate. Somebody is preparing for volume.',
    'A specialist recruiter has been retained by {n} for a commercial build-out. Companies do that before good news, not after.',
    'Unusual call buying in {t} over the last two sessions, concentrated in near-dated strikes.',
    'Two sell-side analysts have quietly pulled their {t} numbers ahead of an update. Revisions are coming and they are not down.',
    'A {n} competitor flagged share loss in its last update without naming who to. It is {t}.'],
  eqDown:[
    'Two senior operators have left {n} in the past fortnight without replacements named.',
    'Trade credit insurers have reduced cover on {n} suppliers. That is usually the earliest external signal of trouble.',
    'Put volume in {t} is running at three times its average, in size, in the front month.',
    'A {n} regional manager has been briefing customers to expect delays. It has not reached the market yet.',
    'Inventory at {n} distributors is building while sell-through slows. The gap closes badly.'],
  ratesUp:[
    'Three policymakers used firmer language about inflation this week than the last minutes did. That shift usually precedes the data.',
    'The front end is barely priced for what the wage numbers imply. Positioning is on the wrong side of this.',
    'Two large employers have settled contracts well above target. Others follow within the quarter.',
    'Swap market flows have turned decisively toward paying fixed. Someone with better information is hedging.'],
  ratesDown:[
    'Leading indicators for growth have rolled over while the curve still prices tightening. One of those is wrong.',
    'An unscheduled policy meeting is on the calendar. That has historically meant one thing.',
    'Real money accounts have started extending duration quietly. They are early more often than not.',
    'Hiring and freight data both turned down together. That combination leads the policy response.'],
  oilUp:[
    'Shipping insurers have raised war risk premiums on one producing region. They price disruption before the news does.',
    'A producer group meeting has been brought forward and the agenda is undisclosed.',
    'Floating storage has drawn down sharply for three weeks. Physical is tighter than the curve implies.'],
  oilDown:[
    'Tanker tracking shows floating storage building again. Physical demand is not there.',
    'Refinery run rates are being cut quietly across two regions. Crude demand follows.',
    'Producer discipline is fraying. Two members are exceeding quota and nobody is enforcing it.'],
  creditWide:[
    'Protection on the weakest names traded several times normal volume yesterday. Somebody is buying insurance in size.',
    'Two deals were pulled from the primary market this week citing conditions. Issuance windows close before defaults arrive.',
    'Investment grade is widening faster than high yield. That inversion usually precedes a broad risk-off.',
    'Dealers have cut inventory hard. When they will not warehouse risk, spreads gap rather than drift.',
    'Bank funding spreads have widened quietly. That is what stress looks like before anyone announces it.'],
  creditTight:[
    'Inflows into credit funds have turned sharply positive for the first time in months.',
    'Spreads have overshot fundamentals. If policy responds this is the sharpest snap-back in the market.',
    'New issue concessions have collapsed, which means buyers are competing again.'],
  volUp:[
    'Index put skew has steepened noticeably. Someone is paying up for downside protection.',
    'Dealers are short gamma into the coming period. If the market moves, they amplify it.',
    'Correlation is at multi-year lows and short volatility positioning is at a record. That combination ends fast.',
    'Realised volatility has started to exceed implied for the first time in months. The surface has not caught up.'],
  volDown:[
    'Implied volatility is rich to anything realised has done in a year. Selling premium has good odds here.',
    'The event risk that kept the surface bid has passed without incident. Vol should bleed lower.',
    'Term structure has inverted, which historically marks the peak in fear rather than the start.'],
  nameVol:[
    'Implied volatility in {t} is pricing a far larger move than the sell-side expects. One of them is wrong.',
    'The options market in {t} is positioned for a binary outcome. Straddles are bid well through fair value.',
    'Skew in {t} has flipped: calls are now bid over puts, which is unusual for this name.']
};

// deterministic pick, so the same scenario always produces the same note
function pick(arr, seed){ return arr[Math.abs(seed) % arr.length]; }
function fill(s, t){ return s.replace(/\{t\}/g, t).replace(/\{n\}/g, NAMES[t] || t); }
function hash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return h; }

function autoHints(sc){
  const out = [];
  const seed = hash(sc.id);
  const d = sc.d || {};

  // equity analysts: any name with a move worth warning about. Set low enough
  // that off-theme analysts still get something in a tightly themed campaign.
  Object.entries(d)
    .filter(([,v]) => Math.abs(v) >= 0.05)
    .sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([t,v],i) => {
      out.push({ r:'EQUITY', re:t,
        t: fill(pick(v>0 ? T.eqUp : T.eqDown, seed+i*7), t) });
    });

  // macro: rates
  const rateMove = Math.abs(sc.r5) >= 0.20 || Math.abs(sc.r2) >= 0.25;
  if(rateMove){
    const up = (sc.r5 + sc.r2) > 0;
    out.push({ r:'MACRO', re:'rates', t: pick(up ? T.ratesUp : T.ratesDown, seed+3) });
  }
  // macro: oil, via the energy name
  if(Math.abs(d.ORC || 0) >= 0.08){
    out.push({ r:'MACRO', re:'oil', t: pick(d.ORC>0 ? T.oilUp : T.oilDown, seed+5) });
  }
  // credit
  if(Math.abs(sc.hy) >= 35 || Math.abs(sc.ig) >= 15){
    const wide = (sc.hy + sc.ig) > 0;
    out.push({ r:'CREDIT', re:'credit', t: pick(wide ? T.creditWide : T.creditTight, seed+11) });
  }
  // derivatives: index volatility
  if(Math.abs(sc.iv - 1) >= 0.12){
    out.push({ r:'DERIV', re:'index vol', t: pick(sc.iv>1 ? T.volUp : T.volDown, seed+13) });
  }
  // derivatives: single-name volatility, on the biggest mover
  const biggest = Object.entries(d).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];
  if(biggest && Math.abs(biggest[1]) >= 0.14){
    out.push({ r:'DERIV', re:'single-name vol', t: fill(pick(T.nameVol, seed+17), biggest[0]) });
  }
  return out;
}

/* Hand-written hints take priority; generated ones fill the gaps. */
function hintsFor(sc){
  if(!sc) return [];
  if(sc._hints) return sc._hints;                    // cached
  const written = sc.hint || [];
  const taken = new Set(written.map(h => h.r + '|' + h.re));
  const merged = written.concat(autoHints(sc).filter(h => !taken.has(h.r + '|' + h.re)));
  Object.defineProperty(sc, '_hints', { value: merged, enumerable: false });
  return merged;
}

module.exports = { SCENARIOS, CAMPAIGNS, NOISE, hintsFor };
