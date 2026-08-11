/* ============================================================
   FINANCIAL TRADING SYSTEM SIMULATOR
   Hedge fund trading simulation engine.
   Zero-dependency Node server.  Run:  node server.js

   Copyright (c) 2026 Tarush Bhusri. All rights reserved.

   This software and its accompanying materials are the exclusive property of
   Tarush Bhusri. Unauthorised use, reproduction, modification, distribution,
   public display or derivative work, in whole or in part, is strictly prohibited
   without the prior written permission of the copyright holder. Violations will be
   pursued to the fullest extent of applicable law, including civil action and
   criminal prosecution where available.
   ============================================================ */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { SCENARIOS, CAMPAIGNS, NOISE, hintsFor } = require('./scenarios.js');
const SCEN = Object.fromEntries(SCENARIOS.map(s=>[s.id,s]));

const PORT        = process.env.PORT || 8080;
const ADMIN_PASS  = process.env.ADMIN_PASS || 'simulator';
const NUM_TEAMS   = 17;
const START_CAP   = 100_000_000;      // $100mm per fund
const SAVE_FILE   = path.join(__dirname, 'gamestate.json');

/* ------------------------------------------------------------
   MATH — Black-Scholes
   ------------------------------------------------------------ */
function erf(x){
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t = 1/(1+p*x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return s*y;
}
const N  = x => 0.5*(1+erf(x/Math.SQRT2));
const np = x => Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI);

function bs(S,K,T,r,v,isCall){
  T = Math.max(T, 1/365); v = Math.max(v, 0.01);
  const sq = v*Math.sqrt(T);
  const d1 = (Math.log(S/K)+(r+0.5*v*v)*T)/sq;
  const d2 = d1 - sq;
  const df = Math.exp(-r*T);
  const price = isCall ? S*N(d1)-K*df*N(d2) : K*df*N(-d2)-S*N(-d1);
  return {
    price: Math.max(price, 0.01),
    delta: isCall ? N(d1) : N(d1)-1,
    gamma: np(d1)/(S*sq),
    vega : S*np(d1)*Math.sqrt(T)/100,
    theta: (-(S*np(d1)*v)/(2*Math.sqrt(T)) - (isCall?1:-1)*r*K*df*(isCall?N(d2):N(-d2)))/365
  };
}

/* ------------------------------------------------------------
   RNG — seeded so a session is reproducible if you want it
   ------------------------------------------------------------ */
let seed = 20260803;
function rnd(){ seed = (seed*1664525 + 1013904223) % 4294967296; return seed/4294967296; }
function gauss(){ let u=0,v=0; while(!u)u=rnd(); while(!v)v=rnd();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

/* ------------------------------------------------------------
   UNIVERSE
   ------------------------------------------------------------ */
/* Each company carries a business description and its sensitivities. Without
   these, a ticker and a sector label tell an analyst nothing, and they cannot
   reason about whether a given news event should hit their name or not. */
const EQUITIES = [
  { id:'HLX', name:'Helix Biosciences',  sector:'Healthcare', px:142.00, vol:0.42, beta:0.85, iv:0.44, shares:180,
    desc:'Mid-cap oncology biotech. Two approved drugs generate modest revenue, but most of the company\'s value sits in a single late-stage cancer therapy still awaiting trial results. It is a binary business: that asset works or it does not.',
    drivers:'Clinical trial outcomes · drug pricing regulation · patent expiry. Defensive in a downturn, since people do not stop taking cancer drugs in a recession.' },

  { id:'NVR', name:'Novara Semiconductor',sector:'Technology',px: 88.50, vol:0.38, beta:1.45, iv:0.40, shares:420,
    desc:'Designs high-performance chips for data centres and AI training. Owns no factories and depends on contract manufacturers overseas. Revenue is concentrated in a handful of very large cloud customers.',
    drivers:'AI and data-centre capital spending · export controls · chip inventory cycles · customer concentration. The highest-beta name here: it leads the market up and down.' },

  { id:'ATB', name:'Atlas Bancorp',      sector:'Financials', px: 54.25, vol:0.28, beta:1.20, iv:0.30, shares:600,
    desc:'Regional commercial bank. Lends heavily against office and retail property, and funds itself largely with uninsured corporate deposits. That combination is fine until it very suddenly is not.',
    drivers:'Interest rates and the shape of the curve · commercial property values · loan-loss provisions · deposit flight. The name most exposed to a credit event.' },

  { id:'ORC', name:'Orcus Energy',       sector:'Energy',     px: 71.80, vol:0.35, beta:0.95, iv:0.36, shares:340,
    desc:'Integrated oil and gas producer with its own refining arm. Cash flow tracks the crude price almost one-for-one. Carries a meaningful amount of high-yield debt, so it is sensitive to credit conditions as well as commodity prices.',
    drivers:'Crude prices · producer group supply decisions · refining margins · carbon policy and windfall taxes. Often the only thing that rises in a geopolitical shock.' },

  { id:'VDT', name:'Verdant Retail',     sector:'Consumer',   px: 33.10, vol:0.31, beta:1.05, iv:0.33, shares:520,
    desc:'Mid-market clothing and homeware chain with around 900 stores. Thin margins and a large fixed cost base mean small changes in sales translate into large changes in profit. Its customers are lower and middle income households.',
    drivers:'Consumer spending · real wages after inflation · inventory and discounting · the shift to online. First to feel a squeezed consumer.' },

  { id:'KYN', name:'Kynos Logistics',    sector:'Industrials',px: 46.90, vol:0.26, beta:0.90, iv:0.28, shares:290,
    desc:'Freight, trucking and warehousing operator moving goods for retailers and manufacturers. Fuel is its single largest variable cost, and volumes track industrial activity closely.',
    drivers:'Trade volumes and tariffs · fuel prices · port congestion and supply chains · manufacturing surveys. A read on the real economy rather than sentiment.' }
];

/* Context for the non-equity instruments, so nobody has to guess. */
const INSTRUMENT_NOTES = {
  GBX:'A futures contract on the Global 1000 index, which is the market-cap weighted basket of all six companies here. The standard way to take a view on the whole market, or to hedge one out.',
  CRD:'A futures contract on crude oil. Moves with global energy supply and demand. The natural hedge, or expression, for anything energy related.',
  IRS5:'A five-year interest rate swap. Going long means you receive a fixed rate and profit if interest rates fall. Roughly $4,600 of profit or loss per contract per basis point.',
  IRS2:'A two-year interest rate swap. Same idea as the five-year but shorter, so it responds to near-term policy decisions rather than long-run expectations.',
  'CDS-ORC':'Credit protection on Orcus Energy, a high-yield borrower. Buying it is insurance against Orcus failing to repay its debt: you profit if the market decides that is more likely.',
  'CDS-ATB':'Credit protection on Atlas Bancorp, an investment-grade borrower. Buying it profits if the bank\'s creditworthiness deteriorates. The cleanest way to be short a bank without shorting the shares.'
};

const STRIKE_OFFSETS = [-0.15, 0, 0.15];   // 15% OTM put-side, ATM, 15% OTM call-side
const OPT_EXPIRIES   = [3, 5, 7];          // fixed expiry rounds (short / mid / back month)

let M = {};   // market object, rebuilt each round

function initMarket(){
  M = {
    equities: {},
    rate5y  : 4.00,     // % — drives swaps
    rate2y  : 4.35,
    creditHY: 380,      // bp — drives CDS on ORC
    creditIG: 115,      // bp — drives CDS on ATB
    index   : 0,
    indexVol: 0.22
  };
  EQUITIES.forEach(e => M.equities[e.id] = { ...e });
  M.index = computeIndex();
}
function computeIndex(){
  let mc=0, base=0;
  EQUITIES.forEach(e=>{ mc += M.equities[e.id].px*e.shares; base += e.px*e.shares; });
  return 1000 * mc/base;
}

/* ------------------------------------------------------------
   INSTRUMENT BOOK — rebuilt from market each tick
   settle 'cash'   : pay/receive full premium (equities, options)
   settle 'margin' : post initial margin, P&L from price move (futures, swaps, CDS)
   ------------------------------------------------------------ */
function buildBook(round){
  const book = {};
  const r = M.rate5y/100;

  // --- Equities
  EQUITIES.forEach(e=>{
    const m = M.equities[e.id];
    book[e.id] = {
      id:e.id, kind:'EQUITY', label:`${e.id} · ${e.name}`, sector:e.sector,
      name:e.name, desc:e.desc, drivers:e.drivers,
      px:m.px, mult:1, settle:'cash', spreadBps:8,
      delta:1, gamma:0, vega:0, theta:0, iv:m.iv, beta:e.beta,
      under:e.id, marginRate:0.30
    };
  });

  // --- Index future (quarterly, cash settled)
  book['GBX'] = {
    id:'GBX', kind:'FUTURE', label:'GBX · Global 1000 Index Future', sector:'Index',
    px: M.index*Math.exp(r*0.25), mult:50, settle:'margin', spreadBps:4,
    delta:1, gamma:0, vega:0, theta:0, iv:M.indexVol, beta:1.0,
    under:'IDX', marginRate:0.10
  };
  // --- Energy future
  book['CRD'] = {
    id:'CRD', kind:'FUTURE', label:'CRD — Crude Oil Future', sector:'Commodity',
    px: 78.40 + (M.equities.ORC.px-71.80)*0.9, mult:1000, settle:'margin', spreadBps:6,
    delta:1, gamma:0, vega:0, theta:0, iv:0.34, beta:0.4,
    under:'OIL', marginRate:0.12
  };

  // --- Options on each equity + index
  const chain = [...EQUITIES.map(e=>({u:e.id, S:M.equities[e.id].px, iv:M.equities[e.id].iv, mult:100})),
                 {u:'GBX', S:M.index, iv:M.indexVol, mult:20}];
  chain.forEach(c=>{
    OPT_EXPIRIES.forEach(expRound=>{
      if (expRound <= round) return;                      // expired, no longer listed
      const T = Math.max((expRound - round)/4, 1/365);     // 1 round = 1 quarter
      /* Strikes are fixed when the round opens, never recomputed on a tick.
         Otherwise every 2-second price move would regenerate the ladder, the
         instrument IDs would change underneath people, and the chain would
         flicker while they were trying to click it. */
      const ladder = (M.strikes && M.strikes[c.u]) ||
                     STRIKE_OFFSETS.map(off=>Math.round(c.S*(1+off)*4)/4);
      ladder.forEach(K=>{
        ['C','P'].forEach(cp=>{
          const isCall = cp==='C';
          // skew: OTM puts richer
          const mny = Math.log(K/c.S);
          const iv  = Math.max(0.08, c.iv * (1 - 0.9*mny) );
          const g   = bs(c.S,K,T,M.rate5y/100,iv,isCall);
          const id  = `${c.u}-${cp}${K}-E${expRound}`;
          book[id] = {
            id, kind:'OPTION', label:`${c.u} ${cp==='C'?'Call':'Put'} ${K} exp R${expRound}`,
            sector:'Derivative', px:g.price, mult:c.mult, settle:'cash', spreadBps:60,
            delta:g.delta, gamma:g.gamma, vega:g.vega, theta:g.theta, iv,
            under:c.u, strike:K, expiryRound:expRound, cp, marginRate:1.0
          };
        });
      });
    });
  });

  // --- Interest rate swaps (price in points; long = receive fixed, gains when rates fall)
  book['IRS5'] = {
    id:'IRS5', kind:'SWAP', label:'IRS5 — 5y Receive-Fixed Swap (long = receive fixed)',
    sector:'Rates', px: 100 + (4.00 - M.rate5y)*4.6, mult:10000, settle:'margin', spreadBps:3,
    delta:0, gamma:0, vega:0, theta:0, iv:0, beta:-0.15, under:'RATE5', marginRate:0.05,
    note:'DV01 ≈ $4,600 per contract'
  };
  book['IRS2'] = {
    id:'IRS2', kind:'SWAP', label:'IRS2 — 2y Receive-Fixed Swap',
    sector:'Rates', px: 100 + (4.35 - M.rate2y)*1.9, mult:10000, settle:'margin', spreadBps:3,
    delta:0, gamma:0, vega:0, theta:0, iv:0, beta:-0.06, under:'RATE2', marginRate:0.03,
    note:'DV01 ≈ $1,900 per contract'
  };

  // --- CDS (price = spread in bp; long = BUY protection, gains when spreads widen)
  book['CDS-ORC'] = {
    id:'CDS-ORC', kind:'CDS', label:'CDS-ORC — Buy Protection on Orcus Energy (HY)',
    sector:'Credit', px: M.creditHY, mult:500, settle:'margin', spreadBps:200,
    delta:0, gamma:0, vega:0, theta:0, iv:0, beta:-0.35, under:'ORC', marginRate:0.08,
    note:'$500 P&L per 1bp; long = short credit'
  };
  book['CDS-ATB'] = {
    id:'CDS-ATB', kind:'CDS', label:'CDS-ATB — Buy Protection on Atlas Bancorp (IG)',
    sector:'Credit', px: M.creditIG, mult:500, settle:'margin', spreadBps:150,
    delta:0, gamma:0, vega:0, theta:0, iv:0, beta:-0.30, under:'ATB', marginRate:0.05,
    note:'$500 P&L per 1bp; long = short credit'
  };

  // attach the plain-English context every instrument should carry
  for(const i of Object.values(book)){
    if(INSTRUMENT_NOTES[i.id]) i.desc = INSTRUMENT_NOTES[i.id];
    if(i.kind==='OPTION'){
      // deliberately short: the full company profile lives on the equity row, and
      // repeating it across 126 option lines would triple the size of the book
      const u = EQUITIES.find(e=>e.id===i.under);
      i.desc = u
        ? `${i.cp==='C'?'A call':'A put'} on ${u.name}. You profit if ${i.under} ` +
          `${i.cp==='C'?'rises above':'falls below'} ${i.strike}. The most you can lose is the premium you pay.`
        : `${i.cp==='C'?'A call':'A put'} on the Global 1000 index at ${i.strike}. ` +
          `A view on, or a hedge against, the whole market rather than one company.`;
    }
  }
  return book;
}

/* ------------------------------------------------------------
   ROUND SELECTION — campaign, random, or facilitator-picked
   The 100-event library lives in scenarios.js. A session draws seven of them.
   ------------------------------------------------------------ */
const MAX_ROUNDS = 7;
const ROUND_MINS = [6,5,5,6,6,5,4];      // longer windows where more happens

function buildRounds(mode, campaignId){
  if(mode === 'random'){
    // keep it coherent: open calm, finish with a mark, vary the middle
    const calm = SCENARIOS.filter(s=>['macro','consumer','industrial','tech'].includes(s.cat));
    const mid  = SCENARIOS.filter(s=>!['tail'].includes(s.cat));
    const tail = SCENARIOS.filter(s=>s.cat==='tail' && s.id!=='QUARTER_END');
    const pick = a => a[Math.floor(Math.random()*a.length)].id;
    const out = [pick(calm)];
    while(out.length < 4){ const c = pick(mid); if(!out.includes(c)) out.push(c); }
    out.push(pick(tail));
    while(out.length < 6){ const c = pick(mid); if(!out.includes(c)) out.push(c); }
    out.push('QUARTER_END');
    return out;
  }
  const c = CAMPAIGNS.find(x=>x.id===campaignId) || CAMPAIGNS[0];
  return c.rounds.slice();
}

function scenarioFor(round){
  const id = (S.rounds||[])[round-1];
  return SCEN[id] || SCEN['QUARTER_END'];
}

/* ------------------------------------------------------------
   PRIVATE INTEL — the reason analysts exist
   Each analyst seat privately receives notes the PM cannot see. Notes mostly
   foreshadow the NEXT round's event, so a desk that reads them well positions
   ahead of the news. Some are deliberate red herrings, because a research
   process that never has to judge reliability teaches nothing.
   s:'signal' = it will play out.  s:'noise' = it will not.
   ------------------------------------------------------------ */
const COVERS = { EQUITY:['HLX','NVR','ATB','VDT'], MACRO:['rates','oil'],
                 CREDIT:['credit'], DERIV:['index vol','single-name vol'] };

/* Private research. Real signals come from the NEXT round's scenario, so a desk
   that reads its analysts positions ahead of the news. Everything else is noise
   from the pool, which is the point: analysts must judge, not just relay.

   newsMode controls how much information asymmetry exists between DESKS:
     'same' every team identical · 'role' same per role, all teams
     'full' every team gets a different draw                                   */
function hashStr(s){ let h=0; for(let i=0;i<String(s).length;i++) h=(h*31+String(s).charCodeAt(i))|0; return Math.abs(h); }

function intelFor(roleKey, slot, round, teamCode){
  if(!COVERS[roleKey]) return null;
  const covers = COVERS[roleKey];
  const cover  = covers[slot % covers.length];
  const next   = scenarioFor(round+1);
  const mode   = S.newsMode || 'role';

  /* A real signal if the coming event touches what this seat covers. Hints are
     hand-written where they exist and derived from the event's market impact
     otherwise, so every scenario briefs the desks it actually affects. */
  const hints = hintsFor(next);
  if(hints.length){
    const match = hints.find(h=>h.r===roleKey && (h.re===cover || covers.length===1));
    if(match && (mode!=='full' || hashStr(teamCode+round)%4 !== 0))
      return { round, cover:match.re, text:match.t, live:true };
  }
  const pool = NOISE[roleKey] || NOISE.EQUITY;
  const seed = mode==='same' ? round*7
             : mode==='role' ? round*7 + slot*13
             :                 round*7 + slot*13 + hashStr(teamCode)*3;
  return { round, cover, text: pool[seed % pool.length], live:false };
}

/* ------------------------------------------------------------
   RISK LIMITS
   ------------------------------------------------------------ */
const LIMITS = {
  grossExposure : 4.0,     // x NAV
  netExposure   : 2.0,     // x NAV  (abs)
  singleName    : 0.40,    // x NAV, abs delta-adjusted per underlying
  netVega       : 750_000, // $ per vol point, abs
  minCash       : -0.25    // cash may go to -25% NAV (margin/leverage floor)
};

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
let S = null;

function freshTeam(code){
  return {
    code, name:'', joined:false, bot:false, strategy:null,
    seats:{},            // token -> {role, person, lastSeen}
    ideas:[],            // the desk's ticket queue
    ideaSeq:1,
    cash: START_CAP, positions:{}, realized:0,
    navHistory:[START_CAP], breaches:[], trades:[], memo:'',
    lastSeen:0
  };
}

function freshState(){
  initMarket();
  const teams = {};
  for(let i=1;i<=NUM_TEAMS;i++){
    const code = 'TEAM'+String(i).padStart(2,'0');
    teams[code] = freshTeam(code);
  }
  return {
    phase:'lobby', round:0, roundEndsAt:0, roundLengthSec:360, lengthOverride:false,
    mode:'campaign', campaignId:'CLASSIC', rounds: buildRounds('campaign','CLASSIC'),
    newsMode:'role', paused:false, candles:{}, tickCount:0, priceVersion:0,
    book: buildBook(0), teams, news:[], log:[],
    startedAt: Date.now()
  };
}

/* ------------------------------------------------------------
   AUTH — one token per person, not per team
   Each member takes a named seat on their team's desk and gets a private token.
   Permissions follow the seat's role, so an analyst physically cannot execute.
   ------------------------------------------------------------ */
const newToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ------------------------------------------------------------
   DESK ROLES — 14 seats per team
   exec: 'full'    can execute anything, approves large tickets
         'limited' can execute below APPROVAL_THRESHOLD
         'none'    submits ideas only
   ------------------------------------------------------------ */
const APPROVAL_THRESHOLD = 0.10;   // fraction of NAV above which the PM must approve
const HOLD_SECS          = 45;     // a risk hold lapses after this, so it cannot deadlock

const ROLES = {
  PM:       { label:'Portfolio Manager',      cap:1, exec:'full',    poll:2000,
              desc:'Sole authority on large trades. Approves or rejects the queue.' },
  TRADER:   { label:'Execution Trader',       cap:1, exec:'limited', poll:2000,
              desc:'Executes tickets below the approval threshold. Works the blotter.' },
  RISK:     { label:'Risk Manager',           cap:1, exec:'none',    poll:2000, canHold:true,
              desc:'Owns the limit framework. Can hold any ticket with a written reason.' },
  RESEARCH: { label:'Head of Research',       cap:1, exec:'none',    poll:3000, canPromote:true,
              desc:'Triages analyst ideas. Only what you promote reaches the PM.' },
  EQUITY:   { label:'Equity Analyst',         cap:4, exec:'none',    poll:4000, focus:'EQUITY',
              desc:'Company research. Submit single-name ideas with a thesis.' },
  MACRO:    { label:'Macro & Rates Analyst',  cap:2, exec:'none',    poll:4000, focus:'RATES',
              desc:'Curve, swaps and futures. Submit macro expressions.' },
  CREDIT:   { label:'Credit Analyst',         cap:1, exec:'none',    poll:4000, focus:'CREDIT',
              desc:'CDS and spreads. Submit credit ideas.' },
  DERIV:    { label:'Derivatives Specialist', cap:2, exec:'none',    poll:4000, focus:'OPTION',
              desc:'Options chain and Greeks. Submit hedges and structures.' },
  SCRIBE:   { label:'Scribe',                 cap:1, exec:'none',    poll:5000,
              desc:'Writes the investment memo. Worth 15 points.' }
};
const SEATS_PER_TEAM = Object.values(ROLES).reduce((a,r)=>a+r.cap,0);   // 14

// Who acts as PM when the PM seat is empty. Also the order shown on the roster.
const SENIORITY = ['PM','TRADER','RESEARCH','RISK','DERIV','MACRO','CREDIT','EQUITY','SCRIBE'];
const FOCUS_KINDS = {
  EQUITY:['EQUITY'], RATES:['SWAP','FUTURE'],
  CREDIT:['CDS','EQUITY'], OPTION:['OPTION','EQUITY']
};

function seatRoles(s){ return s.roles || (s.role ? [s.role] : []); }

function seatCounts(t){
  const n = {};
  for(const k of Object.keys(ROLES)) n[k]=0;
  for(const s of Object.values(t.seats||{}))
    for(const r of seatRoles(s)) if(n[r]!=null) n[r]++;
  return n;
}

function rank(s){                                   // lower is more senior
  return Math.min(...seatRoles(s).map(r=>{
    const i = SENIORITY.indexOf(r); return i<0 ? 99 : i;
  }), 99);
}

/* ------------------------------------------------------------
   CAPABILITIES — permissions are the union of a person's seats,
   plus acting authority when the desk is short-staffed.
   A team of any size, down to one person, must be able to trade.
   ------------------------------------------------------------ */
function capabilities(t, seat){
  const roles = seatRoles(seat);
  let exec='none', canHold=false, canPromote=false, poll=5000;
  const labels=[], focuses=[];

  for(const k of roles){
    const r = ROLES[k]; if(!r) continue;
    if(r.exec==='full') exec='full';
    else if(r.exec==='limited' && exec!=='full') exec='limited';
    canHold    = canHold    || !!r.canHold;
    canPromote = canPromote || !!r.canPromote;
    poll = Math.min(poll, r.poll);
    labels.push(r.label);
    focuses.push(r.focus || null);
  }

  const all = Object.values(t.seats||{});
  const acting = [];

  // Nobody holds full execution authority: the most senior person acts as PM.
  // Without this a desk with no PM could never fill a large ticket.
  const hasPM = all.some(s=>seatRoles(s).some(k=>ROLES[k] && ROLES[k].exec==='full'));
  if(!hasPM && all.length){
    const best = Math.min(...all.map(rank));
    const contenders = all.filter(s=>rank(s)===best)
                          .sort((a,b)=>(a.joinedAt||0)-(b.joinedAt||0));
    if(contenders[0] === seat){ exec='full'; acting.push('Acting PM'); }
  }

  // Nobody triages: anyone who can execute may also promote. A full-exec seat
  // could always promote, so only flag this for the limited-authority case.
  const hasResearch = all.some(s=>seatRoles(s).some(k=>ROLES[k] && ROLES[k].canPromote));
  if(!hasResearch && exec!=='none' && !canPromote){
    canPromote = true;
    if(exec !== 'full') acting.push('Acting Head of Research');
  }

  // Book scope: any seat without a focus (PM, trader, risk, scribe) sees everything.
  let kinds = null;
  if(focuses.length && !focuses.includes(null)){
    kinds = [...new Set(focuses.flatMap(f=>FOCUS_KINDS[f]||[]))];
  }
  if(exec==='full') kinds = null;      // an acting PM needs the whole market

  return { exec, canHold, canPromote, poll, labels, kinds, acting, roles };
}

function auth(q){
  const t = S.teams[String(q.code||'').toUpperCase()];
  if(!t) return {err:'Invalid team code'};
  const s = (t.seats||{})[q.token];
  if(!s) return {err:'Your seat is no longer active. Log in again.'};
  s.lastSeen = Date.now();
  t.lastSeen = Date.now();
  return {t, seat:s, cap:capabilities(t,s)};
}

/* ------------------------------------------------------------
   PER-ROUND TASK — nobody gets to spectate
   Every seat owns one obligation each round. It takes seconds, but it means
   there is never a person on the desk with nothing to do.
   ------------------------------------------------------------ */
function taskFor(t, seat, cap){
  const r = S.round;
  if(!r) return null;
  const done = (seat.tasks||{})[r];
  const roles = seatRoles(seat);
  const analyst = roles.find(k=>COVERS[k]);

  if(analyst){
    const cover = COVERS[analyst][(seat.slot||0) % COVERS[analyst].length];
    return { kind:'call', cover, done:!!done,
      label:`Submit your call on ${cover}`,
      help:'Up, down or flat by the end of this round. You are scored on whether you were right.' };
  }
  if(cap.canHold)   return { kind:'riskcheck', done:!!done,
      label:'File this round\'s risk check',
      help:'Review the limit meters and either flag a concern or sign off as all clear.' };
  if(cap.canPromote)return { kind:'triage', done:!!done,
      label:'Clear the ticket queue',
      help:'Promote or reject at least one ticket so the PM sees a filtered list.' };
  if(roles.includes('SCRIBE')) return { kind:'log', done:!!done,
      label:'Log one decision from this round',
      help:'One line on what the desk did and why. This becomes your memo.' };
  return null;   // PM and trader are busy enough
}

function markTask(seat){
  seat.tasks = seat.tasks || {};
  seat.tasks[S.round] = true;
}

/* Score analyst calls once the next round's prices are known. */
function scoreCalls(prevPx){
  for(const t of Object.values(S.teams)){
    for(const seat of Object.values(t.seats||{})){
      const c = (seat.calls||{})[S.round-1];
      if(!c || c.scored) continue;
      const id = c.cover;
      const before = prevPx[id], after = M.equities[id] && M.equities[id].px;
      if(before == null || after == null){ c.scored = true; continue; }
      const move = (after-before)/before;
      const actual = move > 0.02 ? 'UP' : move < -0.02 ? 'DOWN' : 'FLAT';
      c.actual = actual; c.move = move; c.scored = true;
      c.right = (c.dir === actual);
      seat.score = seat.score || { right:0, wrong:0, filled:0, holds:0 };
      if(c.right) seat.score.right++; else seat.score.wrong++;
    }
  }
}

function personalPoints(seat){
  const s = seat.score || {};
  return (s.right||0)*10 - (s.wrong||0)*2 + (s.filled||0)*4 + (s.holds||0)*6;
}

function save(){ try{ fs.writeFileSync(SAVE_FILE, JSON.stringify({S, M, seed})); }catch(e){} }
/* Saved state from an earlier build can have the old shape: `seats` as a counter
   and a single `token` per team. Normalise on load so a redeploy over a live
   service degrades to "everyone logs in again" rather than breaking seating. */
function migrate(st){
  if(!st || !st.teams) return st;
  for(const t of Object.values(st.teams)){
    if(typeof t.seats !== 'object' || t.seats === null) t.seats = {};
    for(const [tok,s] of Object.entries(t.seats)){
      if(!s || typeof s !== 'object'){ delete t.seats[tok]; continue; }
      if(!s.roles) s.roles = s.role ? [s.role] : ['PM'];
      if(!s.joinedAt) s.joinedAt = Date.now();
    }
    delete t.token;
    if(!Array.isArray(t.ideas)) t.ideas = [];
    if(!t.ideaSeq) t.ideaSeq = (t.ideas.reduce((a,i)=>Math.max(a,i.id||0),0)) + 1;
    if(!Array.isArray(t.navHistory) || !t.navHistory.length) t.navHistory = [START_CAP];
    if(!Array.isArray(t.pushed)) t.pushed = [];
  }
  if(!st.bookVersion) st.bookVersion = 1;
  if(!st.rounds || !st.rounds.length) st.rounds = buildRounds('campaign','CLASSIC');
  if(!st.candles) st.candles = {};
  if(!st.newsMode) st.newsMode = 'role';
  return st;
}

function load(){
  try{
    const d = JSON.parse(fs.readFileSync(SAVE_FILE,'utf8'));
    S = migrate(d.S); M = d.M; seed = d.seed;
    if(!S || !S.teams) return false;
    S.book = buildBook(S.round || 0);      // rebuild against the running code
    retainHeldOptions(S.book, S.round || 0);
    return true;
  }catch(e){ return false; }
}

/* ------------------------------------------------------------
   PORTFOLIO ANALYTICS
   ------------------------------------------------------------ */
function markToMarket(t){
  let mv=0, marginUsed=0, gross=0, net=0, vega=0, gamma=0, theta=0;
  const byUnder = {};
  const rows = [];

  for(const [id,p] of Object.entries(t.positions)){
    if(!p.qty) continue;
    const inst = S.book[id];
    if(!inst) continue;
    const notional = inst.px * p.qty * inst.mult;
    const deltaNotional = (inst.kind==='OPTION')
      ? inst.delta * p.qty * inst.mult * (S.book[inst.under] ? S.book[inst.under].px : inst.strike)
      : (inst.kind==='SWAP'||inst.kind==='CDS') ? notional * 0.25 : notional;

    let value=0, upl=0;
    if(inst.settle==='cash'){ value = notional; mv += value; }
    else { upl = (inst.px - p.avg) * p.qty * inst.mult; mv += upl;
           marginUsed += Math.abs(notional) * inst.marginRate; }

    gross += Math.abs(deltaNotional);
    net   += deltaNotional;
    vega  += (inst.vega||0) * p.qty * inst.mult;
    gamma += (inst.gamma||0) * p.qty * inst.mult;
    theta += (inst.theta||0) * p.qty * inst.mult;
    byUnder[inst.under] = (byUnder[inst.under]||0) + deltaNotional;

    rows.push({ id, label:inst.label, kind:inst.kind, qty:p.qty, avg:p.avg, px:inst.px,
                mult:inst.mult, settle:inst.settle, value, upl,
                pnl: inst.settle==='cash' ? (inst.px-p.avg)*p.qty*inst.mult : upl,
                delta:deltaNotional, vega:(inst.vega||0)*p.qty*inst.mult });
  }
  const nav = t.cash + mv;
  return { nav, mv, marginUsed, gross, net, vega, gamma, theta, byUnder, rows };
}

function checkLimits(t, a){
  const b = [];
  if(a.nav<=0) { b.push('INSOLVENT'); return b; }
  if(a.gross/a.nav > LIMITS.grossExposure)        b.push(`Gross exposure ${(a.gross/a.nav).toFixed(2)}x > ${LIMITS.grossExposure}x`);
  if(Math.abs(a.net)/a.nav > LIMITS.netExposure)  b.push(`Net exposure ${(a.net/a.nav).toFixed(2)}x > ±${LIMITS.netExposure}x`);
  if(Math.abs(a.vega) > LIMITS.netVega)           b.push(`Net vega $${Math.round(a.vega).toLocaleString()} > ±$${LIMITS.netVega.toLocaleString()}`);
  for(const [u,d] of Object.entries(a.byUnder)){
    if(Math.abs(d)/a.nav > LIMITS.singleName)     b.push(`${u} concentration ${(Math.abs(d)/a.nav*100).toFixed(0)}% > ${LIMITS.singleName*100}%`);
  }
  if(t.cash/a.nav < LIMITS.minCash)               b.push(`Cash ${(t.cash/a.nav*100).toFixed(0)}% of NAV below ${LIMITS.minCash*100}% floor`);
  return b;
}

/* ------------------------------------------------------------
   TRADING
   ------------------------------------------------------------ */
function executeTrade(team, instId, qty){
  if(S.phase!=='open') return {ok:false, msg:'Market is closed.'};
  const inst = S.book[instId];
  if(!inst) return {ok:false, msg:'Unknown instrument.'};
  qty = Math.round(Number(qty));
  if(!qty || !isFinite(qty)) return {ok:false, msg:'Invalid quantity.'};
  if(Math.abs(qty) > MAX_ORDER)
    return {ok:false, msg:`Maximum ${MAX_ORDER.toLocaleString()} units per order. Split it into two tickets.`};

  // cross the spread
  const half = inst.spreadBps/10000;
  const fill = inst.px * (1 + (qty>0? half : -half));

  const p = team.positions[instId] || {qty:0, avg:0};
  const before = p.qty;

  if(inst.settle==='cash'){
    const cost = fill*qty*inst.mult;
    if(team.cash - cost < -0.30*Math.max(markToMarket(team).nav,1))
      return {ok:false, msg:'Insufficient cash / borrow capacity for this trade.'};
    team.cash -= cost;
  } else {
    const analytics = markToMarket(team);
    const addMargin = Math.abs(fill*qty*inst.mult)*inst.marginRate;
    if(analytics.nav - analytics.marginUsed - addMargin < 0)
      return {ok:false, msg:'Insufficient margin capacity for this trade.'};
    // realise P&L on the closing portion
    if(before !== 0 && Math.sign(qty) !== Math.sign(before)){
      const closed = Math.min(Math.abs(qty), Math.abs(before)) * Math.sign(before);
      const r = (fill - p.avg) * closed * inst.mult;
      team.cash += r; team.realized += r;
    }
  }

  // weighted average entry
  if(before === 0 || Math.sign(qty) === Math.sign(before)){
    p.avg = (p.avg*Math.abs(before) + fill*Math.abs(qty)) / (Math.abs(before)+Math.abs(qty));
  } else if(Math.abs(qty) > Math.abs(before)){
    p.avg = fill;
  }
  p.qty = before + qty;
  if(p.qty === 0){ delete team.positions[instId]; } else { team.positions[instId] = p; }

  const rec = { t:Date.now(), round:S.round, inst:instId, label:inst.label, qty, px:fill,
                notional: fill*qty*inst.mult };
  team.trades.push(rec);
  S.log.unshift({ t:Date.now(), team:team.code, name:team.name,
                  msg:`${qty>0?'BUY':'SELL'} ${Math.abs(qty)} ${instId} @ ${fill.toFixed(2)}` });
  S.log = S.log.slice(0,300);
  return {ok:true, msg:`Filled ${qty>0?'BUY':'SELL'} ${Math.abs(qty)} ${instId} @ ${fill.toFixed(2)}`, fill};
}

/* ------------------------------------------------------------
   IDEA QUEUE — the desk workflow
   Analyst submits → Head of Research promotes → PM approves → fills.
   Small tickets can be filled by the Execution Trader without the PM.
   Risk can hold anything, but a hold lapses so it cannot jam a round.
   ------------------------------------------------------------ */
function ticketNotional(t, inst, qty){
  const i = S.book[inst];
  if(!i) return 0;
  return Math.abs(i.px * qty * i.mult);
}
function isLarge(t, inst, qty){
  const nav = Math.max(markToMarket(t).nav, 1);
  return ticketNotional(t, inst, qty) / nav >= APPROVAL_THRESHOLD;
}
function liveHold(idea){
  return idea.heldAt && (Date.now() - idea.heldAt) < HOLD_SECS*1000;
}
function ideaView(t){
  return (t.ideas||[]).slice(-40).reverse().map(i=>({
    ...i,
    held: liveHold(i),
    holdSecsLeft: liveHold(i) ? Math.ceil(HOLD_SECS - (Date.now()-i.heldAt)/1000) : 0
  }));
}

function submitIdea(t, seat, cap, inst, qty, thesis){
  if(!S.book[inst]) return {ok:false, msg:'Unknown instrument.'};
  qty = Math.round(Number(qty));
  if(!qty || !isFinite(qty)) return {ok:false, msg:'Enter a quantity.'};
  if(!thesis || String(thesis).trim().length < 15)
    return {ok:false, msg:'Give the PM a one-line thesis, at least 15 characters.'};
  const open = (t.ideas||[]).filter(i=>i.status==='pending'||i.status==='promoted').length;
  if(open >= 25) return {ok:false, msg:'The queue is full. Wait for the desk to clear some.'};

  const idea = {
    id: t.ideaSeq++, inst, qty,
    label: S.book[inst].label,
    thesis: String(thesis).slice(0,240),
    from: seat.person, role: seatRoles(seat)[0] || 'EQUITY',
    large: isLarge(t, inst, qty),
    status: 'pending', t: Date.now(),
    heldAt: null, holdNote: '', note: ''
  };
  t.ideas.push(idea);
  return {ok:true, msg:`Ticket #${idea.id} submitted to the desk.`, id:idea.id};
}

function actOnIdea(t, seat, cap, id, action, note){
  const idea = (t.ideas||[]).find(i=>i.id === Number(id));
  if(!idea) return {ok:false, msg:'Ticket not found.'};
  if(idea.status==='filled' || idea.status==='rejected')
    return {ok:false, msg:'That ticket is already closed.'};

  const role = cap;

  if(action==='hold'){
    if(!role.canHold) return {ok:false, msg:'Only the Risk Manager can hold a ticket.'};
    idea.heldAt = Date.now();
    idea.holdNote = String(note||'').slice(0,140) || 'Held by risk.';
    idea.status = 'held';
    idea.heldBy = seat.person;
    // a hold on a ticket that would have breached a limit is the job done well
    const a = markToMarket(t);
    if(isLarge(t, idea.inst, idea.qty) || checkLimits(t,a).length){
      seat.score = seat.score||{right:0,wrong:0,filled:0,holds:0}; seat.score.holds++;
    }
    return {ok:true, msg:`Ticket #${idea.id} held for ${HOLD_SECS}s.`};
  }
  if(action==='unhold'){
    if(!role.canHold) return {ok:false, msg:'Only the Risk Manager can lift a hold.'};
    idea.heldAt = null; idea.status = idea.note ? 'promoted' : 'pending';
    return {ok:true, msg:`Hold lifted on #${idea.id}.`};
  }
  if(action==='promote'){
    if(!role.canPromote && role.exec!=='full')
      return {ok:false, msg:'Only the Head of Research or the PM can promote a ticket.'};
    if(idea.from === seat.person && !role.canPromote && role.exec!=='full')
      return {ok:false, msg:'You cannot promote your own idea.'};
    idea.status = 'promoted';
    idea.note = String(note||'').slice(0,140);
    return {ok:true, msg:`Ticket #${idea.id} promoted to the PM.`};
  }
  if(action==='reject'){
    if(role.exec==='none' && !role.canPromote)
      return {ok:false, msg:'You cannot reject tickets.'};
    idea.status = 'rejected';
    idea.note = String(note||'').slice(0,140);
    return {ok:true, msg:`Ticket #${idea.id} rejected.`};
  }
  if(action==='approve'){
    if(role.exec==='none') return {ok:false, msg:'You cannot execute. Ask the PM or the trader.'};
    if(liveHold(idea))
      return {ok:false, msg:`Risk is holding this ticket: ${idea.holdNote}`};
    if(role.exec==='limited' && isLarge(t, idea.inst, idea.qty))
      return {ok:false, msg:`Above ${APPROVAL_THRESHOLD*100}% of NAV. This one needs the PM.`};

    const r = executeTrade(t, idea.inst, idea.qty);
    if(!r.ok) return r;
    idea.status = 'filled';
    idea.filledBy = seat.person;
    idea.fillPx = r.fill;
    // credit the analyst whose idea it was, not the person who clicked fill
    for(const s of Object.values(t.seats||{})){
      if(s.person === idea.from){ s.score = s.score||{right:0,wrong:0,filled:0,holds:0}; s.score.filled++; }
    }
    return {ok:true, msg:`#${idea.id} ${r.msg}`};
  }
  return {ok:false, msg:'Unknown action.'};
}

/* ------------------------------------------------------------
   DEMO MODE — 16 bot funds so you can rehearse with a real leaderboard
   Each bot runs a distinct archetype and trades every round. They exist to make
   the monitor, leaderboard and scorecard look like a live session while you play
   TEAM01 yourself. They use their own RNG so adding them never changes the
   market path.
   ------------------------------------------------------------ */
let botSeed = 987654321;
function brnd(){ botSeed = (botSeed*1664525 + 1013904223) % 4294967296; return botSeed/4294967296; }
const bpick = a => a[Math.floor(brnd()*a.length)];

const BOT_FUNDS = [
  ['Ridgeline Partners','hedged_equity'], ['Blackvane Capital','long_beta'],
  ['Kestrel Asset Mgmt','tail_hedge'],    ['Perihelion Fund','vol_seller'],
  ['Ironwood Global','rates_carry'],      ['Saxon Ridge','credit_short'],
  ['Halcyon Alpha','momentum'],           ['Cairnstone LP','mean_revert'],
  ['Northgate Macro','rates_carry'],      ['Vellum Partners','hedged_equity'],
  ['Drayton Capital','long_beta'],        ['Ashgrove Fund','vol_seller'],
  ['Lattice Point','tail_hedge'],         ['Bellweather LP','momentum'],
  ['Quarry Lane','credit_short'],         ['Sable Ridge Capital','levered_directional']
];

const BOT_MEMOS = {
  hedged_equity:'Core long book in quality names with an index futures overlay sized to keep net exposure near one turn. The overlay cost us on the way up but meant we carried risk through the drawdown without breaching limits. Would size the hedge dynamically off realised vol rather than holding it static across the whole quarter.',
  long_beta:'Straight directional long book, concentrated in high-beta names on the view that policy support arrives before fundamentals break. No hedge. That was the call and it cut both ways: full participation in the rally and full participation in the drawdown. In hindsight a cheap put spread would have cost little and bought optionality.',
  tail_hedge:'Long equity funded partly by carry, with out-of-the-money index puts held as a standing tail hedge. The hedge bled premium for the first half and paid for itself several times over in the cascade. Key mistake was not monetising the puts at the low, we held them into the reversal and gave back most of the gain.',
  vol_seller:'Systematic short volatility, selling out-of-the-money strangles for premium against a modest long delta. Worked cleanly while realised vol stayed under implied, then the correlation event repriced the whole surface against us. Position sizing off vega rather than notional would have limited the damage materially.',
  rates_carry:'Expressed the macro view through the curve rather than equities: receive fixed at the five year point, funded flat, sized to a DV01 budget. The inflation print hurt initially but the policy response validated the trade. Modest equity sleeve alongside for beta. Cleanest risk-adjusted return of anything we looked at.',
  credit_short:'Bought protection on the weakest balance sheet in the coverage set and paired it with a modest equity short in the same name. Capital structure expression of a single thesis. Provisioning news validated it and spreads did the work. Should have taken profit into the widening rather than holding through the policy response.',
  momentum:'Rules-based: add to whatever outperformed the prior quarter, cut whatever lagged. Captured the biotech and semiconductor moves cleanly. The weakness is well known and showed up here too, the strategy is structurally long at the top and short at the bottom, so the reversal round was expensive.',
  mean_revert:'Bought the biggest decliners each quarter on the assumption that dislocation creates value. Worked on the idiosyncratic selloffs where the move was sentiment, failed badly on the bank where the move was a genuine impairment. The lesson is that mean reversion needs a solvency filter before it is safe to run.',
  levered_directional:'Maximum permitted gross, concentrated directional risk, no hedge. The objective was to test the limit framework rather than to run a survivable book. It breached concentration and gross repeatedly and the drawdown penalty reflects that. Instructive as a demonstration of why the limits exist.'
};

const MAX_ORDER = 500000;      // also enforced in executeTrade
function botQty(nav, px, mult, frac){
  // Clamp to the order-size cap. A 45% position in a $33 stock needs 1.7m
  // shares, which the cap rejects, and the bot would silently do nothing.
  const q = Math.floor((nav*frac)/(px*mult));
  return Math.min(MAX_ORDER, Math.max(1, q));
}

function runBots(){
  const B = S.book;
  const eqIds = EQUITIES.map(e=>e.id);
  const prev = S.prevPx || {};

  for(const t of Object.values(S.teams)){
    if(!t.bot) continue;
    const a0 = markToMarket(t);
    const nav = a0.nav;
    if(nav <= 5_000_000) continue;                 // effectively blown up, stop trading

    const strat = t.strategy;
    const jitter = 0.7 + brnd()*0.6;               // no two bots size identically
    const eqPick = () => bpick(eqIds);
    const put  = u => Object.values(B).find(i=>i.kind==='OPTION'&&i.under===u&&i.cp==='P'&&i.expiryRound>S.round);
    const call = u => Object.values(B).find(i=>i.kind==='OPTION'&&i.under===u&&i.cp==='C'&&i.expiryRound>S.round);
    const go = (id, frac) => { const i=B[id]; if(!i) return;
      executeTrade(t, id, Math.sign(frac)*botQty(nav, i.px, i.mult, Math.abs(frac)*jitter)); };

    switch(strat){
      case 'hedged_equity':
        go(eqPick(), 0.30); go(eqPick(), 0.25);
        go('GBX', -0.35);
        break;

      case 'long_beta':
        go(eqPick(), 0.40); go(eqPick(), 0.30); go(eqPick(), 0.20);
        break;

      case 'tail_hedge': {
        go(eqPick(), 0.35); go(eqPick(), 0.25);
        const p = put('GBX'); if(p) go(p.id, 0.02);
        break;
      }

      case 'vol_seller': {
        const c = call(eqPick()), p = put(eqPick());
        if(c) go(c.id, -0.012);
        if(p) go(p.id, -0.012);
        go(eqPick(), 0.20);
        break;
      }

      case 'rates_carry':
        go('IRS5', 0.55); go(eqPick(), 0.20);
        if(brnd()<0.4) go('IRS2', 0.25);
        break;

      case 'credit_short':
        go('CDS-ORC', 0.25);
        if(brnd()<0.5) go('CDS-ATB', 0.20);
        go(eqPick(), -0.15);
        break;

      case 'momentum': {
        const ranked = eqIds.slice().sort((x,y)=>
          ((B[y].px/(prev[y]||B[y].px))-1) - ((B[x].px/(prev[x]||B[x].px))-1));
        const spread = Math.abs((B[ranked[0]].px/(prev[ranked[0]]||B[ranked[0]].px)) -
                                (B[ranked[5]].px/(prev[ranked[5]]||B[ranked[5]].px)));
        // round one has no prior move to rank on, so open a starter book instead
        if(spread < 0.001){ go(eqPick(), 0.30); go(eqPick(), 0.20); }
        else go(ranked[0], 0.45);
        break;
      }

      case 'mean_revert': {
        const ranked = eqIds.slice().sort((x,y)=>
          ((B[x].px/(prev[x]||B[x].px))-1) - ((B[y].px/(prev[y]||B[y].px))-1));
        const spread = Math.abs((B[ranked[0]].px/(prev[ranked[0]]||B[ranked[0]].px)) -
                                (B[ranked[5]].px/(prev[ranked[5]]||B[ranked[5]].px)));
        if(spread < 0.001){ go(eqPick(), 0.30); go(eqPick(), 0.20); }
        else go(ranked[0], 0.45);
        break;
      }

      case 'levered_directional':
        go('GBX', 1.60); go(eqPick(), 0.60);
        break;
    }

    // occasional profit-taking so blotters and realised P&L look lived-in
    if(brnd() < 0.35){
      const open = Object.entries(t.positions).filter(([,p])=>p.qty);
      if(open.length){
        const [id,p] = bpick(open);
        executeTrade(t, id, -Math.round(p.qty*(0.3+brnd()*0.4)) || -Math.sign(p.qty));
      }
    }
  }
}

function fillDemoTeams(){
  let n = 0;
  for(let i=2;i<=NUM_TEAMS;i++){                   // TEAM01 left free for you
    const code = 'TEAM'+String(i).padStart(2,'0');
    const t = S.teams[code];
    if(!t || t.joined) continue;                   // never overwrite a real team
    const [name, strat] = BOT_FUNDS[n % BOT_FUNDS.length];
    t.name = name; t.joined = true; t.bot = true; t.strategy = strat;
    t.seats = {};                                  // no person occupies a bot desk
    t.memo = BOT_MEMOS[strat] || '';
    n++;
  }
  // bots trade immediately if the market is already open
  if(S.phase === 'open') runBots();
  return n;
}

/* ------------------------------------------------------------
   ROUND ENGINE
   ------------------------------------------------------------ */
/* Options are struck off the prevailing spot each round, so a strike that existed
   last round may not be regenerated. Any option a team still holds must survive in
   the book (repriced) until it expires, or the position would be stranded. */
function retainHeldOptions(book, round){
  const held = new Set();
  for(const t of Object.values(S.teams))
    for(const [id,p] of Object.entries(t.positions)) if(p.qty) held.add(id);

  for(const id of held){
    if(book[id]) continue;
    const m = /^(.+)-([CP])([\d.]+)-E(\d+)$/.exec(id);
    if(!m) continue;
    const [,under,cp,kStr,eStr] = m;
    const K = Number(kStr), expiryRound = Number(eStr);
    const isCall = cp==='C';
    const S0   = under==='GBX' ? M.index : (M.equities[under] ? M.equities[under].px : K);
    const bIv  = under==='GBX' ? M.indexVol : (M.equities[under] ? M.equities[under].iv : 0.30);
    const mult = under==='GBX' ? 20 : 100;
    const T    = Math.max((expiryRound - round)/4, 1/365);
    const iv   = Math.max(0.08, bIv * (1 - 0.9*Math.log(K/S0)));
    const g    = bs(S0, K, T, M.rate5y/100, iv, isCall);
    book[id] = {
      id, kind:'OPTION', label:`${under} ${isCall?'Call':'Put'} ${K} exp R${expiryRound}`,
      sector:'Derivative', px:g.price, mult, settle:'cash', spreadBps:60,
      delta:g.delta, gamma:g.gamma, vega:g.vega, theta:g.theta, iv,
      under, strike:K, expiryRound, cp, marginRate:1.0, legacy:true
    };
  }
}

function expireOptions(){
  for(const t of Object.values(S.teams)){
    for(const [id,p] of Object.entries({...t.positions})){
      const inst = S.book[id];
      if(!inst || inst.kind!=='OPTION') continue;
      if(inst.expiryRound > S.round) continue;
      const u = inst.under==='GBX' ? M.index : M.equities[inst.under].px;
      const intr = inst.cp==='C' ? Math.max(u-inst.strike,0) : Math.max(inst.strike-u,0);
      t.cash += intr * p.qty * inst.mult;
      delete t.positions[id];
      S.log.unshift({ t:Date.now(), team:t.code, name:t.name,
        msg:`EXPIRY ${id} settled at ${intr.toFixed(2)} (${p.qty} lots)` });
    }
  }
}

/* ------------------------------------------------------------
   LIVE TICK ENGINE
   Prices move every TICK_MS toward the round's target with noise on top, so
   the market is alive between rounds rather than frozen. Candles are recorded
   for charting and streamed to clients as deltas.
   ------------------------------------------------------------ */
const TICK_MS      = 2000;
const CANDLE_TICKS = 3;        // one candle per 6 seconds
const MAX_CANDLES  = 400;
const SERIES = ['HLX','NVR','ATB','ORC','VDT','KYN','IDX'];

function seriesPx(id){
  return id==='IDX' ? M.index : (M.equities[id] ? M.equities[id].px : 0);
}
/* Freeze the option strike ladder for the round. Called when a round opens. */
function setStrikes(){
  M.strikes = {};
  EQUITIES.forEach(e=>{
    const S0 = M.equities[e.id].px;
    M.strikes[e.id] = STRIKE_OFFSETS.map(o=>Math.round(S0*(1+o)*4)/4);
  });
  M.strikes['GBX'] = STRIKE_OFFSETS.map(o=>Math.round(M.index*(1+o)*4)/4);
}

function openCandles(){
  S.candles = S.candles || {};
  SERIES.forEach(id=>{
    S.candles[id] = S.candles[id] || [];
    const p = seriesPx(id);
    S.candles[id].push({ t:Date.now(), o:p, h:p, l:p, c:p, r:S.round });
    if(S.candles[id].length > MAX_CANDLES) S.candles[id].shift();
  });
  S.tickCount = 0;
}
function recordCandles(){
  S.candles = S.candles || {};
  const newBar = (S.tickCount % CANDLE_TICKS) === 0;
  SERIES.forEach(id=>{
    const arr = S.candles[id] = S.candles[id] || [];
    const p = seriesPx(id);
    if(newBar || !arr.length){
      arr.push({ t:Date.now(), o:p, h:p, l:p, c:p, r:S.round });
      if(arr.length > MAX_CANDLES) arr.shift();
    } else {
      const b = arr[arr.length-1];
      b.c = p; b.h = Math.max(b.h,p); b.l = Math.min(b.l,p);
    }
  });
}

function tickMarket(){
  if(S.phase !== 'open') return;
  if(S.roundEndsAt && Date.now() > S.roundEndsAt){ S.phase='closed'; return; }
  const T = M.target || {};
  const pull = 0.045;                       // convergence speed toward target

  EQUITIES.forEach(e=>{
    const m = M.equities[e.id];
    const tgt = T[e.id] != null ? T[e.id] : m.px;
    const drift = (tgt - m.px) * pull;
    const noise = m.px * gauss() * m.vol * 0.010;   // per-tick jitter
    m.px = Math.max(0.5, m.px + drift + noise);
  });
  const step = (cur, tgt, sd) =>
    tgt == null ? cur : cur + (tgt-cur)*pull + gauss()*sd;
  M.rate5y   = step(M.rate5y,   T.rate5y,   0.004);
  M.rate2y   = step(M.rate2y,   T.rate2y,   0.005);
  M.creditHY = Math.max(60, step(M.creditHY, T.creditHY, 0.8));
  M.creditIG = Math.max(25, step(M.creditIG, T.creditIG, 0.4));
  M.index    = computeIndex();

  // reprice the traded book off the new levels
  const held = S.book;
  S.book = buildBook(S.round);
  retainHeldOptions(S.book, S.round);
  if(held) for(const id of Object.keys(held)) if(!S.book[id] && held[id].legacy) S.book[id]=held[id];

  S.tickCount = (S.tickCount||0) + 1;
  recordCandles();
  S.priceVersion = (S.priceVersion||0) + 1;
}

/* Compact price map: the only thing that has to travel every poll. Scoped to
   what this seat can actually see, so an equity analyst is not paged 126 option
   prices they have no use for. */
function priceMap(visible){
  const p = {};
  const list = visible || Object.values(S.book);
  for(const i of list) p[i.id] = Math.round(i.px*100)/100;
  return p;
}

function advanceRound(){
  if(S.round >= MAX_ROUNDS){ endGame(); return; }
  // snapshot prices before the move so momentum bots have something to read
  S.prevPx = Object.fromEntries(EQUITIES.map(e=>[e.id, M.equities[e.id].px]));
  const pricesBefore = { ...S.prevPx };
  S.round++;
  if(S.round === 1) S.gameStartedAt = Date.now();
  const sc = scenarioFor(S.round);
  const d  = sc.d || {};

  /* News gaps, then drifts. About 45% of the move lands immediately, the way a
     market reprices on a headline. The rest is set as a target and the tick
     engine walks prices there across the round, so charts have something real
     to show and reacting quickly is worth something. */
  const GAP = 0.45;
  M.target = M.target || {};
  EQUITIES.forEach(e=>{
    const m = M.equities[e.id];
    const shock = (d[e.id]||0);
    const idio  = gauss()*m.vol*0.20*Math.sqrt(0.25);
    const full  = m.px * (1 + shock + idio);
    m.px = Math.max(0.5, m.px + (full - m.px)*GAP);
    M.target[e.id] = Math.max(0.5, full);
    m.iv = Math.min(1.5, Math.max(0.08, m.iv * sc.iv * (1 + gauss()*0.05)));
  });
  M.indexVol = Math.min(1.2, Math.max(0.07, M.indexVol*sc.iv*(1+gauss()*0.04)));

  const r5t = M.rate5y + sc.r5 + gauss()*0.06;
  const r2t = M.rate2y + sc.r2 + gauss()*0.08;
  const hyt = Math.max(80, M.creditHY + sc.hy + gauss()*8);
  const igt = Math.max(30, M.creditIG + sc.ig + gauss()*4);
  M.rate5y += (r5t-M.rate5y)*GAP;  M.target.rate5y = r5t;
  M.rate2y += (r2t-M.rate2y)*GAP;  M.target.rate2y = r2t;
  M.creditHY += (hyt-M.creditHY)*GAP; M.target.creditHY = hyt;
  M.creditIG += (igt-M.creditIG)*GAP; M.target.creditIG = igt;
  M.index = computeIndex();
  setStrikes();          // ladder fixed for this round before the book is built
  openCandles();

  S.book = buildBook(S.round);
  retainHeldOptions(S.book, S.round);
  expireOptions();
  S.bookVersion = (S.bookVersion || 0) + 1;   // invalidates every client's cached book

  // record NAV + breaches
  for(const t of Object.values(S.teams)){
    const a = markToMarket(t);
    t.navHistory.push(a.nav);
    const b = checkLimits(t,a);
    if(b.length) t.breaches.push({ round:S.round, items:b });
  }

  scoreCalls(pricesBefore);        // last round's analyst calls now have an answer
  S.news.unshift({ round:S.round, headline:sc.h, body:sc.b, cat:sc.cat, t:Date.now() });
  S.phase = 'open';
  // Each round carries its own window unless the facilitator has overridden timing.
  if(!S.lengthOverride) S.roundLengthSec = (ROUND_MINS[S.round-1]||5)*60;
  S.roundEndsAt = Date.now() + S.roundLengthSec*1000;
  runBots();                     // demo funds react to the new tape
  save();
}

function endGame(){ S.phase='ended'; S.roundEndsAt=0; save(); }

/* ------------------------------------------------------------
   SCORING
   ------------------------------------------------------------ */
function sharpe(h){
  if(h.length<3) return 0;
  const r=[]; for(let i=1;i<h.length;i++) r.push(h[i]/h[i-1]-1);
  const mu = r.reduce((a,b)=>a+b,0)/r.length;
  const sd = Math.sqrt(r.reduce((a,b)=>a+(b-mu)**2,0)/r.length) || 1e-9;
  return (mu/sd)*Math.sqrt(4);   // annualised, 4 rounds = 1 year
}
function maxDD(h){
  let peak=h[0], dd=0;
  h.forEach(v=>{ peak=Math.max(peak,v); dd=Math.max(dd,(peak-v)/peak); });
  return dd;
}
function scoreTeam(t){
  const a = markToMarket(t);
  const ret = a.nav/START_CAP - 1;
  const sh  = sharpe(t.navHistory);
  const dd  = maxDD(t.navHistory);
  const breachCount = t.breaches.reduce((s,b)=>s+b.items.length,0);

  // A fund that never trades should not score for prudent risk management.
  const engaged = Math.min(1, t.trades.length/6);

  const sPnl    = Math.max(0, Math.min(40, 20 + ret*130));            // 40 pts, 0% ret = 20
  const sSharpe = Math.max(0, Math.min(25, 12.5 + sh*6)) * (t.trades.length?1:0);
  const sRisk   = Math.max(0, 20 - breachCount*2.5 - dd*25) * engaged;
  const sMemo   = t.memo && t.memo.trim().length>200 ? 15 : (t.memo && t.memo.trim().length>50 ? 8 : 0);
  return { nav:a.nav, ret, sharpe:sh, maxDD:dd, breachCount, trades:t.trades.length,
           sPnl, sSharpe, sRisk, sMemo, total: sPnl+sSharpe+sRisk+sMemo };
}

/* ------------------------------------------------------------
   HTTP
   ------------------------------------------------------------ */
function send(res, code, body, type='application/json'){
  res.writeHead(code, {'Content-Type':type, 'Access-Control-Allow-Origin':'*',
                       'Cache-Control':'no-store'});
  res.end(type==='application/json' ? JSON.stringify(body) : body);
}
function file(res, name, type){
  fs.readFile(path.join(__dirname,name),(e,d)=> e? send(res,404,'not found','text/plain')
    : send(res,200,d.toString(),type));
}

const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x');
  const q = Object.fromEntries(u.searchParams);

  if(req.method==='POST'){
    let body=''; req.on('data',c=>{ body+=c; if(body.length>1e6) req.destroy(); });
    req.on('end',()=>{ let d={}; try{ d=JSON.parse(body||'{}'); }catch(e){} handle(u.pathname,{...q,...d},res); });
    return;
  }
  handle(u.pathname,q,res);
});

function handle(p, q, res){
  // auto-close round on timer
  if(S.phase==='open' && S.roundEndsAt && Date.now()>S.roundEndsAt) S.phase='closed';

  switch(p){
    case '/':          return file(res,'terminal.html','text/html');
    case '/admin':     return file(res,'admin.html','text/html');

    case '/healthz': return send(res,200,{ok:true, round:S.round, phase:S.phase});

    case '/api/state': {
      const {t, err, seat, cap} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      const a = markToMarket(t);

      // Analysts only need their slice of the book; anyone holding a desk-wide
      // seat, or acting as PM, gets everything.
      let book = Object.values(S.book);
      if(S.beginner){
        // A real beginner market: 6 shares, 2 futures, and one simple call and
        // put per company at the nearest expiry. Dropping swaps and CDS alone
        // still left 126 option lines, which is not simpler in any useful sense.
        const nextExp = Math.min(...OPT_EXPIRIES.filter(e=>e>S.round), 99);
        book = book.filter(i=>{
          if(i.kind==='SWAP' || i.kind==='CDS') return false;
          if(i.kind!=='OPTION') return true;
          if(i.under==='GBX') return false;                    // index options too abstract
          if(i.expiryRound !== nextExp) return false;          // nearest expiry only
          const spot = M.equities[i.under] ? M.equities[i.under].px : i.strike;
          return Math.abs(i.strike/spot - 1) < 0.08;           // at-the-money only
        });
      }
      if(cap.kinds) book = book.filter(i=>cap.kinds.includes(i.kind));

      const myTask  = taskFor(t, seat, cap);
      const myIntel = seatRoles(seat).map(k=>intelFor(k, seat.slot||0, S.round, t.code))
                                     .filter(Boolean)
                                     .concat(t.pushed||[]);
      const lastCall = (seat.calls||{})[S.round-1];

      // Prices only move when a round advances, so the book is static within a
      // round. Clients cache it and send back the version they hold; if it still
      // matches we omit the book entirely. With 238 seats polling this is the
      // difference between ~2 MB/s and ~200 KB/s.
      const bookVersion = S.bookVersion || 0;
      const cached = Number(q.bv) === bookVersion;
      const visible = book;                    // keep the scoped list for pricing
      if(cached) book = null;

      // candle deltas: client tells us how many bars it holds, we send the rest
      const have = Number(q.cs)||0;
      const cand = {};
      let total = 0;
      for(const id of SERIES){
        const arr = (S.candles&&S.candles[id]) || [];
        total = arr.length;
        cand[id] = have && have<=arr.length ? arr.slice(Math.max(0,have-1)) : arr.slice(-120);
      }

      return send(res,200,{
        bookVersion, bookCached: cached,
        px: priceMap(visible), priceVersion:S.priceVersion||0,
        candles: cand, candleCount: total, live: !S.paused && S.phase==='open',
        ok:true, phase:S.phase, round:S.round, maxRounds:MAX_ROUNDS,
        secsLeft: S.phase==='open' ? Math.max(0,Math.round((S.roundEndsAt-Date.now())/1000)) : 0,
        news:S.news.slice(0,6), limits:LIMITS,
        me:{ person:seat.person, roles:cap.roles, roleLabel:cap.labels.join(' + '),
             exec:cap.exec, canHold:cap.canHold, canPromote:cap.canPromote,
             acting:cap.acting, poll:cap.poll, threshold:APPROVAL_THRESHOLD,
             task:myTask, intel:myIntel, lastCall,
             score:seat.score||{}, points:personalPoints(seat) },
        beginner: !!S.beginner,
        deskScores: Object.values(t.seats).map(s=>({
             person:s.person, points:personalPoints(s),
             right:(s.score||{}).right||0, wrong:(s.score||{}).wrong||0,
             done: !!(s.tasks||{})[S.round] }))
             .sort((a,b)=>b.points-a.points),
        openSeats: Object.entries(ROLES).map(([k,r])=>({
                key:k, label:r.label, free:r.cap-(seatCounts(t)[k]||0) }))
                .filter(x=>x.free>0),
        desk: Object.values(t.seats)
                .sort((x,y)=>rank(x)-rank(y))
                .map(s=>({ person:s.person, roles:seatRoles(s),
                  roleLabel: seatRoles(s).map(k=>ROLES[k].label).join(' + '),
                  online: Date.now()-s.lastSeen < 20000 })),
        ideas: ideaView(t),
        market:{ index:M.index, rate5y:M.rate5y, rate2y:M.rate2y, hy:M.creditHY, ig:M.creditIG, indexVol:M.indexVol },
        book,
        team:{ code:t.code, name:t.name, cash:t.cash, realized:t.realized,
               memo:t.memo, navHistory:t.navHistory,
               trades:t.trades.slice(-40).reverse() },
        analytics:{ nav:a.nav, gross:a.gross, net:a.net, vega:a.vega, gamma:a.gamma,
                    theta:a.theta, marginUsed:a.marginUsed, rows:a.rows, byUnder:a.byUnder },
        breaches: checkLimits(t,a),
        leaderboard: leaderboard()
      });
    }

    /* Seat availability, so the login screen can grey out full roles */
    case '/api/roles': {
      const t = S.teams[String(q.code||'').toUpperCase()];
      const taken = t ? seatCounts(t) : {};
      return send(res,200,{ ok:!!t, teamName: t?t.name:'', seatsPerTeam:SEATS_PER_TEAM,
        threshold: APPROVAL_THRESHOLD,
        roles: Object.entries(ROLES).map(([k,r])=>({
          key:k, label:r.label, desc:r.desc, cap:r.cap,
          taken: taken[k]||0, free: r.cap-(taken[k]||0), exec:r.exec }))});
    }

    case '/api/join': {
      const t = S.teams[String(q.code||'').toUpperCase()];
      if(!t) return send(res,200,{ok:false,msg:'Invalid team code'});
      if(t.bot) return send(res,200,{ok:false,msg:'That code is running as a demo fund.'});

      // resume an existing seat after a refresh
      if(q.token && t.seats[q.token]){
        const s = t.seats[q.token];
        if(q.person) s.person = String(q.person).slice(0,32);
        const c = capabilities(t, s);
        save();
        return send(res,200,{ok:true, token:q.token, roles:seatRoles(s),
          roleLabel:c.labels.join(' + '), name:t.name, poll:c.poll});
      }

      // one person may hold several seats
      let want = q.roles || (q.role ? [q.role] : []);
      if(!Array.isArray(want)) want = [want];
      want = [...new Set(want.map(r=>String(r).toUpperCase()).filter(r=>ROLES[r]))];
      if(!want.length) return send(res,200,{ok:false,msg:'Pick at least one desk role.'});

      const person = String(q.person||'').trim().slice(0,32);
      if(!person) return send(res,200,{ok:false,msg:'Enter your name.'});

      const counts = seatCounts(t);
      for(const r of want)
        if(counts[r] >= ROLES[r].cap)
          return send(res,200,{ok:false,
            msg:`All ${ROLES[r].cap} ${ROLES[r].label} seat(s) on ${t.code} are taken.`});

      if(q.name && !t.name) t.name = String(q.name).slice(0,40);
      t.joined = true;
      const tok = newToken();
      /* Slot decides which company an analyst covers and therefore which private
         note they get. It must count within the ROLE, not within the team, or
         the second equity analyst on one desk would be compared against the
         first on another and "same research per role" would not hold. */
      const primary = want.find(r=>COVERS[r]) || want[0];
      const taken = new Set(Object.values(t.seats)
        .filter(s=>seatRoles(s).includes(primary))
        .map(s=>s.slot).filter(x=>x!=null));
      let slot = 0; while(taken.has(slot)) slot++;
      t.seats[tok] = { roles:want, person, slot, tasks:{}, calls:{},
                       score:{right:0,wrong:0,filled:0,holds:0},
                       lastSeen:Date.now(), joinedAt:Date.now() };
      const c = capabilities(t, t.seats[tok]);
      save();
      return send(res,200,{ok:true, token:tok, roles:want,
        roleLabel:c.labels.join(' + '), name:t.name, poll:c.poll});
    }

    /* Pick up or drop a spare seat mid-game, for a short-handed desk */
    case '/api/seat': {
      const {t, err, seat} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      const r = String(q.role||'').toUpperCase();
      if(!ROLES[r]) return send(res,200,{ok:false,msg:'Unknown role.'});
      const have = seatRoles(seat);

      if(q.drop){
        if(have.length<2) return send(res,200,{ok:false,msg:'You must keep at least one seat.'});
        seat.roles = have.filter(x=>x!==r);
      } else {
        if(have.includes(r)) return send(res,200,{ok:false,msg:'You already hold that seat.'});
        if(seatCounts(t)[r] >= ROLES[r].cap)
          return send(res,200,{ok:false,msg:`The ${ROLES[r].label} seat is taken.`});
        seat.roles = [...have, r];
      }
      const c = capabilities(t, seat);
      save();
      return send(res,200,{ok:true, roles:seat.roles, roleLabel:c.labels.join(' + '),
        msg: q.drop ? `Dropped ${ROLES[r].label}.` : `You are now also ${ROLES[r].label}.`});
    }

    case '/api/trade': {
      const {t, err, seat, cap} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      if(cap.exec === 'none')
        return send(res,200,{ok:false,
          msg:`Your seat submits ideas rather than trading. Use SUBMIT IDEA.`});
      if(cap.exec === 'limited' && isLarge(t, String(q.inst), Math.round(Number(q.qty)||0)))
        return send(res,200,{ok:false,
          msg:`That is above ${APPROVAL_THRESHOLD*100}% of NAV. Submit it as a ticket for the PM.`});
      const r = executeTrade(t, String(q.inst), q.qty);
      if(r.ok) S.log[0].msg = `[${seat.person}] ` + S.log[0].msg;
      save();
      return send(res,200,r);
    }

    case '/api/idea': {
      const {t, err, seat, cap} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      const r = submitIdea(t, seat, cap, String(q.inst), q.qty, q.thesis);
      save();
      return send(res,200,r);
    }

    case '/api/idea-action': {
      const {t, err, seat, cap} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      const r = actOnIdea(t, seat, cap, q.id, String(q.act), q.note);
      save();
      return send(res,200,r);
    }

    case '/api/memo': {
      const {t, err} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      t.memo = String(q.memo||'').slice(0,8000); save();
      return send(res,200,{ok:true});
    }

    /* Completing this round's obligation */
    case '/api/task': {
      const {t, err, seat, cap} = auth(q);
      if(err) return send(res,200,{ok:false, msg:err, kick:true});
      const task = taskFor(t, seat, cap);
      if(!task) return send(res,200,{ok:false,msg:'You have no set task this round.'});
      if(!S.round) return send(res,200,{ok:false,msg:'The game has not started.'});

      if(task.kind==='call'){
        const dir = String(q.dir||'').toUpperCase();
        if(!['UP','DOWN','FLAT'].includes(dir))
          return send(res,200,{ok:false,msg:'Choose up, down or flat.'});
        seat.calls = seat.calls || {};
        seat.calls[S.round] = { cover:task.cover, dir, note:String(q.note||'').slice(0,160) };
        markTask(seat); save();
        return send(res,200,{ok:true,msg:`Call logged: ${task.cover} ${dir}. Scored when the round turns.`});
      }
      if(task.kind==='riskcheck'){
        const a = markToMarket(t);
        const b = checkLimits(t,a);
        seat.riskChecks = seat.riskChecks || {};
        seat.riskChecks[S.round] = { note:String(q.note||'').slice(0,200), breaches:b.length };
        markTask(seat); save();
        return send(res,200,{ok:true,
          msg: b.length ? `Risk check filed with ${b.length} live breach(es).` : 'Risk check filed: all clear.'});
      }
      if(task.kind==='log'){
        const line = String(q.note||'').trim().slice(0,240);
        if(line.length<10) return send(res,200,{ok:false,msg:'Write at least a short line.'});
        t.memo = (t.memo ? t.memo+'\n' : '') + `R${S.round}: ${line}`;
        markTask(seat); save();
        return send(res,200,{ok:true,msg:'Logged to the memo.'});
      }
      markTask(seat); save();
      return send(res,200,{ok:true,msg:'Done.'});
    }

    /* ---- admin ---- */
    case '/api/admin': {
      if(q.pass !== ADMIN_PASS) return send(res,200,{ok:false,msg:'Bad passcode'});
      const act = q.action;
      if(act==='next')      advanceRound();
      if(act==='open')    { S.phase='open';   S.roundEndsAt = Date.now()+S.roundLengthSec*1000; }
      if(act==='close')   { S.phase='closed'; S.roundEndsAt=0; }
      if(act==='extend')  { S.roundEndsAt += 60000; }
      if(act==='length')  { S.roundLengthSec = Math.max(60, Number(q.secs)||300); S.lengthOverride = true; }
      if(act==='autolen') { S.lengthOverride = false; }
      if(act==='end')       endGame();
      if(act==='reset')   { S = freshState(); }
      // clears every seat on a team; the book is kept, people log back in
      if(act==='release') { const rt=S.teams[String(q.team||'').toUpperCase()];
                            if(rt){ rt.seats={}; } }
      // frees one named seat, e.g. someone left with the tab open
      if(act==='releaseseat'){ const rt=S.teams[String(q.team||'').toUpperCase()];
                            if(rt) for(const [tok,s] of Object.entries(rt.seats||{}))
                              if(s.person===q.person) delete rt.seats[tok]; }
      if(act==='beginner')  S.beginner = !S.beginner;
      if(act==='pause')     S.paused   = !S.paused;
      if(act==='newsmode')  S.newsMode = ['same','role','full'].includes(q.mode)?q.mode:'role';
      if(act==='campaign'){ S.campaignId = String(q.campaign||'CLASSIC');
                            S.mode='campaign';
                            if(!S.round) S.rounds = buildRounds('campaign', S.campaignId); }
      if(act==='randomise'){ S.mode='random'; S.campaignId=null;
                            if(!S.round) S.rounds = buildRounds('random'); }
      if(act==='setround'){ // facilitator hand-picks the next event
                            const idx = Math.max(0, Math.min(MAX_ROUNDS-1, Number(q.idx)||S.round));
                            if(SCEN[q.scenario]){ S.rounds = (S.rounds||[]).slice();
                                                  S.rounds[idx] = q.scenario; S.mode='manual'; } }
      // write a headline yourself and choose exactly who receives it
      if(act==='push'){
        const text = String(q.text||'').slice(0,400);
        const to   = String(q.to||'ALL').toUpperCase();
        const roleFilter = String(q.role||'').toUpperCase();
        if(text) for(const t of Object.values(S.teams)){
          if(t.bot) continue;
          if(to!=='ALL' && to!==t.code) continue;
          t.pushed = (t.pushed||[]);
          t.pushed.unshift({ round:S.round, cover: roleFilter||'DESK', text,
                             live:true, pushed:true, forRole:roleFilter||null });
          t.pushed = t.pushed.slice(0,4);
        }
      }
      if(act==='clearpush') for(const t of Object.values(S.teams)) t.pushed = [];
      let demoFilled = 0;
      if(act==='demo')      demoFilled = fillDemoTeams();
      if(act==='cleardemo'){ for(const c of Object.keys(S.teams)) if(S.teams[c].bot)
                               S.teams[c] = freshTeam(c); }
      save();
      return send(res,200,{
        ok:true, phase:S.phase, round:S.round, maxRounds:MAX_ROUNDS,
        demoFilled, demoActive: Object.values(S.teams).some(t=>t.bot),
        beginner: !!S.beginner,
        people: Object.values(S.teams).filter(t=>!t.bot).flatMap(t=>
                  Object.values(t.seats||{}).map(s=>({
                    team:t.code, fund:t.name, person:s.person,
                    roles:seatRoles(s).map(k=>ROLES[k].label).join(' + '),
                    right:(s.score||{}).right||0, wrong:(s.score||{}).wrong||0,
                    filled:(s.score||{}).filled||0, holds:(s.score||{}).holds||0,
                    points:personalPoints(s),
                    doneThisRound: !!(s.tasks||{})[S.round] })))
                  .sort((a,b)=>b.points-a.points),
        roundLengthSec:S.roundLengthSec, lengthOverride:!!S.lengthOverride,
        nextMins: S.round<MAX_ROUNDS ? (ROUND_MINS[S.round]||5) : 0,
        totalMins: ROUND_MINS.reduce((a,b)=>a+b,0),
        paused: !!S.paused, newsMode: S.newsMode||'role',
        mode: S.mode||'campaign', campaignId: S.campaignId||'CLASSIC',
        campaigns: CAMPAIGNS.map(c=>({id:c.id,name:c.name,desc:c.desc})),
        rounds: (S.rounds||[]).map((id,i)=>({ idx:i, id,
                  name:(SCEN[id]||{}).h||id, cat:(SCEN[id]||{}).cat })),
        library: SCENARIOS.map(s=>({id:s.id,cat:s.cat,h:s.h})),
        tickMs: TICK_MS,
        elapsedMins: S.gameStartedAt ? Math.round((Date.now()-S.gameStartedAt)/60000) : null,
        secsLeft: S.phase==='open'?Math.max(0,Math.round((S.roundEndsAt-Date.now())/1000)):0,
        news:S.news.slice(0,4), log:S.log.slice(0,60),
        market:{ index:M.index, rate5y:M.rate5y, rate2y:M.rate2y, hy:M.creditHY, ig:M.creditIG },
        nextHeadline: S.round<MAX_ROUNDS ? (scenarioFor(S.round+1).h||'') : 'end of game',
        teams: Object.values(S.teams).map(t=>{
          const a = markToMarket(t);
          return { code:t.code, name:t.name, joined:t.joined, nav:a.nav,
                   ret:a.nav/START_CAP-1, gross:a.gross/Math.max(a.nav,1),
                   net:a.net/Math.max(a.nav,1), vega:a.vega,
                   breaches:checkLimits(t,a).length, trades:t.trades.length,
                   memo:!!(t.memo&&t.memo.length>50),
                   bot:!!t.bot, strategy:t.strategy,
                   seated: Object.keys(t.seats||{}).length,
                   seatsMax: SEATS_PER_TEAM,
                   rolesHeld: Object.values(t.seats||{}).reduce((n,s)=>n+seatRoles(s).length,0),
                   noPM: !t.bot && Object.keys(t.seats||{}).length>0 &&
                         !Object.values(t.seats).some(s=>seatRoles(s).includes('PM')),
                   pending: (t.ideas||[]).filter(i=>i.status==='pending'||i.status==='promoted').length,
                   claimed: Object.keys(t.seats||{}).length>0,
                   online: t.bot || Date.now()-t.lastSeen < 20000 };
        }),
        scores: Object.values(S.teams).filter(t=>t.joined)
                  .map(t=>({ code:t.code, name:t.name, ...scoreTeam(t) }))
                  .sort((a,b)=>b.total-a.total)
      });
    }

    /* Full session snapshot. Free hosts recycle containers without warning, so
       this is the recovery path: download before you start, upload to rebuild. */
    case '/api/backup': {
      if(q.pass !== ADMIN_PASS) return send(res,200,{ok:false,msg:'denied'});
      return send(res,200,{ok:true, savedAt:Date.now(), state:S, market:M, seed});
    }

    case '/api/restore': {
      if(q.pass !== ADMIN_PASS) return send(res,200,{ok:false,msg:'denied'});
      try{
        const d = typeof q.data==='string' ? JSON.parse(q.data) : q.data;
        if(!d || !d.state || !d.state.teams) throw new Error('bad payload');
        S = d.state; M = d.market; seed = d.seed || seed;
        S.book = buildBook(S.round);
        retainHeldOptions(S.book, S.round);
        S.phase = 'closed'; S.roundEndsAt = 0;   // never resume mid-round unattended
        save();
        return send(res,200,{ok:true, round:S.round,
          msg:`Restored at round ${S.round}. Market left closed, press OPEN when ready.`});
      }catch(e){ return send(res,200,{ok:false,msg:'Could not read that backup file.'}); }
    }

    case '/api/export': {
      if(q.pass !== ADMIN_PASS) return send(res,200,'denied','text/plain');
      const rows = [['Rank','Code','Team','Final NAV','Return %','Sharpe','Max DD %','Breaches','Trades',
                     'P&L (40)','Sharpe (25)','Risk (20)','Memo (15)','TOTAL (100)']];
      Object.values(S.teams).filter(t=>t.joined).map(t=>({code:t.code,name:t.name,...scoreTeam(t)}))
        .sort((a,b)=>b.total-a.total)
        .forEach((s,i)=>rows.push([i+1,s.code,s.name,Math.round(s.nav),(s.ret*100).toFixed(2),
          s.sharpe.toFixed(2),(s.maxDD*100).toFixed(2),s.breachCount,s.trades,
          s.sPnl.toFixed(1),s.sSharpe.toFixed(1),s.sRisk.toFixed(1),s.sMemo.toFixed(1),s.total.toFixed(1)]));
      return send(res,200,rows.map(r=>r.join(',')).join('\n'),'text/csv');
    }
  }
  send(res,404,{ok:false,msg:'not found'});
}

function leaderboard(){
  return Object.values(S.teams).filter(t=>t.joined).map(t=>{
    const a = markToMarket(t);
    return { code:t.code, name:t.name, nav:a.nav, ret:a.nav/START_CAP-1 };
  }).sort((a,b)=>b.nav-a.nav);
}

/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
if(!load()) S = freshState();

// Periodic autosave. Every mutating request already saves; this covers the gap
// where a container is recycled between trades.
setInterval(save, 10000);

// the market breathes
setInterval(()=>{ try{ if(!S.paused) tickMarket(); }catch(e){} }, TICK_MS);

// Free hosts idle out after ~15 minutes. During a live session the teams' own
// polling keeps it warm; this covers the quiet stretch between setup and kickoff.
if(process.env.KEEPALIVE_URL){
  setInterval(()=>{ fetch(process.env.KEEPALIVE_URL+'/healthz').catch(()=>{}); }, 10*60*1000);
}

server.listen(PORT, '0.0.0.0', ()=>{
  // On a hosted platform the container's own IP is useless to participants, so
  // prefer the public URL the platform advertises.
  const hosted = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL ||
                 (process.env.RAILWAY_PUBLIC_DOMAIN && 'https://'+process.env.RAILWAY_PUBLIC_DOMAIN) ||
                 (process.env.FLY_APP_NAME && 'https://'+process.env.FLY_APP_NAME+'.fly.dev');

  let base = hosted;
  if(!base){
    const nets = os.networkInterfaces(); let ip='localhost';
    for(const k of Object.keys(nets)) for(const n of nets[k])
      if(n.family==='IPv4' && !n.internal) ip=n.address;
    base = `http://${ip}:${PORT}`;
  }

  console.log('\n  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║      FINANCIAL TRADING SYSTEM SIMULATOR · running    ║');
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log('  \u00A9 %s %s. All rights reserved.\n', '2026', 'Tarush Bhusri');
  console.log(`  Team terminals :  ${base}/`);
  console.log(`  Admin console  :  ${base}/admin`);
  console.log(`  Admin passcode :  ${ADMIN_PASS}\n`);
  console.log('  Team codes     :  TEAM01 … TEAM17');
  console.log(hosted
    ? '  Hosted. Share the URL above with anyone, anywhere.\n'
    : '  Local. Teams must be on the same Wi-Fi as this machine.\n');
  if(!hosted && process.env.PORT)
    console.log('  Note: if this is a cloud host, set PUBLIC_URL to your public address.\n');
});
