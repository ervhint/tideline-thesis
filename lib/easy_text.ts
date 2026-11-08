// Easy mode's words (docs/PLAN.md §6g E4, E5, E7). Pure and type-annotations only, so Node runs it in tests and the site imports it.
// Every sentence with a figure is built here or in a page's view module from the published files; nothing is typed with a live figure.
// Easy may round ("about 3 times", "about 8 of every 10 dollars"), but the rounding is worked out from the live value.
// Hard words are marked [[word]] or [[shown words|key]]; each becomes a tap-to-explain note (lib/glossary.ts).
// Honesty rules, tested in lib/easy_text.test.mjs: a fall in public numbers is never a fall in demand; the Treasury is never a
// solver or trader; Not Measured and the A2 hold are said plainly; no advice and no promotion; Easy adds no reading, side or number.

type Side = 'Bullish' | 'Neutral' | 'Bearish' | 'Not Measured';
type Reading = { id: string; name: string; side: Side; detail: string; privateFlow?: boolean; sideFigures?: { spreadBps?: number | null; top3?: number | null; share?: number | null; name?: string | null } | null };
type PrivateFlow = {
  line: number; q3: { days: number; share: number | null } | null; q4: { days: number; share: number | null } | null;
  confidential?: { last7: { days: number; daysRead: number; confidentialShare: number | null } } | null;
};
export type EasyThesisDoc = {
  asOf: string;
  readings: Reading[];
  verdict: { verdict: string; score: number; missing: number; held?: string[] };
  privateFlow?: PrivateFlow;
  vstar: { priceUsd: number; multiple16: number; multiple25?: number };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const date = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
const list = (xs: string[]) => (xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const pct = (x: number) => `${Math.round(x * 100)}%`;

// "about 3 times": whole numbers from 2 up, one decimal below that, so 1.3 never reads as 1.
export function times(x: number) {
  return `about ${x >= 2 ? Math.round(x) : Number(x.toFixed(1))} times`;
}
// "about 8 of every 10 dollars", worked out from the share.
export function tenths(share: number) {
  const n = Math.round(share * 10);
  if (n <= 0) return 'less than 1 of every 10 dollars';
  if (n >= 10) return share >= 1 ? 'every dollar' : 'nearly every dollar';
  return `about ${n} of every 10 dollars`;
}

// The five readings as plain questions (§6g E5). The reading names stay in Pro.
export const QUESTIONS: Record<string, string> = {
  Q1: 'If NEAR raises its fee, do people stop swapping?',
  Q2: 'Does NEAR keep a fair share of the fees?',
  Q3: 'Do the traders really compete?',
  Q4: 'Does one app bring most of the business?',
  Q5: "Is NEAR's fee income growing?",
};
const q = (id: string) => `“${QUESTIONS[id]}”`;

// Fixed Easy text with no figure, or with a fixed size or pre-registered line only (lib/typed_text.test.mjs allows those).
export const EASY = {
  // The hero in plain words (§6g E12). Same numbers and layout as Pro; about the same length, so nothing moves.
  hero: {
    line1: 'Swaps Must Grow',
    before: 'to',
    after: 'Today',
    tag: 'so fees can buy back the new NEAR coins.',
    coveredLine1: 'Fees Already Buy Back',
    coveredLine2: 'The New Coins',
    coveredTag: 'at today’s fees and NEAR price.',
    today: ['Swapped', 'Last', '30 Days'],
    gap: 'still missing each month',
  },
  ask: {
    home: 'What this page answers: can the fees from NEAR’s swap service ever buy back as many NEAR coins as the network creates each year?',
    fee: 'What this page answers: when you swap $10,000 on NEAR Intents, how much do you lose along the way, and who gets it?',
    model: 'What this page answers: how much swapping NEAR needs for buybacks to cancel out new coins, and how that changes when you move the inputs.',
    concentration: 'What this page answers: does one app, or a few traders, bring most of the business?',
    elasticity: 'What this page answers: when an app raised its fee in the past, did people stop swapping?',
    move: 'What this page answers: what would have to change for each of the five answers to turn good or bad?',
    method: 'What this page answers: where every number comes from, and how you can tell it was not bent to fit.',
    reproduce: 'What this page answers: how you can check every number yourself, without trusting Tideline.',
  },
  fixed: [
    'Tideline asks whether NEAR’s swap fees could ever buy back as many NEAR coins as the network creates each year. This is research, not financial advice.',
    'A [[Bullish]] answer means the evidence passed a line written down in advance, not that the price will go up.',
  ],
  modelLead: 'Move the inputs and watch the line move. The big number is [[V*|vstar]]: the monthly swap [[volume]] at which [[buybacks|buyback]] would cancel out the new coins from [[issuance]].',
  modelElasticity: '[[Elasticity]] is how much people change their swapping when the fee changes. It moves the best fee to charge, not the volume needed at today’s fee.',
  methodLead: 'In short: Tideline uses public data anyone can download again, wrote its rules down before looking at the results, and seals each [[frozen day|frozenday]] with a [[hash]] stored on NEAR’s [[testnet]]. Below is the detail.',
  reproduceLead: 'You do not have to trust Tideline. These commands re-run the numbers on your own computer, and the chain check shows that no saved day was changed later: each day’s [[hash]] is [[attested|attest]] on NEAR’s [[testnet]].',
  panel: 'A daily count from another source, shown for one day and then thrown away, because its terms do not allow keeping it. It is not used for any answer.',
  concentrationLead: 'If most swaps come through one app, or are filled by a few [[solvers|solver]], NEAR’s fee income depends on them staying.',
  concentrationKey: 'Largest Integrator is the biggest app’s share of the app fees. Top-3 Solver Share is how much of the swapping the three biggest [[solvers|solver]] filled. [[HHI]] is one number for how concentrated it is: higher means fewer players hold more.',
  reported: 'Another public source reports this share for the biggest app. It may measure something different, so the two need not match.',
  moveLead: 'For each of the five questions, the line that would turn the answer [[Bullish]] or [[Bearish]]. The lines were written down before the results, so they cannot be moved to fit.',
  // The pre-registered lines (PREREG.md section 6), in plain words. The figures are the same lines Pro shows.
  moves: [
    ['The whole likely range of [[elasticity]] sits above −1: raising fees brings in more money.', 'The whole range sits below −1: raising fees brings in less money.'],
    ['NEAR keeps more than 30% of the fees over the last 30 days, as DefiLlama counts it.', 'NEAR keeps under 20% on each of the last 14 days.'],
    ['[[Solvers|solver]] keep under 5 bps on $1k to $10k swaps, and the three biggest fill under 60%.', 'Solvers keep over 10 bps, or the three biggest fill over 80%.'],
    ['The biggest app brings under 50% of the last 30 days of fees.', 'The biggest app brings over 80% of those fees.'],
    ['NEAR’s fee income over 90 days went up at each of the last three month-ends.', 'It went down at each of the last three month-ends.'],
  ],
  moveKey: 'Between the two lines the answer is [[Neutral]], and exactly on a line counts as Neutral. Missing data reads [[Not Measured|notmeasured]]. Two lines (the second and fourth) were set after the current figures were seen, and PREREG.md says so. While more than half the money moves through the private system, “Do the traders really compete?” and “Does one app bring most of the business?” cannot be measured, and the verdict stays [[Undecided]] whatever the score, so lost data cannot move it.',
  elasticityChecks: 'Extra tests that try to break the result: random dates with no fee change, and other ways of counting.',
} as const;

// Home (§6g E5): the tug of war, the verdict and why it is held, and the five readings as plain questions.
export function easyHome(doc: EasyThesisDoc | null) {
  if (!doc) return null;
  const { readings, verdict: v, vstar, privateFlow: pf } = doc;
  const on = date(doc.asOf);
  const held = v.held ?? [];
  const score = `${signed(v.score)} of 7`;
  const half = pf ? tenths(pf.line).replace('about ', '') : null;

  const counted = ` ${q('Q1')} and ${q('Q5')} count double.${v.missing ? ` ${v.missing} of the five cannot be answered yet.` : ''}`;
  const verdict = held.length
    ? `As of ${on}, the overall answer is on hold ([[Undecided]]). A rule written before the results says missing data may not move it, so it waits, at a score of ${score}${half ? `, until no more than ${half} go private again` : ''}.`
    : v.verdict === 'Bullish' || v.verdict === 'Bearish'
      ? `As of ${on}, the answers lean [[${v.verdict}|${v.verdict.toLowerCase()}]]${Math.abs(v.score) === 3 ? ', but only just' : ''} (score ${score}). That means the evidence passed lines set in advance, not that the price will go up or down.${counted}`
      : v.missing >= 3
        ? `As of ${on}, too few of the five questions can be answered to lean either way.`
        : `As of ${on}, the answers do not add up to a lean either way (score ${score}; it takes +3 or −3).${counted}`;

  // The short line under the hero, like Pro's: the full verdict sentence opens What This Means.
  // On hold, the answers lead and the reason follows in its own line (§6g E9).
  const sideCount = (s: Side) => readings.filter((r) => r.side === s).length;
  const share = Math.max(...[held.includes('Q3') ? pf?.q3?.share : null, held.includes('Q4') ? pf?.q4?.share : null].filter((x): x is number => x != null), -1);
  const hold = held.length
    ? `Overall answer on hold: ${share >= 0 ? `${tenths(share)} now trade in private` : 'most of the money now trades in private'}, out of public view. The visible signs score ${score}, but missing data may not move the verdict.`
    : null;
  const lead = held.length
    ? answersLine(sideCount)
    : v.verdict === 'Bullish' || v.verdict === 'Bearish'
      ? `The answers lean [[${v.verdict}|${v.verdict.toLowerCase()}]] (score ${score}).`
      : v.missing >= 3
        ? `${v.missing} of the five questions cannot be answered yet, so the verdict stays open.`
        : `Score ${score}: the answers do not lean either way.`;

  const body = `Think of a tug of war. Each year the network creates new NEAR coins ([[issuance]]), pulling the supply up. Part of every swap fee on [[NEAR Intents|intents]] is used to buy NEAR back ([[buyback]]), pulling it down. If buybacks win, the supply shrinks ([[deflation]]). This assumes NEAR costs $${vstar.priceUsd.toFixed(2)} and all of NEAR’s fee income goes to buybacks.`;

  // What the private flow means, said once with its figures (§6g E10). The Treasury sentence names no solver or trader.
  const sf = readings.filter((r) => r.privateFlow && r.sideFigures).flatMap((r) => {
    const f = r.sideFigures!;
    if (r.id === 'Q3') return [f.spreadBps != null && `the solvers keep ${f.spreadBps.toFixed(1)} [[bps]] on public swaps`, f.top3 != null && `the three biggest solvers fill ${pct(f.top3)} of the public swaps`].filter((x): x is string => !!x);
    if (r.id === 'Q4') return f.share != null ? [`${f.name ? `${f.name} brings` : 'the biggest app brings'} ${pct(f.share)} of the app fees seen`] : [];
    return [];
  });
  const gone = readings.filter((r) => r.privateFlow);
  const priv: string[] = [];
  if (pf?.q3?.share != null) {
    priv.push(`${cap(tenths(pf.q3.share))} counted over the last ${pf.q3.days} [[frozen days|frozenday]] went through the [[Treasury]], the doorway into NEAR’s private swap system${pf.q4?.share != null ? ` (${tenths(pf.q4.share)} over the last ${pf.q4.days})` : ''}.${gone.length ? ` So ${list(gone.map((r) => q(r.id)))} cannot be answered ([[Not Measured|notmeasured]]).` : ''}`);
    const c = pf.confidential?.last7;
    const extra = [...(c?.confidentialShare != null ? [`${tenths(c.confidentialShare)} of the flow we can see went private (${c.daysRead} of ${c.days} days read)`] : []), ...sf];
    if (extra.length) priv.push(`Shown for interest, counting toward no answer: ${list(extra)}.`);
    priv.push('Fewer swaps in public view does not mean fewer people swapping: those swaps moved out of view. Still hidden: the fees on private swaps, who filled them, and any money that stays private.');
  }

  // What each answer means, in plain words (§6g E10). Where Pro names a line the reading sits against, Easy names it too.
  const MEANS: Record<string, (r: Reading) => [string, string, string]> = {
    Q1: () => ['a higher fee seems to bring in more money', 'a higher fee seems to bring in less money', 'whether a higher fee brings in more money or less is not settled yet'],
    Q2: () => ['NEAR keeps a fair share of the fees', 'NEAR’s share of the fees has stayed under 20% for two weeks', 'NEAR’s share of the fees sits between the lines'],
    Q3: (r) => ['the traders keep little and no small group of them dominates', 'the traders keep a lot, or a small group of them dominates', `the traders sit between the lines (${r.detail})`],
    Q4: () => ['no single app brings most of the business', 'one app brings most of the business', 'the biggest app brings much of the fees, but under the 80% line'],
    Q5: () => ['NEAR’s fee income is growing', 'NEAR’s fee income is shrinking', 'NEAR’s fee income is neither clearly growing nor shrinking'],
  };
  const SIDE_WORDS: [Side, string, number][] = [['Bullish', 'Good signs ([[Bullish]])', 0], ['Bearish', 'Bad signs ([[Bearish]])', 1], ['Neutral', 'Unclear ([[Neutral]])', 2]];
  const sides = SIDE_WORDS.flatMap(([s, words, i]) => {
    const rs = readings.filter((r) => r.side === s && MEANS[r.id]);
    return rs.length ? [`${words}: ${rs.map((r) => MEANS[r.id](r)[i]).join("; ")}.`] : [];
  }).join(' ');
  const why: string[] = [];
  const llama = readings.filter((r) => (r.id === 'Q2' || r.id === 'Q5') && (r.side === 'Bullish' || r.side === 'Bearish')).length;
  if (llama) why.push(`${llama === 1 ? 'One of these answers uses' : 'Two of these answers use'} [[DefiLlama]] numbers, which nobody can re-run for free.`);
  // A reading gone private is explained once, in the private-flow paragraph.
  for (const r of readings.filter((x) => x.side === 'Not Measured' && !(x.privateFlow && priv.length))) {
    why.push(r.privateFlow ? `${q(r.id)} cannot be answered ([[Not Measured|notmeasured]]) because most of that money now moves out of public view.` : `${q(r.id)} cannot be answered yet ([[Not Measured|notmeasured]]): there is not enough data.`);
  }

  const m16 = vstar.multiple16;
  const distance = m16 <= 1
    ? `At today’s fees and NEAR price, monthly swap [[volume]] is already enough for buybacks to cancel out new coins under the 1.6% plan: the volume needed is ${times(m16)} today’s${vstar.multiple25 == null ? '' : vstar.multiple25 <= 1 ? `, and ${times(vstar.multiple25)} if issuance stays at 2.5%` : `. If issuance stays at 2.5%, volume would need to grow to ${times(vstar.multiple25)} today’s`}.`
    : `For buybacks to cancel out new coins, monthly swap [[volume]] would need to grow to ${times(m16)} today’s under the 1.6% plan (voted in, not yet in force)${vstar.multiple25 != null ? `, or ${times(vstar.multiple25)} if issuance stays at 2.5%` : ''}.`;

  // On hold the answers come first, then what went private, then why the overall answer waits (§6g E10).
  const answers = [sides, ...why].join(' ');
  const privPara = priv.length ? [priv.join(' ')] : [];
  const means = held.length ? [answers, ...privPara, verdict, distance] : [verdict, answers, ...privPara, distance];
  // The glance cards' captions (§6g E11), the same facts as Pro's in plain words.
  const flowShare = held.length && share >= 0 ? share : pf?.q3?.share ?? null;
  const glance = {
    flowCap: flowShare != null && half
      ? `${cap(tenths(flowShare))} now trade in private. ${held.length ? `The overall answer comes back once that is no more than ${half}.` : `That is no more than ${half}, so every answer counts.`}`
      : null,
    scoreCap: held.length ? `Score ${score}, on hold: missing data may not move the overall answer.` : `Score ${score}. It takes +3 or −3 to lean either way.`,
  };
  return { lead, hold, verdict, body, means, glance, fixed: EASY.fixed };
}
// "Two signs look good, two are unclear, and one cannot be answered right now."
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
function answersLine(n: (s: Side) => number) {
  const parts = ([['Bullish', 'looks good', 'look good'], ['Bearish', 'looks bad', 'look bad'], ['Neutral', 'is unclear', 'are unclear'], ['Not Measured', 'cannot be answered right now', 'cannot be answered right now']] as [Side, string, string][])
    .flatMap(([s, one, many]) => { const k = n(s); return k ? [{ k, verb: k === 1 ? one : many }] : []; })
    .map(({ k, verb }, i) => `${WORDS[k]}${i ? '' : k === 1 ? ' sign' : ' signs'} ${verb}`);
  const t = parts.length < 3 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Elasticity (S3): the result in plain words, from the same estimate, interval and counts the page shows in Pro.
type ElInfo = { usable: number; total: number; span: string; pass: { est: number; lo: number; hi: number } | null };
export function easyElasticity(plot: { est: number; lo: number; hi: number } | null, info: ElInfo) {
  const n = (v: number) => v.toFixed(2).replace('-', '−');
  if (!plot) return `${info.total === 0 ? `No app changed its fee in a way the rules written in advance accept, in the ${info.span}: an app has to hold one fee for 7 days, then another fee at least 5 bps away for 7 days.` : `Too few apps changed their fee in a way the rules accept: only ${info.usable} of the ${info.total} fee changes found are usable, and it takes 3.`} So this question cannot be answered yet ([[Not Measured|notmeasured]]). The fee breakdown and the threshold lead until there are more.`;
  const where = plot.lo > -1
    ? 'The whole range sits above −1, so higher fees seem to bring in more money.'
    : plot.hi < -1
      ? 'The whole range sits below −1, so higher fees seem to bring in less money.'
      : 'The range crosses −1, so the data cannot yet say whether a higher fee brings in more money or less.';
  const pass = info.pass ? ` Users seem to pay ${n(info.pass.est)} of each fee change, where 1 means all of it ([[pass-through|passthrough]]); likely from ${n(info.pass.lo)} to ${n(info.pass.hi)}.` : '';
  return `When apps changed their fees in the past, Tideline measured how swapping changed: the [[elasticity]] is ${n(plot.est)}, likely somewhere from ${n(plot.lo)} to ${n(plot.hi)}, from ${info.usable} of ${info.total} fee changes in the ${info.span}. The key mark is −1: below it, a higher fee brings in less money; above it, more. ${where}${pass}`;
}
