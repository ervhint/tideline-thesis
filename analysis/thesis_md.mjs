// THESIS.md (T6h, docs/PLAN.md §6f, option A). Pure: the published files in, the page out. No network, no clock.
// Every sentence is written in advance; the code picks by reading, side and line, and fills in figures from the files, the way thesis_text.mjs does for the home page.
// Rules: no Explorer or 1Click figure (only thesis, elasticity, visibility and model_inputs are read); a fall in public numbers is never a fall in demand; nothing reads as advice.
// The lines (30%, 20%, 50%, 60%, 80%, 5 and 10 bps, −1) are the pre-registered ones in PREREG.md, not data.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const dmy = (iso) => `${dm(iso)} ${iso.slice(0, 4)}`;
const span = (a, b) => (a.slice(0, 4) === b.slice(0, 4) ? `${dm(a)} to ${dmy(b)}` : `${dmy(a)} to ${dmy(b)}`);
const pct = (x) => `${Math.round(x * 100)}%`;
const num = (x, d = 2) => { const s = x.toFixed(d); return s.startsWith('-') && Number(s) !== 0 ? `−${s.slice(1)}` : s.replace(/^-/, ''); };
const bn = (x, d = 1) => `$${(x / 1e9).toFixed(d)}B`;
const list = (xs) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
const reading = (t, id) => t.readings.find((r) => r.id === id);

// A2: the treasury line. Over it, a reading reads Not Measured and the verdict is held.
export const treasuryWords = (s) => (s > 0.6 ? 'well over the 50% line' : s > 0.5 ? 'over the 50% line' : 'at or under the 50% line');
// Q4: the largest frontend against the 50% and 80% lines (exactly on a line counts as Neutral, PREREG.md section 4).
export const integratorWords = (s) =>
  s > 0.8 ? 'over the 80% line for Bearish' : s >= 0.75 ? 'just under the 80% line for Bearish' : s >= 0.5 ? 'under the 80% line for Bearish' : 'under the 50% line for Bullish';
// Revenue per dollar of volume since 27 Oct against the 30 days before: within 5% either way is level.
export const rateWords = (before, since) => { const r = since / before - 1; return r < -0.05 ? 'lower' : r > 0.05 ? 'higher' : 'level'; };

function claim(t) {
  const v = t.verdict, vs = t.vstar, pf = t.privateFlow;
  const out = [];
  const gone = pf?.q3?.share != null && pf.q3.share > pf.line ? ', and most of the public data needed to answer that has moved out of public view' : '';
  const where = v.verdict === 'Bullish' || v.verdict === 'Bearish' ? `The evidence leans ${v.verdict}: it passed lines set in advance${gone}.` : `The evidence does not yet say whether it can get there${gone}.`;
  if (vs) {
    const cover = vs.multiple16 <= 1
      ? `At today's revenue rate, Intents volume already covers issuance under the 1.6% plan${vs.multiple25 <= 1 ? ', and at 2.5% too' : `, and would have to reach about ${num(vs.multiple25, 1)} times today's level if issuance stays at 2.5%`}.`
      : `At today's revenue rate, Intents volume would have to reach about ${num(vs.multiple16, 1)} times today's level to cover issuance under the 1.6% plan, or ${num(vs.multiple25, 1)} times if issuance stays at 2.5%.`;
    out.push(`**${cover} ${where}**`);
  } else out.push(`**The threshold could not be computed from the published files. ${where}**`);

  const names = (v.held ?? []).map((id) => reading(t, id)?.name).filter(Boolean);
  if (names.length) {
    const would = v.score >= 3 ? 'which would normally read Bullish' : v.score <= -3 ? 'which would normally read Bearish' : 'which would not reach either line anyway';
    out.push(`The verdict is **Undecided**. The score is ${signed(v.score)} of 7, ${would}. It is held at Undecided on purpose: ${list(names)} can no longer be measured, and a rule written in advance (PREREG.md, amendment A2) says a loss of data may not move the verdict.`);
  } else if (v.verdict === 'Bullish' || v.verdict === 'Bearish') out.push(`The verdict is **${v.verdict}**. The score is ${signed(v.score)} of 7, which reaches the ${v.verdict === 'Bullish' ? '+3' : '−3'} line set in advance (PREREG.md).`);
  else if (v.missing >= 3) out.push(`The verdict is **Undecided**: ${v.missing} of the 5 readings are Not Measured, too few left to lean either way.`);
  else out.push(`The verdict is **Undecided**. The score is ${signed(v.score)} of 7, and the lines are +3 and −3.`);

  if (pf?.q3?.share != null) {
    const c = pf.confidential?.last7;
    const when = c?.from && c?.to ? `, ${span(c.from, c.to)}` : '';
    out.push(`**How much went private.** Over the last ${pf.q3.days} frozen days${when}, the Confidential Intents Treasury carried ${pct(pf.q3.share)} of the USD counted on chain, ${treasuryWords(pf.q3.share)} in A2.${c?.confidentialShare != null ? ` Other accounts' funds going into it were ${pct(c.confidentialShare)} of the flow we can see.` : ''} That share is a side measure and sets no reading. It shows where the public record went, not that demand fell.`);
  }
  return out;
}

function evidence(t, e, vis, inputs) {
  const pro = [], con = [];
  const vs = t.vstar, pf = t.privateFlow;
  const q1 = reading(t, 'Q1'), q2 = reading(t, 'Q2'), q3 = reading(t, 'Q3'), q4 = reading(t, 'Q4'), q5 = reading(t, 'Q5');

  if (q2?.side === 'Bullish') pro.push(`**NEAR keeps a real share of the fees.** DefiLlama books ${pct(q2.capture)} of Intents fees as NEAR revenue over the last 30 days, above the 30% line for Bullish.`);
  else if (q2?.side === 'Neutral') con.push(`**NEAR's share of fees sits between the lines.** DefiLlama books ${pct(q2.capture)} of Intents fees as NEAR revenue over the last 30 days, not above the 30% line for Bullish.`);
  else if (q2?.side === 'Bearish') con.push(`**NEAR's share of fees is low.** It has been under the 20% line on each of the last 14 days (${pct(q2.capture)} over the last 30), so NEAR's Share of Fees reads Bearish.`);

  if (q5?.side === 'Bullish') pro.push('**Revenue has been growing.** The 90-day revenue total rose at each of the last three month-ends, so Path to Deflation reads Bullish.');
  else if (q5?.side === 'Bearish') con.push('**Revenue has been falling.** The 90-day revenue total fell at each of the last three month-ends, so Path to Deflation reads Bearish.');
  else if (q5?.side === 'Neutral') con.push(`**Revenue has not moved one way.** ${q5.detail}, so Path to Deflation reads Neutral.`);

  if (vs) {
    if (vs.multiple16 > 1) pro.push(`**The threshold is reachable in principle.** Monthly volume is about ${bn(vs.todayUsd, 2)}. The level needed under the 1.6% plan is about ${bn(vs.at16.mid)}, with an interval of ${bn(vs.at16.low)} to ${bn(vs.at16.high)} from how far revenue per dollar of volume has moved.`);
    else pro.push(`**Volume already covers issuance under the 1.6% plan.** Monthly volume is about ${bn(vs.todayUsd, 2)} against about ${bn(vs.at16.mid)} needed (interval ${bn(vs.at16.low)} to ${bn(vs.at16.high)}).`);
    if (vs.multiple16 >= 2) con.push(`**The gap is large.** A ${num(vs.multiple16, 1)} times rise is not a rounding error, and the top of the interval is far higher.`);
    else if (vs.multiple16 > 1) con.push(`**A gap remains.** Volume would need to rise ${num(vs.multiple16, 1)} times, and the top of the interval is higher.`);
  }

  const sp = vis?.revenueSplit;
  if (sp?.before && sp.since) {
    const w = rateWords(sp.before.revenueRate, sp.since.revenueRate);
    const few = sp.since.days < sp.before.days;
    const rates = `It was ${num(sp.before.revenueRate * 1e4, 1)} bps over the ${sp.before.days} days before 27 Oct and ${num(sp.since.revenueRate * 1e4, 1)} bps over the ${sp.since.days} days since.`;
    const caveat = few ? ' So few days cannot show that the rate really changed, and DefiLlama may not see all private volume, so this is a warning and not a finding.' : ' DefiLlama may not see all private volume.';
    if (w === 'lower') con.push(`**Revenue per dollar of volume looks lower lately.** ${rates}${caveat}${q2?.side === 'Bullish' ? " If the 30-day capture falls under 30%, NEAR's Share of Fees moves from Bullish to Neutral." : ''}`);
    else pro.push(`**Revenue per dollar of volume ${w === 'higher' ? 'looks higher lately' : 'has held about level'}.** ${rates}${caveat}`);
  }

  const lg = t.concentration?.largest;
  if (q4 && lg?.share != null) {
    const shrink = pf?.q3?.share != null && pf?.q4?.share != null && pf.q3.share > pf.q4.share ? ` Visible app fees are a shrinking part of the flow: the Treasury carried ${pct(pf.q3.share)} of counted USD over the last ${pf.q3.days} days against ${pct(pf.q4.share)} over ${pf.q4.days}.` : '';
    const who = `${lg.name ?? lg.referral} pays ${pct(lg.share)} of visible app fees over the last ${t.concentration.days} frozen days`;
    if (q4.privateFlow) con.push(`**Largest Integrator cannot be read.** The Treasury carried over half of those days, so it reads Not Measured. On the public swaps left, ${who}, ${integratorWords(lg.share)}, a side figure that sets no reading.${shrink}`);
    else if (q4.side === 'Bullish') pro.push(`**No single frontend dominates.** ${who}, ${integratorWords(lg.share)}.${shrink}`);
    else con.push(`**One frontend brings ${q4.side === 'Bearish' ? 'most' : 'much of the'} visible fees.** ${who}, ${integratorWords(lg.share)}.${shrink}`);
  }

  const m = e?.main?.e1;
  if (q1 && m) {
    const spans = m.lo < -1 && m.hi > -1;
    if (q1.side === 'Bullish') pro.push(`**Raising a fee seems to raise revenue.** The whole elasticity interval, ${num(m.lo)} to ${num(m.hi)}, sits above −1 (below).`);
    else if (q1.side === 'Bearish') con.push(`**Raising a fee seems to lower revenue.** The whole elasticity interval, ${num(m.lo)} to ${num(m.hi)}, sits below −1 (below).`);
    else if (spans) con.push(`**Pricing power is unproven.** ${Math.abs(m.estimate) < 0.25 ? 'The best estimate says volume barely moves when a fee changes, but the data cannot tell that apart from a large effect in either direction' : `The best estimate is ${num(m.estimate)}, but the interval takes in −1`} (below).`);
  } else if (q1?.side === 'Not Measured') con.push(`**Pricing power could not be measured.** ${q1.detail}.`);

  if (q3 && !q3.privateFlow) {
    if (q3.side === 'Bullish') pro.push(`**Solvers compete.** ${q3.detail}: under the 5 bps and 60% lines for Bullish.`);
    else if (q3.side === 'Bearish') con.push(`**Solvers keep a lot, or a few of them dominate.** ${q3.detail}: over the 10 bps or 80% line for Bearish.`);
    else if (q3.side === 'Neutral') con.push(`**Solver competition sits between the lines.** ${q3.detail}.`);
  }
  for (const r of [q2, q5].filter((r) => r?.side === 'Not Measured')) con.push(`**${r.name} could not be measured.** ${r.detail}.`);
  return { pro, con };
}

const CHECK_WORDS = (keys) => {
  const n = keys.filter((k) => k.startsWith('control_')).length;
  return [
    keys.includes('dropLargest') && 'dropping the largest frontend',
    keys.some((k) => /^shift\d/.test(k)) && 'changing the fee shift',
    keys.includes('noHubShift') && 'leaving out the days of the move to the Treasury',
    n && `using ${n === 1 ? 'an outside venue' : `${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? n} outside venues`} as the control`,
  ].filter(Boolean);
};

function feeChanges(t, e) {
  const q1 = reading(t, 'Q1');
  const m = e?.main;
  if (!m?.e1 || e.notMeasured) return [`Fewer than 3 usable fee changes passed the rules, so there is no estimate and Pricing Power reads Not Measured${q1 ? ` (${lower(q1.detail)})` : ''}.`];
  const e1 = m.e1, out = [];
  out.push(`Across ${e.daysRead} days of chain data, ${span(e.from, e.to)}, ${e.census.events.length} fee changes passed the rules and ${m.usable} were usable. Elasticity is ${num(e1.estimate)}, with a 95% interval of ${num(e1.lo)} to ${num(e1.hi)}, and random dates with no fee change gave results this large or larger ${pct(e1.p)} of the time. The smallest effect this test could see is ${num(e1.mde)}${e1.underpowered ? ', so it is underpowered' : ''}.`);

  const checks = Object.entries(e.checks ?? {}).filter(([, c]) => c.e1);
  const inside = checks.filter(([, c]) => c.e1.lo < -1 && c.e1.hi > -1);
  const outside = checks.filter(([, c]) => !(c.e1.lo < -1 && c.e1.hi > -1));
  const near0 = checks.every(([, c]) => Math.abs(c.e1.estimate) < 0.25);
  const est = near0 ? 'Every check gives an estimate near zero' : `The checks give estimates from ${num(Math.min(...checks.map(([, c]) => c.e1.estimate)))} to ${num(Math.max(...checks.map(([, c]) => c.e1.estimate)))}`;
  const how = list(CHECK_WORDS(checks.map(([k]) => k)));
  const settle = !checks.length ? '' : !outside.length
    ? ` ${est}, and none settles it: ${how}.`
    : ` ${est}: ${how}. ${inside.length} of ${checks.length} keep −1 inside their interval. ${outside.map(([, c]) => `${c.label} gives ${num(c.e1.lo)} to ${num(c.e1.hi)}, ${Math.min(Math.abs(c.e1.lo + 1), Math.abs(c.e1.hi + 1)) < 0.05 ? 'just ' : ''}${c.e1.lo >= -1 ? 'above' : 'below'} −1.`).join(' ')} ${outside.length === 1 ? 'It is' : 'They are'} a check on the reading, not the reading.`;
  const side = q1?.side === 'Neutral'
    ? `At −1 a higher fee leaves revenue flat. The interval runs from below that to above it, so **Pricing Power reads Neutral: not settled**. It is not evidence that volume ignores fees.`
    : q1?.side === 'Bullish'
      ? `At −1 a higher fee leaves revenue flat. The whole interval sits above that, so **Pricing Power reads Bullish**.`
      : q1?.side === 'Bearish'
        ? `At −1 a higher fee leaves revenue flat. The whole interval sits below that, so **Pricing Power reads Bearish**.`
        : `At −1 a higher fee leaves revenue flat. **Pricing Power reads ${q1?.side ?? 'Not Measured'}**.`;
  out.push(side + settle);

  const e2 = m.e2;
  out.push(e2
    ? `Pass-through, how much of a fee change reaches users, is ${num(e2.estimate)} with an interval of ${num(e2.lo)} to ${num(e2.hi)}, on ${m.e2Events} fee changes.${e2.underpowered ? ` It is underpowered${e1.underpowered ? ' as well' : ''}.` : ''}`
    : 'Pass-through, how much of a fee change reaches users, could not be estimated.');
  return out;
}

function mind(t) {
  const held = (t.verdict.held ?? []).map((id) => reading(t, id)?.name).filter(Boolean);
  const bull = [
    held.length && `the Treasury's share of counted USD falling to 50% or below, so that ${list(held)} can be measured again and the hold lifts`,
    'an elasticity interval that sits entirely above −1',
    'revenue per dollar of volume staying level through the move to private settlement',
  ].filter(Boolean);
  return [
    `**Toward Bullish:** ${bull.join('; ')}.`,
    '**Toward Bearish:** an elasticity interval entirely below −1; revenue falling at each of three month-ends; NEAR\'s capture staying under 20% for 14 days in a row; one frontend passing 80% of visible app fees.',
    '**Toward giving up on this method:** public intents winding down so far that the frozen chain days hold almost nothing. Then every chain reading is Not Measured, and only DefiLlama\'s figures are left, which nobody can re-run for free.',
    'Each line, its level and when it was set are in `PREREG.md` and on the What Would Move page. Some lines were set after the figures were seen, and the file says which.',
  ];
}

function unseen(vis) {
  const h = vis?.history;
  return [
    '**Fees on confidential swaps.** Since 27 Oct 2026 swaps settle on `intents.far`, which public indexers cannot see. Funds moving to and from the Treasury on `intents.near` are public; what happens in between is not. Any fee on that path is hidden, so it is reported as an all-in cost and never called an app fee.',
    '**Which solver filled a confidential swap.** Solver identity is gone with the settlement, so Solver Competition cannot be read on that flow.',
    '**Any flow that stays shielded.** Funds that go in and do not come back in the same day cannot be paired, so counts of confidential flows read low.',
    '**A fall in public numbers is not a fall in demand.** Flow leaving the public record looks the same as flow leaving the product. Nothing here reads it as the second.',
    h && h.chainDaysBefore < h.wantedDays && `**A visibility line.** The ratio of DefiLlama volume to chain-counted USD is shown, but with no line and no state: chain days reach only ${h.chainDaysBefore} of the ${h.wantedDays} days wanted before 27 Oct.`,
    '**How DefiLlama counts private volume.** This is not known. If it loses sight of the same flow the chain does, the ratio would not move, so a steady ratio does not prove the view is whole.',
    '**Anything before 1 Oct 2025.** The free BigQuery tier sets the start date, not a choice about the data.',
  ].filter(Boolean);
}

const dates = (chain, llama) => (!llama || llama === chain ? `Frozen chain days and DefiLlama data run to ${dmy(chain)}.` : `Frozen chain days run to ${dmy(chain)} and DefiLlama data to ${dmy(llama)}.`);

// docs = { thesis, elasticity, visibility, inputs } from data/published (thesis.json, elasticity.json, visibility.json, model_inputs.json).
export function thesisMd({ thesis: t, elasticity: e, visibility: vis, inputs }) {
  const { pro, con } = evidence(t, e, vis, inputs);
  const bullets = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- Nothing in the readings points this way yet.');
  return [
    '# Tideline: the thesis',
    '',
    `Research, not financial advice. This file is written by \`pipeline/build_thesis_md.mjs\` from the published files in \`data/published/\`, so its figures match the site; \`npm run verify\` fails if it is edited by hand. ${dates(t.snapshotLastDay, t.notes?.llamaLastDay)}`,
    '',
    '## The claim',
    '',
    'NEAR uses its share of NEAR Intents fees to buy NEAR on the open market. The question is whether those buybacks could ever cover the new NEAR being issued.',
    '',
    claim(t).join('\n\n'),
    '',
    '## The evidence for',
    '',
    bullets(pro),
    '',
    '## The evidence against',
    '',
    bullets(con),
    '',
    '## What the fee changes showed',
    '',
    feeChanges(t, e).join('\n\n'),
    '',
    '## What would change my mind',
    '',
    mind(t).join('\n\n'),
    '',
    '## What could not be computed',
    '',
    unseen(vis).map((x) => `- ${x}`).join('\n'),
    '',
    '## How much to trust this',
    '',
    'It is not blind. An earlier private analysis by the same author was seen before any of this was written, and amendments A2, A3 and A4 were each written with some figures already known. Each amendment says what was known when it was written.',
    '',
    'A dated hash of each frozen chain day is on NEAR testnet at `tideline-thesis.testnet`, so a day file cannot be changed later without it showing.',
    '',
  ].join('\n');
}
