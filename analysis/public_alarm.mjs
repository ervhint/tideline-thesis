// Telegram for users (docs/PLAN.md §6i, T6k). Pure: no network, no clock, no file.
// The human's private chat still gets every side change at once (analysis/alarm.mjs). The public channel hears about a change
// only once the new side has held for 72 hours, in Easy words, from stored public data only (never the rolling panel, 4.1(e)).
// Rules shared with lib/easy_text.ts: no typed live figure, a fall in public numbers is never a fall in demand,
// the Treasury is never a solver or trader, no advice and no buy or sell words.
import { QUESTIONS } from '../lib/easy_text.ts';

export const HOLD_HOURS = 72;
const HOUR = 3_600_000;

const sidesOf = (doc) => ({ ...Object.fromEntries(doc.readings.map((r) => [r.id, r.side])), Verdict: doc.verdict.verdict });

// One hourly step. state: { announced: side last told to the public per id, pending: { id: { side, since } }, log: public changes }.
// The first run only records today's sides. A change that flips back, or moves on to a third side, before 72 hours is dropped.
export function advance(state, doc, now) {
  const cur = sidesOf(doc);
  if (!state) return { state: { announced: cur, pending: {}, log: [] }, publish: [], dropped: [] };
  const announced = { ...state.announced }, pending = { ...state.pending }, log = [...state.log];
  const publish = [], dropped = [];
  for (const [id, side] of Object.entries(cur)) {
    if (!(id in announced)) { announced[id] = side; continue; }
    const p = pending[id];
    const drop = () => dropped.push({ at: now, id, from: announced[id], to: p.side, since: p.since });
    if (side === announced[id]) { if (p) { drop(); delete pending[id]; } continue; }
    if (!p || p.side !== side) { if (p) drop(); pending[id] = { side, since: now }; }
    if (Date.parse(now) - Date.parse(pending[id].since) >= HOLD_HOURS * HOUR) {
      const c = { at: now, id, from: announced[id], to: side, since: pending[id].since };
      publish.push(c);
      log.push({ at: now, id, from: c.from, to: side });
      announced[id] = side;
      delete pending[id];
    }
  }
  return { state: { announced, pending, log }, publish, dropped };
}

const ADJ = { Bullish: 'looks good', Bearish: 'looks bad', Neutral: 'unclear', 'Not Measured': 'can’t be answered' };
const VERDICT = { Bullish: 'leaning good', Bearish: 'leaning bad', Undecided: 'undecided' };
// What each side means, as on Easy Home (lib/easy_text.ts MEANS), without figures. The 20% and 80% are pre-registered lines.
const MEANS = {
  Q1: { Bullish: 'A higher fee seems to bring in more money', Bearish: 'A higher fee seems to bring in less money', Neutral: 'Whether a higher fee brings in more money or less is not settled yet' },
  Q2: { Bullish: 'NEAR keeps a fair share of the fees', Bearish: 'NEAR’s share of the fees has stayed under 20% for two weeks', Neutral: 'NEAR’s share of the fees sits between the lines set in advance' },
  Q3: { Bullish: 'The traders keep little, and no small group of them dominates', Bearish: 'The traders keep a lot, or a small group of them dominates', Neutral: 'The traders sit between the lines set in advance' },
  Q4: { Bullish: 'No single app brings most of the business', Bearish: 'One app brings most of the business', Neutral: 'The biggest app brings much of the fees, but under the 80% line' },
  Q5: { Bullish: 'NEAR’s fee income is growing', Bearish: 'NEAR’s fee income is shrinking', Neutral: 'NEAR’s fee income is neither clearly growing nor shrinking' },
};
const LEAN = 'A lean means the evidence passed lines written down in advance, not that the price will go up or down.';
const HOLD = 'The overall answer is on hold: a rule written before the results says missing data may not move it.';
const PRIVATE = 'Some swaps now happen in private, out of public view. Fewer swaps in public view does not mean fewer people are swapping.';
const UNSEEN = 'What we can’t see: the fees on private swaps, who filled them, and any money that stays private.';
const footer = (link) => `See why: ${link}\nResearch, not financial advice.`;
const q = (id) => `“${QUESTIONS[id]}”`;
const now = (side) => (side === 'Neutral' ? 'is unclear' : ADJ[side]);

function changeLine(c, doc) {
  if (c.id === 'Verdict') return `Tideline’s overall answer went from ${VERDICT[c.from] ?? c.from} to ${VERDICT[c.to] ?? c.to}. ${LEAN}`;
  const r = doc.readings.find((x) => x.id === c.id);
  if (c.to === 'Not Measured') return `We can no longer answer ${q(c.id)}: ${r?.privateFlow ? 'most of that money now moves out of public view' : 'there is not enough data right now'}.`;
  if (c.from === 'Not Measured') return `We can answer ${q(c.id)} again: the answer now ${now(c.to)}. ${MEANS[c.id][c.to]}.`;
  return `${q(c.id)} went from ${ADJ[c.from]} to ${ADJ[c.to]}. ${MEANS[c.id][c.to]}.`;
}
const worse = (c) => c.to === 'Bearish' || c.to === 'Not Measured' || (c.id === 'Verdict' && c.to !== 'Bullish');

// One public message for all the changes that came out of their hold in a run.
export function publicMessage(changes, doc, link) {
  const lines = changes.map((c) => changeLine(c, doc));
  if (changes.some((c) => c.id === 'Verdict') && doc.verdict.held?.length) lines.push(HOLD);
  if (changes.some(worse)) lines.push(PRIVATE);
  const head = `Tideline update: ${changes.length === 1 ? 'one answer changed' : `${changes.length} answers changed`}`;
  return [head, ...lines, footer(link)].join('\n\n');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

// The Monday note: where each answer stands, what changed publicly in the last 7 days, and what can't be seen.
export function weeklyNote(doc, state, nowIso, link) {
  if (!doc) return null;
  const v = doc.verdict;
  const overall = v.held?.length
    ? `on hold. Part of the money now moves out of public view, and a rule written before the results says missing data may not move the overall answer.`
    : v.verdict === 'Bullish' || v.verdict === 'Bearish'
      ? `${VERDICT[v.verdict]}. ${LEAN}`
      : v.missing >= 3 ? 'open: too few of the five questions can be answered.' : 'undecided: the answers do not lean either way.';
  const answers = doc.readings.filter((r) => QUESTIONS[r.id]).map((r) => `${q(r.id)} ${r.side === 'Not Measured' ? 'can’t be answered right now' : now(r.side)}`);
  const since = Date.parse(nowIso) - 7 * 24 * HOUR;
  const week = (state?.log ?? []).filter((c) => Date.parse(c.at) > since)
    .map((c) => (c.id === 'Verdict' ? `The overall answer went from ${VERDICT[c.from] ?? c.from} to ${VERDICT[c.to] ?? c.to}.` : `${q(c.id)} went from ${ADJ[c.from]} to ${ADJ[c.to]}.`));
  return [
    `Tideline weekly, ${day(nowIso)}`,
    `Overall: ${overall}`,
    `The five questions:\n${answers.join('\n')}`,
    week.length ? `This week:\n${week.join('\n')}` : 'Quiet week: no answer changed side.',
    `${UNSEEN} ${PRIVATE.split('. ')[1]}`,
    footer(link),
  ].join('\n\n');
}

// Private only: a failed run, by name and link. Fixed words, so no figure (and nothing from the panel) can reach it.
const FAILED = {
  'attest-days': 'Frozen days are not yet sealed on testnet. A re-run is safe: days already recorded are skipped.',
  refresh: 'The site keeps the last good numbers, and the next hourly run tries again.',
  panel: 'The site shows the rolling panel as Not Available once the last one is over a day old.',
  'weekly-note': 'The Monday note was not posted to the channel. A re-run is safe.',
};
export function failureMessage(job, runUrl) {
  if (!FAILED[job]) throw new Error(`no failure text for ${job}`);
  return `Tideline: the ${job} run failed. ${FAILED[job]}\nRun: ${runUrl}`;
}
