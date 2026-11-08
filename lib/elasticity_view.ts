// S3 view of the elasticity result (T5, PREREG.md sections 3 and 4). Pure and type-annotations only, so Node runs it in tests and the site imports it.
type Stat = { estimate: number; lo: number; hi: number; p: number; pMin: number; mde: number; underpowered: boolean };
type Run = { usable: number; dropped: { frontend: string; firstDayAfter: string; reason: string }[]; events: { firstDayAfter: string }[]; e1: Stat | null; e2: Stat | null; e2Events?: number };
type Miss = { frontend: string; from: number; to: number; lastDayBefore: string; firstDayAfter: string; missed: string };
export type ElasticityDoc = {
  asOf: string; reps: number; from: string; to: string; daysRead: number; frozenEvents: number;
  census: { frontends: number; withStableRun: number; changes: number; events: { firstDayAfter: string }[]; nearMisses: Miss[] };
  main: Run; checks: Record<string, Run & { label: string }>; notMeasured: string | null; notRun: string[];
};

const n = (v: number) => v.toFixed(2).replace('-', '−');
const range = (s: Stat) => `${n(s.lo)} to ${n(s.hi)}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

// The date axis runs from the first day read to the last, with five labels spread evenly.
function axis(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`);
  const labels = [0, 0.25, 0.5, 0.75, 1].map((k) => new Date(a + Math.round(((b - a) * k) / 864e5) * 864e5).toISOString().slice(0, 10));
  return { start: from, end: to, labels: labels.map((d) => [short(d), d] as [string, string]) };
}

// Why fee changes were not usable, grouped by reason ("6 had under $50,000 in the 7 days before").
function droppedWhy(m: Run) {
  const by = new Map<string, number>();
  for (const d of m.dropped) { const k = d.reason.replace(/ \(.*\)$/, ''); by.set(k, (by.get(k) ?? 0) + 1); }
  return [...by].map(([k, c]) => `${c} had ${k}`).join(', ');
}

export const elasticitySpan = (doc: ElasticityDoc) => `${doc.daysRead} days of chain data, ${short(doc.from)} to ${short(doc.to)}`;

// First line says "underpowered" when the interval spans zero or the effect is smaller than the smallest one it could see (AC-5.3).
// Under 3 usable events it says the count and that the fee trace and threshold lead (AC-5.4).
export function elasticityView(doc: ElasticityDoc | null) {
  if (!doc) return { live: false as const, easy: null, head: 'Fee-Change List Did Not Load', empty: 'The fee-change list did not load. No result is shown, and no earlier result is reused.', checks: [] as { name: string; text: string }[], days: null as string[] | null, caption: null as string | null, mde: null as string | null, plot: null, axis: null as ReturnType<typeof axis> | null };
  const m = doc.main;
  const days = doc.census.events.map((e) => e.firstDayAfter);
  const span = elasticitySpan(doc);
  const ax = axis(doc.from, doc.to);
  if (m.usable < 3 || !m.e1) {
    const count = doc.frozenEvents === 0
      ? `No fee change passes the pre-registered rules in the ${span}. A frontend has to hold one fee for 7 days, then another fee at least 5 bps away for 7 days.`
      : `Only ${m.usable} of the ${doc.frozenEvents} fee changes found are usable, which is under 3.`;
    const checks = [
      // A year of data holds many near misses; the three latest stand for them.
      ...[...doc.census.nearMisses].sort((a, b) => (a.firstDayAfter < b.firstDayAfter ? 1 : -1)).slice(0, 3).map((x) => ({ name: `Closest Miss, ${short(x.firstDayAfter)}`, text: `${x.frontend} went from ${x.from} to ${x.to} bps between ${short(x.lastDayBefore)} and ${short(x.firstDayAfter)}, with ${x.missed}. Not used.` })),
      { name: 'What Was Searched', text: `${doc.census.frontends} frontends on token_diff swaps; ${doc.census.withStableRun} held one fee for 7 days or more, and ${doc.census.changes} fee steps were seen in all.` },
      { name: 'Re-Run Each Day', text: 'Every newly frozen day re-runs the same rules, so a fee change that has not lasted 7 days yet can still count later.' },
    ];
    return {
      live: true as const,
      // J5 in the few-changes state too: Easy's own head, title, caption and smallest-effect line; the near-miss rows stay open.
      easy: {
        head: 'Not Enough Data Yet',
        checks: null as string | null,
        title: `${days.length} Fee Changes We Studied`,
        caption: days.length ? `Each line is one time an app changed its fee in a way our rules accept (${m.usable} had enough data to use).` : 'No fee change meets our rules yet.',
        mde: 'With fewer than 3 usable fee changes, we can’t yet say how big a reaction the data could spot.',
      },
      head: 'Not Enough Fee Changes to Say Yet',
      empty: [count, 'So Pricing Power reads Not Measured. The fee trace and the threshold stay the lead until there are more.'].join(String.fromCharCode(10)),
      checks, days, caption: `Each tick is one fee change that passes the rules in PREREG.md (sections 3 and A4). ${days.length ? '' : 'None does yet.'}`.trim(),
      mde: 'Smallest effect it could see: none yet, with under 3 usable fee changes to test', plot: null, axis: ax,
    };
  }
  const e = m.e1;
  const lead = e.underpowered ? 'Underpowered' : e.hi < 0 ? 'Volume Leaves When Fees Rise' : 'Volume Does Not Leave When Fees Rise';
  const pass = m.e2 ? `Pass-through **${n(m.e2.estimate)}**: the share of each fee change users pay (1 means all of it). Interval ${range(m.e2)}${m.e2.underpowered ? ', also underpowered' : ''}.` : null;
  const checks = [
    { name: 'Placebo Dates', text: `${doc.reps.toLocaleString('en-US')} random draws of dates with no fee change gave p = ${e.p.toFixed(2)} (lowest possible ${e.pMin.toFixed(4)}).` },
    ...Object.values(doc.checks).filter((c) => c.e1).map((c) => ({ name: c.label, text: `${n(c.e1!.estimate)}, interval ${range(c.e1!)}, ${c.usable} fee changes.` })),
    ...doc.notRun.map((t) => ({ name: 'Not Run', text: t })),
  ];
  // Easy words for the same result (docs/PLAN.md §6h J5): head, one summary of the checks, the timeline and the smallest effect.
  const runs = Object.values(doc.checks).filter((c) => c.e1).map((c) => c.e1!);
  const ests = runs.map((r) => r.estimate);
  const crossing = runs.filter((r) => r.lo <= -1 && r.hi >= -1).length;
  const easy = {
    head: e.underpowered ? 'Not Enough Data Yet' : e.hi < 0 ? 'People Swap Less When Fees Rise' : 'People Keep Swapping When Fees Rise',
    checks: runs.length
      ? `We tried ${runs.length} other ways of measuring this, plus random dates with no fee change. ${e.p >= 0.1 ? 'The random dates looked no different from the real fee changes. ' : 'The random dates rarely looked like the real fee changes. '}Every way gave a best guess between ${n(Math.min(...ests))} and ${n(Math.max(...ests))}, and ${crossing === runs.length ? 'every range still crosses −1' : `${crossing} of ${runs.length} ranges cross −1`}. ${crossing === runs.length ? 'So it isn’t a fluke of one method, but it isn’t precise either.' : 'So the methods mostly agree.'}`
      : null,
    title: `${days.length} Fee Changes We Studied`,
    caption: `Each line is one time an app changed its fee (${m.usable} had enough data to use).`,
    mde: `The data can only spot a reaction bigger than ${n(e.mde)}. Anything smaller stays invisible.`,
  };
  return {
    live: true as const,
    easy,
    head: lead,
    empty: [`Elasticity **${n(e.estimate)}**, 95% interval ${range(e)}, from ${m.usable} of ${doc.frozenEvents} fee changes in the ${span}. Fee-tagged (token_diff) swaps only.`, 'At −1, a higher fee leaves revenue flat. Below −1 it lowers revenue; above −1 it raises it.', pass].filter(Boolean).join(String.fromCharCode(10)),
    checks,
    days,
    caption: `Each tick is one of the ${doc.frozenEvents} fee changes that pass the rules in PREREG.md (${m.usable} usable${droppedWhy(m) ? `; ${droppedWhy(m)}` : ''}).`,
    plot: { est: e.estimate, lo: e.lo, hi: e.hi, mde: e.mde },
    mde: `Minimum detectable effect: ${n(e.mde)} either way (2.8 × the placebo spread, for 80% power at p = 0.05)`,
    axis: ax,
  };
}
