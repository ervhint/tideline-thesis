// S1 view of thesis.json. Pure and type-annotations only, so Node runs it in tests and the site imports it.
import { thesisText } from '../analysis/thesis_text.mjs';
type Side = 'Bullish' | 'Neutral' | 'Bearish' | 'Not Measured';
type Range = { low: number; mid: number; high: number };
export type ThesisDoc = {
  asOf: string;
  readings: { id: string; name: string; side: Side; detail: string; plain: string; source: string; query: string }[];
  verdict: { verdict: string; score: number; missing: number; held?: string[] };
  privateFlow?: PrivateFlow;
  vstar: { todayUsd: number; priceUsd: number; at16: Range; at25: Range; multiple16: number };
  text?: { asOf: string; fixed: string[]; live: string[] };
};

// PREREG A2: the treasury share of each reading's window, and the confidential share of the last 7 days (null until a treasury day is read).
type PrivateFlow = {
  line: number; q3: { days: number; share: number | null } | null; q4: { days: number; share: number | null } | null;
  confidential?: { last7: { days: number; daysRead: number; confidentialShare: number | null } } | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const date = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

// Display only (docs/PLAN.md §6h J8): thesis.json keeps its text; the page shows a real minus and names token_diff swaps.
const proDetail = (d: string) => d.replace(/(^|[\s(])-(?=\d)/g, (_m, pre) => `${pre}−`).replace('token_diff swaps only', 'fee-tagged (token_diff) swaps only');
const READING_NAMES = ['Pricing Power', "NEAR's Share of Fees", 'Solver Competition', 'Largest Integrator', 'Path to Deflation'];
const GAUGE_MAX = 25e9;

// With the file missing the page says so and shows no figure: `figures` is null and every reading is Not Measured.
export function thesisView(doc: ThesisDoc | null) {
  if (!doc) return { live: false as const, text: null, figures: null, readings: READING_NAMES.map((name, i) => ({ qid: `Q${i + 1}`, name, detail: 'Published file did not load', status: 'Not Measured' as Side })), verdictText: 'The published numbers did not load, so no verdict is shown.', countLine: null, privateLine: null, glance: null };
  const v = doc.vstar;
  const { verdict, score, missing, held = [] } = doc.verdict;
  const scoreText = `${score > 0 ? '+' : score < 0 ? '−' : ''}${Math.abs(score)} of 7`;
  const heldNames = doc.readings.filter((r) => held.includes(r.id)).map((r) => r.name).join(' and ');
  // A2 rule 5: while a reading is held the verdict is on hold. The readings lead and the reason follows (§6g E9).
  const shares = heldShares(held, doc.privateFlow);
  const verdictText =
    held.length
      ? `Verdict on hold (PREREG A2): ${shares.length ? `the treasury carried ${shares.map((x, i) => `${pct(x.share)}${i ? '' : ' of counted USD'} over the last ${x.days} days`).join(' and ')}, so ` : 'flow went private, so '}${heldNames} ${held.length === 1 ? 'reads' : 'read'} Not Measured. Score ${scoreText}; lost data may not move the verdict.`
      : missing >= 3
      ? `${missing} of five readings are not measured, so the verdict stays open.`
      : `Score ${scoreText}. Pricing Power and Path to Deflation count double.${missing ? ` ${missing} of five not measured.` : ''}`;
  return {
    live: true as const,
    // What This Means is built here from the published numbers with the same function the pipeline uses (§6g E10),
    // so a wording change shows as soon as the page does. The stored text is the fallback for a file it cannot read.
    text: liveText(doc),
    figures: {
      asOf: date(doc.asOf.slice(0, 10)),
      max: GAUGE_MAX,
      gapCaption: 'short each month at 1.6% issuance',
      covered: v.multiple16 <= 1,
      today: v.todayUsd,
      multiple: `${v.multiple16.toFixed(1)}×`,
      price: `$${v.priceUsd.toFixed(2)}`,
      verdict,
      // The Hero card while the verdict is on hold: how many readings answer, one dot per reading, and why.
      sides: doc.readings.map((r) => r.side),
      hold: held.length && shares.length ? `On hold: ${pct(Math.max(...shares.map((x) => x.share)))} went private` : held.length ? 'On hold: flow went private' : null,
      thresholds: [
        { at: v.at16.mid, note: 'under the 1.6% plan that passed its vote' },
        { at: v.at25.mid, note: 'if issuance stays at 2.5%' },
      ],
    },
    readings: doc.readings.map((r) => ({ qid: r.id, name: r.name, detail: proDetail(r.detail), status: r.side })),
    verdictText,
    // Held: the count of sides leads and verdictText follows as the reason. Otherwise verdictText is the lead.
    countLine: held.length ? countSides(doc.readings.map((r) => r.side)) : null,
    privateLine: privateLine(doc.privateFlow),
    glance: glance(doc, held, shares, scoreText),
  };
}

// What This Means at a glance (§6g E11): the private share against the A2 line, the score, and what cannot be seen.
// Numbers only from the file. Not held, the first card shows the verdict instead of the line.
function glance(doc: ThesisDoc, held: string[], shares: { share: number; days: number }[], scoreText: string) {
  const pf = doc.privateFlow;
  const top = shares.length ? shares.reduce((a, b) => (b.share > a.share ? b : a)) : null;
  const seen = pf?.q3?.share != null ? { share: pf.q3.share, days: pf.q3.days } : null;
  const flow = top ?? seen;
  const line = pf?.line ?? null;
  return {
    held: held.length > 0,
    verdict: doc.verdict.verdict,
    score: doc.verdict.score,
    flow: flow && line != null ? { share: flow.share, days: flow.days, line } : null,
    flowCap: flow && line != null
      ? `Treasury carried ${pct(flow.share)} of counted USD over the last ${flow.days} days. ${held.length ? `The verdict returns at ${pct(line)} or less (PREREG A2).` : `Under the ${pct(line)} line, so every reading counts.`}`
      : null,
    scoreCap: held.length ? `Score ${scoreText}, on hold: lost data may not move the verdict.` : `Score ${scoreText}. The lines are +3 and −3.`,
    hidden: pf?.q3?.share != null,
  };
}

function liveText(doc: ThesisDoc): { asOf: string; fixed: string[]; live: string[] } | null {
  try { return thesisText(doc); } catch { return doc.text ?? null; }
}

const SIDE_ORDER: Side[] = ['Bullish', 'Bearish', 'Neutral', 'Not Measured'];
export function countSides(sides: Side[]) {
  return `${SIDE_ORDER.flatMap((s) => { const n = sides.filter((x) => x === s).length; return n ? [`${n} ${s}`] : []; }).join(', ')}.`;
}

// The treasury share of each held reading's window, in reading order; a share not yet read is left out.
function heldShares(held: string[], p?: PrivateFlow) {
  return held.flatMap((id) => { const w = id === 'Q3' ? p?.q3 : id === 'Q4' ? p?.q4 : null; return w?.share != null ? [{ share: w.share, days: w.days }] : []; });
}

// One line for the Headline: treasury share, then the confidential share once a treasury day has been read.
function privateLine(p?: PrivateFlow) {
  if (p?.q3?.share == null) return null;
  const c = p.confidential?.last7;
  const conf = c?.confidentialShare != null ? `Confidential share ${pct(c.confidentialShare)}: other accounts' deposits into the treasury as a share of the flow still visible (${c.daysRead} of ${c.days} days read).` : 'Confidential share Not Measured until the treasury days are read.';
  return `The Confidential Intents treasury carried ${pct(p.q3.share)} of counted USD over the last ${p.q3.days} frozen days. ${conf}`;
}

// S6: the four size rows and the whole-window figure. Solver columns come from the E3 sampled days; "Not Measured" when there are none.
type SolverCell = { top3: number | null; hhi: number | null; sampled: number };
export type ConcentrationDoc = { window: string; source: string; bySize: Record<string, { name: string; share: number } | null>;
  tokenDiffShareOfUsd?: number | null; feeUnreadable?: { usd: number }; largest?: { name: string; share: number; shareOfNamed: number } | null;
  solvers?: { days: string[]; bySize: Record<string, SolverCell>; allSizes?: { top3: number | null }; tokenDiffOnly?: { top3: number | null }; stability?: { perDayTop3: { top3: number | null }[]; leaveOneDayOut: { min: number; max: number } } | false } | null };
const SIZE_ROWS: [string, string][] = [['0-1k', '$0 to $1k'], ['1k-10k', '$1k to $10k'], ['10k-100k', '$10k to $100k'], ['100k+', '$100k and Up']];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const money = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${Math.round(v / 1e3)}k`);
// Where a top-3 range sits against Solver Competition's 60% and 80% lines.
const side = (lo: number, hi: number) =>
  hi < 0.6 ? 'all under the 60% line Solver Competition uses' : lo > 0.8 ? 'all over its 80% line' : lo >= 0.6 && hi <= 0.8 ? 'all between the 60% and 80% lines Solver Competition uses' : 'across a line Solver Competition uses';

// Easy's twin of side(), against the same lines.
const easySide = (lo: number, hi: number) =>
  hi < 0.6 ? 'all under the 60% line this question uses' : lo > 0.8 ? 'all over its 80% line' : lo >= 0.6 && hi <= 0.8 ? 'all between the 60% and 80% lines this question uses' : 'across a line this question uses';

export function concentrationView(doc: { concentration?: ConcentrationDoc; privateFlow?: PrivateFlow } | null, headlineShare: string | null) {
  const c = doc?.concentration;
  const pf = doc?.privateFlow;
  // The line comes from the file, so a later amendment can't leave this page on an old one.
  const over = (s?: { share: number | null } | null) => s?.share != null && pf?.line != null && s.share > pf.line;
  const tops = c?.solvers && c.solvers.stability ? c.solvers.stability.perDayTop3.flatMap((d) => (d.top3 == null ? [] : [d.top3])) : [];
  if (!c) return { live: false as const, rows: SIZE_ROWS.map(([, label]) => [label, 'Not Measured', 'Not Measured', 'Not Measured']), solverDays: null as string[] | null, solverNote: null as string | null, integratorNote: null as string | null, easySolverNote: null as string | null, easyIntegratorNote: null as string | null, window: null, ours: null };
  return {
    live: true as const,
    rows: SIZE_ROWS.map(([key, label]) => {
      const t = c.bySize[key];
      const sv = c.solvers?.bySize[key];
      return [label, t ? `${t.name} ${pct(t.share)}` : 'Not Measured', sv?.top3 != null ? pct(sv.top3) : 'Not Measured', sv?.hhi != null ? Math.round(sv.hhi).toLocaleString('en-US') : 'Not Measured'];
    }),
    solverDays: c.solvers ? c.solvers.days : null,
    solverNote: c.solvers?.stability && c.solvers.allSizes?.top3 != null
      ? `All sizes together, the top 3 solvers fill ${pct(c.solvers.allSizes.top3)} of public USD over these days. Single days range from ${pct(Math.min(...tops))} to ${pct(Math.max(...tops))}, and leaving out any one day gives ${pct(c.solvers.stability.leaveOneDayOut.min)} to ${pct(c.solvers.stability.leaveOneDayOut.max)}, ${side(c.solvers.stability.leaveOneDayOut.min, c.solvers.stability.leaveOneDayOut.max)}. The Confidential Intents treasury 51e8f94d… is left out: it is a bridge to a private chain, not a solver.${c.solvers.tokenDiffOnly?.top3 != null ? ` Counting fee-tagged swaps only, the top 3 fill ${pct(c.solvers.tokenDiffOnly.top3)}.` : ''}${over(pf?.q3) ? ` The treasury carried ${pct(pf!.q3!.share!)} of USD over these days, so these are side figures that set no reading.` : ''}`
      : null,
    integratorNote: c.largest && c.tokenDiffShareOfUsd != null
      ? `Only fee-tagged (token_diff) swaps name a frontend and carry a visible app fee; they are ${pct(c.tokenDiffShareOfUsd)} of the USD over these days, less since flow moved to the Confidential Intents treasury from 28 Oct. ${c.largest.name} accounts for ${pct(c.largest.share)} of the app fees seen; leaving out swaps with no frontend named, it is ${pct(c.largest.shareOfNamed)}. Swaps whose app fee is paid in a third token that cannot be valued (${money(c.feeUnreadable?.usd ?? 0)} of volume) are left out.${over(pf?.q4) ? ` The treasury carried ${pct(pf!.q4!.share!)} of USD over these days, so this is a side figure that sets no reading.` : ''}`
      : null,
    easySolverNote: c.solvers?.stability && c.solvers.allSizes?.top3 != null
      ? `All sizes together, the three biggest traders ([[solvers|solver]]) fill ${pct(c.solvers.allSizes.top3)} of the public money over these days. Single days range from ${pct(Math.min(...tops))} to ${pct(Math.max(...tops))}, and leaving out any one day gives ${pct(c.solvers.stability.leaveOneDayOut.min)} to ${pct(c.solvers.stability.leaveOneDayOut.max)}, ${easySide(c.solvers.stability.leaveOneDayOut.min, c.solvers.stability.leaveOneDayOut.max)}. The doorway into the private system ([[Treasury]]) is left out, because it only passes money through.${c.solvers.tokenDiffOnly?.top3 != null ? ` Counting only the swaps that show an app fee, the three biggest fill ${pct(c.solvers.tokenDiffOnly.top3)}.` : ''}${over(pf?.q3) ? ` Over these days ${pct(pf!.q3!.share!)} of the money went through the private system, so these figures are shown for interest and count toward no answer.` : ''}`
      : null,
    easyIntegratorNote: c.largest && c.tokenDiffShareOfUsd != null
      ? `Only one kind of swap shows which app sent it and what fee the app took. Those swaps are ${pct(c.tokenDiffShareOfUsd)} of the money over these days, fewer since money started moving into the private system on 28 Oct. ${c.largest.name} brings ${pct(c.largest.share)} of the app fees seen; leaving out swaps with no app named, it is ${pct(c.largest.shareOfNamed)}. Swaps whose app fee we couldn’t read (${money(c.feeUnreadable?.usd ?? 0)}) are left out.${over(pf?.q4) ? ` Over these days ${pct(pf!.q4!.share!)} of the money went through the private system, so this is shown for interest and counts toward no answer.` : ''}`
      : null,
    window: c.window,
    ours: headlineShare,
  };
}
