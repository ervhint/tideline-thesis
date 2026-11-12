// T6i Easy and Pro (docs/PLAN.md §6g, docs/TESTS.md T-T6i.1 to T-T6i.5, and the script side of T-T6i.6 to T-T6i.8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { EASY, QUESTIONS, easyElasticity, easyHome, easyReadingLine, tenths, times } from './easy_text.ts';
import { GLOSSARY, marks, plain } from './glossary.ts';
import { thesisView, concentrationView } from './thesis_view.ts';
import { feeView } from './fee_view.ts';
import { elasticitySpan, elasticityView } from './elasticity_view.ts';
import { MODE_KEY, MODE_SCRIPT } from './mode.ts';
import { q3 as q3Reading } from '../analysis/readings.mjs';
import { ENTRIES, GROUPS } from './reproduce_entries.ts';
import { chainChecksView } from './chain_checks_view.ts';
import { tokenBoardView } from './token_board_view.ts';
import { thesisText } from '../analysis/thesis_text.mjs';

const json = (f) => JSON.parse(readFileSync(`data/published/${f}`, 'utf8'));
const THESIS = json('thesis.json');
const clone = (o) => structuredClone(o);

// Altered copies of the real thesis document.
function doc({ treasury = 0.79, held = true, multiple = 3.2, q3 = 'Not Measured' } = {}) {
  const d = clone(THESIS);
  d.privateFlow.q3.share = treasury;
  d.privateFlow.confidential.last7.treasuryShare = treasury;
  d.verdict = held ? { verdict: 'Undecided', score: 3, missing: 1, held: ['Q3'] } : { verdict: 'Bullish', score: 3, missing: q3 === 'Not Measured' ? 1 : 0 };
  d.vstar.multiple16 = multiple;
  d.vstar.multiple25 = multiple * 1.58;
  // Pin the other four sides: the hourly refresh moves the live ones, and this test checks wording, not today's data.
  for (const [id, side] of [['Q1', 'Neutral'], ['Q2', 'Bullish'], ['Q4', 'Neutral'], ['Q5', 'Bullish']]) d.readings.find((r) => r.id === id).side = side;
  const r3 = d.readings.find((r) => r.id === 'Q3');
  r3.side = q3;
  if (q3 === 'Not Measured' && held) { r3.privateFlow = true; r3.detail = `Flow went private: treasury ${Math.round(treasury * 100)}% of USD`; } else { delete r3.privateFlow; r3.sideFigures = null; r3.detail = q3 === 'Neutral' ? 'Spread 7.2 bps, top 3 hold 71%' : 'Spread 4.1 bps, top 3 hold 55%'; }
  return d;
}
const all = (e) => [e.lead, e.hold ?? '', e.verdict, e.body, ...e.means, ...e.fixed].map(plain).join(' ');

test('T-T6i.1 Easy home sentences follow their data, with the rounding worked out from the value', () => {
  assert.match(all(easyHome(doc({ treasury: 0.79 }))), /About 8 of every 10 dollars counted over the last 7 frozen days went through the doorway into NEAR’s private system \(Treasury\)/);
  assert.match(all(easyHome(doc({ treasury: 0.4, held: false }))), /About 4 of every 10 dollars counted/);
  // Held and not held.
  const held = easyHome(doc());
  assert.match(plain(held.verdict), /the overall answer is on hold \(Undecided\)\. A rule written before the results says missing data may not move it, so it waits, at a score of \+3 of 7/);
  assert.match(plain(held.means[1]), /\. So “Do the traders really compete\?” cannot be answered \(Not Measured\)\./);
  // §6g E10: on hold, What This Means runs answers, private flow, the hold, the distance; each point once.
  assert.equal(held.means[2], held.verdict);
  assert.match(plain(held.means[0]), /^Good signs \(Bullish\): /);
  assert.equal((all(held).match(/cannot be answered/g) ?? []).length, 2, 'once in the lead, once in What This Means');
  // §6g E9: on hold, the answers lead and the reason follows.
  assert.equal(plain(held.lead), 'Two signs look good, two are unclear, and one cannot be answered right now.');
  assert.match(plain(held.hold), /^Overall answer on hold: about 8 of every 10 dollars now trade in private, out of public view\. The visible answers score \+3 of 7/);
  const lean = easyHome(doc({ held: false, q3: 'Bullish', treasury: 0.3 }));
  assert.equal(lean.hold, null);
  assert.match(plain(lean.verdict), /lean Bullish, but only just \(score \+3 of 7\).*not that the price will go up or down/);
  assert.doesNotMatch(plain(lean.verdict), /missing data/);
  // The multiple: 3.2 is about 3 times; 0.8 is already enough.
  assert.match(all(easyHome(doc({ multiple: 3.2 }))), /grow to about 3 times today’s under the 1\.6% plan/);
  assert.match(all(easyHome(doc({ multiple: 0.8 }))), /already enough for buybacks to cancel out new coins/);
  assert.match(all(easyHome(doc({ multiple: 0.8 }))), /the swapping needed is about 0\.8 times today’s\. If issuance stays at 2\.5%, swapping would need to grow to about 1\.3 times/);
  assert.doesNotMatch(all(easyHome(doc({ multiple: 0.8 }))), /under the 1\.6% plan \(voted in/);
  // Q3 Not Measured and measured.
  assert.match(all(easyHome(doc())), /So “Do the traders really compete\?” cannot be answered \(Not Measured\)/);
  const q3up = all(easyHome(doc({ held: false, q3: 'Bullish', treasury: 0.3 })));
  assert.doesNotMatch(q3up, /cannot be answered/);
  assert.match(q3up, /Good signs \(Bullish\): [^.]*the traders keep little and no small group of them dominates/);
  // Measured Q3 between the lines: its figures in plain words, never the Pro detail (code review, P7a).
  const q3mid = all(easyHome(doc({ held: false, q3: 'Neutral', treasury: 0.3 })));
  assert.match(q3mid, /Unclear \(Neutral\): [^.]*the traders sit between the lines \(they keep 7\.2 bps and the three biggest fill 71%\)/);
  assert.doesNotMatch(q3mid, /Spread 7\.2|top 3 hold/);
  // No claim without a figure: with no treasury share there is no Treasury sentence and no "out of view" claim.
  const none = clone(THESIS);
  delete none.privateFlow;
  none.verdict = { verdict: 'Bullish', score: 3, missing: 0 };
  none.readings = none.readings.map((r) => ({ ...r, privateFlow: undefined, side: r.side === 'Not Measured' ? 'Neutral' : r.side }));
  assert.doesNotMatch(all(easyHome(none)), /Treasury|out of view/);
  assert.equal(easyHome(null), null);
  // The rounding helpers.
  assert.deepEqual([times(3.25), times(12.61), times(1.34), times(1.96)], ['about 3 times', 'about 13 times', 'about 1.3 times', 'about 2 times']);
  assert.deepEqual([tenths(0.79), tenths(0.2525), tenths(0.03), tenths(0.97), tenths(1)], ['about 8 of every 10 dollars', 'about 3 of every 10 dollars', 'less than 1 of every 10 dollars', 'nearly every dollar', 'every dollar']);
});

test('T-T6i.1 Easy elasticity follows the interval against −1', () => {
  const info = { usable: 21, total: 27, span: '403 days of chain data, 1 Oct to 7 Nov', pass: null };
  // T-T6j.8 (J5): the human voice, each judgement picked from the numbers.
  const real = plain(easyElasticity({ est: -0.06, lo: -1.66, hi: 1.53 }, { ...info, pass: { est: 0.33, lo: -0.35, hi: 1 } }));
  assert.match(real, /We looked at 21 times an app changed its fee \(out of 27 we found/);
  assert.match(real, /Our best guess: they barely reacted \(−0\.06/);
  assert.match(real, /But the data is thin\. The real answer could be anywhere from −1\.66 \(people leave fast\) to 1\.53 \(people swap even more\)/);
  assert.match(real, /both sides of that line, so we can’t say yet/);
  assert.match(real, /pass about a third of a fee change on to users \(0\.33/);
  const up = plain(easyElasticity({ est: 0.6, lo: -0.5, hi: 1.2 }, info));
  assert.match(up, /they swapped more/);
  assert.match(up, /safe side of that line, so higher fees seem to bring in more money/);
  assert.doesNotMatch(up, /data is thin|people leave fast/);
  const down = plain(easyElasticity({ est: -2, lo: -2.6, hi: -1.3 }, info));
  assert.match(down, /they swapped less/);
  assert.match(down, /past that line, so higher fees seem to lose money/);
  assert.doesNotMatch(down, /swap even more/);
  assert.match(plain(easyElasticity(null, { ...info, usable: 2 })), /only 2 of the 27 fee changes found are usable, and it takes 3.*Not Measured/);
  assert.match(plain(easyElasticity(null, { ...info, usable: 0, total: 0 })), /No app changed its fee/);
});

// Every Easy string the site can show: fixed text, the questions, the glossary, and what the builders give on real and altered data.
const easyStrings = () => {
  const fixed = [];
  const walk = (o) => (typeof o === 'string' ? fixed.push(o) : o && typeof o === 'object' ? Object.values(o).forEach(walk) : null);
  walk(EASY);
  walk(QUESTIONS);
  Object.values(GLOSSARY).forEach((g) => fixed.push(g.text));
  const docs = [doc(), doc({ treasury: 0.4, held: false }), doc({ multiple: 0.8 }), doc({ held: false, q3: 'Bullish', treasury: 0.3 }), THESIS];
  const homes = docs.flatMap((d) => { const e = easyHome(d); return [e.lead, e.verdict, e.body, ...e.means]; });
  const trace = json('fee_trace.json');
  const fee = feeView(trace);
  const emptyTrace = clone(trace);
  emptyTrace.trace.bySize['10k-100k'].all.allInBps = null;
  const empty = feeView(emptyTrace);
  const feeText = [fee.easyLead, fee.easyBanner, fee.easyExplain, fee.card.easy, ...fee.parts.map((p) => p.easy), empty.easyLead, empty.easyBody];
  const c = concentrationView(THESIS, 'x');
  const el = json('elasticity.json');
  const ev = elasticityView(el);
  const elText = [easyElasticity(ev.plot, { usable: el.main.usable, total: el.frozenEvents, span: elasticitySpan(el), pass: null }), easyElasticity(null, { usable: 1, total: 4, span: 'x', pass: null }), ...Object.values(ev.easy ?? {}), ...fee.parts.map((p) => p.easyName), fee.easySpreadNote, fee.easySpreadSub, fee.easyBelow, fee.easyTitle, ...ENTRIES.flatMap((e) => [e.easy, e.easyName]), ...GROUPS.map((g) => g.easy), chainChecksView(json('chain_days.json'))?.easy, tokenBoardView(json('token_board.json'))?.easy, ...THESIS.readings.map((r) => easyReadingLine(r, { elasticity: el.main.e1, largest: THESIS.concentration.largest }))];
  // Easy words typed inside components and pages (easy="…" and easy={<Rich text={`…`} />}).
  const src = [...walkFiles('app'), ...walkFiles('components')].filter((f) => f.endsWith('.tsx')).flatMap((f) => {
    const s = readFileSync(f, 'utf8');
    return [...s.matchAll(/easy="([^"]+)"/g), ...s.matchAll(/easy=\{<Rich text=\{`([\s\S]*?)`\} \/>\}/g)].map((m) => m[1]);
  });
  return [...fixed, ...homes, ...feeText, c.easyIntegratorNote, c.easySolverNote, ...elText, ...src].filter(Boolean);
};
const walkFiles = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walkFiles(join(d, f)) : [join(d, f)]));

// E7: what Easy must never say. One sentence that names the Treasury must not name a solver or trader in it.
const BANNED = [
  [/fall in demand|drop in demand|demand (has |have )?(fell|fall|fallen|dropped|drops|declined)|less demand|lower demand/i, 'a fall in public numbers called a fall in demand'],
  [/\bbuy(s|ing)?\b(?!(?:\s+\S+){0,2}\s+back\b)/i, 'buy, other than a buyback'],
  [/guarantee/i, 'guaranteed'],
  [/great investment|good investment/i, 'investment praise'],
  [/\bmoon\b/i, 'moon'],
];
export function honestyHits(text) {
  const t = plain(text);
  const hits = BANNED.filter(([re]) => re.test(t)).map(([, why]) => why);
  for (const s of t.split(/(?<=[.!?])\s+/)) if (/treasury/i.test(s) && /\b(solver|trader)s?\b/i.test(s)) hits.push(`Treasury with solver or trader: ${s}`);
  return hits;
}

test('T-T6i.3 no Easy string breaks the honesty rules, and a planted one is caught', () => {
  const strings = easyStrings();
  assert.ok(strings.length > 80, `only ${strings.length} Easy strings found`);
  const bad = strings.flatMap((s) => honestyHits(s).map((h) => `${h} :: ${plain(s).slice(0, 90)}`));
  assert.deepEqual(bad, []);
  // Buybacks may be named; advice may not.
  assert.deepEqual(honestyHits('Part of every fee is used to buy NEAR back. It can buy back as many coins.'), []);
  assert.equal(honestyHits('Public swaps fell: a fall in demand.').length, 1);
  assert.equal(honestyHits('The [[Treasury]] is the biggest solver.').length, 1);
  assert.equal(honestyHits('You should buy NEAR now.').length, 1);
  assert.equal(honestyHits('A guaranteed great investment, to the moon.').length, 3);
});

// T-T6i.4: on Home, the numbers that differ by mode must match. Shared parts (hero, readings row) show in both modes.
// Easy may round a Pro number (whole number, or tenths of a percentage); it may not bring a number of its own.
const NUM = /[−+-]?\d[\d,]*(?:\.\d+)?/g;
// Rule and reading names (A2, Q3) are labels, not figures.
const numsIn = (s) => (plain(s).replace(/\b[AQ]\d\b/g, '').match(NUM) ?? []).map((x) => Number(x.replace(/,/g, '').replace('−', '-').replace('+', '')));
const variants = (n) => [n, Math.abs(n), Math.round(n), Math.floor(Math.abs(n) / 10), Math.ceil(Math.abs(n) / 10), Math.round(Math.abs(n) / 10), Number(n.toFixed(1))];
test('T-T6i.4 every number in Home’s mode-specific text has its match in the other mode', () => {
  for (const d of [THESIS, doc(), doc({ treasury: 0.4, held: false }), doc({ multiple: 0.8 }), doc({ held: false, q3: 'Bullish', treasury: 0.3 })]) {
    const v = thesisView(d);
    const proOnly = [v.verdictText, v.glance.flowCap ?? '', v.glance.scoreCap, `At ${v.figures.price} a NEAR, with all revenue spent on buybacks. ${v.privateLine ?? ''}`, ...thesisText(d).live, ...thesisText(d).fixed].join(' ');
    const shared = [v.figures.asOf, v.figures.multiple, ...v.readings.map((r) => r.detail)].join(' ');
    const e = easyHome(d);
    const easyOnly = [e.lead, e.hold ?? '', e.glance.flowCap ?? '', e.glance.scoreCap, e.verdict, e.body, ...e.means, ...e.fixed].join(' ');
    const has = (pool, n) => pool.some((p) => variants(p).includes(n) || variants(p).includes(Math.abs(n)));
    const proPool = [...numsIn(proOnly), ...numsIn(shared)];
    const easyPool = [...numsIn(easyOnly), ...numsIn(shared)];
    const easyExtra = numsIn(easyOnly).filter((n) => n !== 10 && !has(proPool, n));
    const proMissing = numsIn(proOnly).filter((n) => !easyPool.some((x) => variants(n).includes(Math.abs(x))));
    assert.deepEqual(easyExtra, [], `Easy brings numbers Pro does not have (treasury ${d.privateFlow?.q3?.share})`);
    assert.deepEqual(proMissing, [], `Pro numbers missing from Easy (treasury ${d.privateFlow?.q3?.share})`);
    // Readings and sides: Easy names each reading by its question and keeps every side.
    for (const r of d.readings) assert.ok(QUESTIONS[r.id], r.id);
    for (const side of new Set(d.readings.map((r) => r.side))) assert.ok(plain(easyOnly).includes(side), `side ${side} missing from Easy`);
  }
});

// §6g E9: while held, Pro's count line and Easy's answers line give the same count per side, each from the readings.
test('T-T6i.4 the on-hold count line matches in both modes and follows the readings', () => {
  const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  for (const d of [THESIS, doc(), doc({ held: false, q3: 'Bullish', treasury: 0.3 })]) {
    const v = thesisView(d);
    const e = easyHome(d);
    if (!d.verdict.held?.length) { assert.equal(v.countLine, null); assert.equal(v.figures.hold, null); continue; }
    const want = Object.fromEntries(['Bullish', 'Bearish', 'Neutral', 'Not Measured'].map((s) => [s, d.readings.filter((r) => r.side === s).length]));
    const pro = Object.fromEntries([...v.countLine.matchAll(/(\d) (Bullish|Bearish|Neutral|Not Measured)/g)].map((m) => [m[2], Number(m[1])]));
    const easy = Object.fromEntries([...plain(e.lead).toLowerCase().matchAll(/(one|two|three|four|five)(?: signs?)? (looks? good|looks? bad|is unclear|are unclear|cannot be answered)/g)]
      .map((m) => [m[2].includes('good') ? 'Bullish' : m[2].includes('bad') ? 'Bearish' : m[2].includes('unclear') ? 'Neutral' : 'Not Measured', WORD[m[1]]]));
    for (const s of Object.keys(want)) { assert.equal(pro[s] ?? 0, want[s], 'Pro ' + s); assert.equal(easy[s] ?? 0, want[s], 'Easy ' + s); }
    assert.match(v.figures.hold, /^On hold: \d+% went private$/);
  }
});

// §6g E11: the glance captions say the same facts in Easy words, picked by held or not.
test('T-T6i.15 Easy glance captions follow the share, the line and the hold', () => {
  const held = easyHome(doc({ treasury: 0.79 }));
  assert.equal(held.glance.flowCap, 'About 8 of every 10 dollars now trade in private. The overall answer comes back once that is no more than 5 of every 10 dollars.');
  assert.equal(held.glance.scoreCap, 'Score +3 of 7, on hold: missing data may not move the overall answer.');
  const open = easyHome(doc({ treasury: 0.4, held: false }));
  assert.equal(open.glance.flowCap, 'About 4 of every 10 dollars now trade in private. That is no more than 5 of every 10 dollars, so every answer counts.');
  assert.match(open.glance.scoreCap, /^Score \+3 of 7\. It takes \+3 or −3 to lean either way\.$/);
});

// §6g E12: the Easy hero swaps words only. Its numbers come from the same props as Pro's, so none is typed here.
test('T-T6i.19 the Easy hero words carry no figure and the Hero shows them beside Pro\'s', () => {
  const words = Object.values(EASY.hero).flat();
  // "30 Days" is the fixed window both modes name, not a measured figure.
  assert.deepEqual(words.filter((w) => /\d/.test(w) && w !== '30 Days'), []);
  assert.ok(words.every((w) => !/issuance|volume/i.test(w)), 'Easy hero avoids the hard words');
  const hero = readFileSync('components/Hero.tsx', 'utf8');
  for (const k of ['line1', 'before', 'after', 'tag', 'gap', 'today', 'coveredLine1', 'coveredLine2', 'coveredTag']) assert.ok(hero.includes(`H.${k}`), k);
});

test('T-T6i.5 every term used exists in the glossary, and no glossary text holds a figure', () => {
  const keys = new Set(Object.keys(GLOSSARY));
  const used = easyStrings().flatMap(marks);
  const src = [...walkFiles('app'), ...walkFiles('components')].filter((f) => f.endsWith('.tsx')).flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<Term k="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(used.length > 20);
  assert.deepEqual([...used, ...src].filter((k) => !keys.has(k)), []);
  assert.deepEqual(Object.entries(GLOSSARY).filter(([, g]) => /\d/.test(g.term + g.text)).map(([k]) => k), []);
  // The first list of §6g E6 is all there.
  for (const k of ['vstar', 'issuance', 'buyback', 'deflation', 'intents', 'solver', 'frontend', 'treasury', 'confidential', 'volume', 'bps', 'elasticity', 'passthrough', 'bullish', 'bearish', 'neutral', 'notmeasured', 'defillama', 'bigquery', 'frozenday', 'hash', 'attest', 'testnet']) assert.ok(keys.has(k), k);
  assert.deepEqual(marks('[[Unknown word]] and [[buybacks|buyback]]'), ['unknown word', 'buyback']);
});

// The pre-paint script against a stand-in page (T-T6i.6 to T-T6i.8 in a browser; this checks the logic).
function runMode({ search = '', stored = null, blocked = false } = {}) {
  const attrs = {};
  const store = new Map(stored ? [[MODE_KEY, stored]] : []);
  const localStorage = {
    getItem: (k) => { if (blocked) throw new Error('blocked'); return store.get(k) ?? null; },
    setItem: (k, v) => { if (blocked) throw new Error('blocked'); store.set(k, v); },
  };
  vm.runInNewContext(MODE_SCRIPT, { document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } }, location: { search }, URLSearchParams, localStorage });
  return { mode: attrs['data-mode'], stored: store.get(MODE_KEY) ?? null };
}
test('T-T6i.6 to .8 the pre-paint script: Pro first, Easy remembered, a share link wins, blocked storage means Pro', () => {
  assert.deepEqual(runMode(), { mode: 'pro', stored: null });
  assert.deepEqual(runMode({ stored: 'easy' }), { mode: 'easy', stored: 'easy' });
  assert.deepEqual(runMode({ search: '?mode=easy' }), { mode: 'easy', stored: 'easy' });
  assert.deepEqual(runMode({ search: '?mode=pro', stored: 'easy' }), { mode: 'pro', stored: 'pro' });
  assert.deepEqual(runMode({ search: '?mode=weird', stored: 'easy' }), { mode: 'easy', stored: 'easy' });
  assert.deepEqual(runMode({ blocked: true, stored: 'easy' }), { mode: 'pro', stored: 'easy' });
  assert.deepEqual(runMode({ blocked: true, search: '?mode=easy' }), { mode: 'easy', stored: null });
});

test('T-T6j.11 the line under each Home question follows the published files', () => {
  const el = json('elasticity.json').main.e1;
  const largest = THESIS.concentration.largest;
  const ctx = { elasticity: el, largest };
  const line = (id, over = {}) => easyReadingLine({ ...THESIS.readings.find((r) => r.id === id), ...over }, ctx);
  const pc = (x) => `${Math.round(x * 100)}%`;
  // Q1: the guess and the thin-data part follow the interval.
  assert.ok(line('Q1').includes(`(${el.estimate.toFixed(2).replace('-', '−')})`));
  assert.equal(/too thin to be sure/.test(line('Q1')), el.lo <= -1 && el.hi >= -1);
  assert.match(easyReadingLine({ id: 'Q1', side: 'Bearish' }, { elasticity: { estimate: -2, lo: -2.6, hi: -1.3 } }), /^Yes: a higher fee seems to lose money \(−2\.00\)$/);
  assert.match(easyReadingLine({ id: 'Q1', side: 'Not Measured' }, {}), /Not enough fee changes/);
  // Q2 to Q5 from their own fields.
  assert.equal(line('Q2'), `NEAR keeps ${pc(THESIS.readings.find((r) => r.id === 'Q2').capture)} of the swap fees (last 30 days)`);
  const q3 = THESIS.readings.find((r) => r.id === 'Q3');
  if (q3.privateFlow) assert.equal(line('Q3'), `${tenths(q3.treasuryShare).replace(/^./, (c) => c.toUpperCase())} went private, so we can’t see the traders right now`);
  assert.match(line('Q3', { privateFlow: false, sideFigures: { spreadBps: 4.12, top3: 0.55 } }), /^The 3 biggest traders fill 55% of public swaps, and they keep 4\.1 bps$/);
  // A measured Q3 has no side figures: the Easy line reads them from the published detail, not "Not enough data yet".
  assert.equal(line('Q3', { privateFlow: false, sideFigures: undefined, side: 'Neutral', detail: q3Reading({ spreadBps: 7.2, top3: 0.71 }).detail }), 'The 3 biggest traders fill 71% of public swaps, and they keep 7.2 bps');
  assert.equal(line('Q4'), `The biggest app, ${largest.name}, brings ${pc(largest.share)} of the app fees we can see`);
  assert.match(line('Q4', { privateFlow: true, treasuryShare: 0.62 }), /^About 6 of every 10 dollars went private, so we can’t see which app brings the most right now$/);
  for (const [side, re] of [['Bullish', /^Yes: it rose/], ['Bearish', /^No: it fell/], ['Neutral', /^Mixed/], ['Not Measured', /^Not enough data yet$/]]) assert.match(line('Q5', { side }), re);
  // Q1's question names fees in general: what was measured is apps changing their own fees, not NEAR's.
  assert.doesNotMatch(QUESTIONS.Q1, /NEAR raises/);
  // Easy lines carry no Pro jargon.
  assert.doesNotMatch(['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((id) => line(id)).join(' '), /token_diff|treasury|of USD|Elasticity|-\d/);
});

// T-T6j.13 (docs/PLAN.md §6h J7): one Easy word per thing. Easy text never goes back to the old names.
// Kept: "volume" beside [[volume]] notes and dollar figures, and "solver" only as the note inside "traders (solvers)".
test('T-T6j.13 Easy text uses one word per thing', () => {
  const OLD = /\b(integrators?|frontends?|revenue|readings?|confidential settlement|short each month|verdict)\b/i;
  const bad = [];
  // Tap-notes are shared by both modes and define these words, so they may use them.
  const notes = new Set(Object.values(GLOSSARY).map((g) => g.text));
  for (const s of easyStrings().filter((x) => !notes.has(x))) {
    const t = plain(s);
    if (OLD.test(t)) bad.push(`${t.match(OLD)[0]} :: ${t.slice(0, 90)}`);
    if (/\bsolvers?\b/i.test(t.replace(/traders? \(solvers?\)/gi, ''))) bad.push(`solver :: ${t.slice(0, 90)}`);
  }
  assert.deepEqual(bad, []);
  // The titles and links share one set of names.
  assert.equal(EASY.titles.elasticity, 'Do People Stop Swapping When Fees Go Up?');
  assert.match(QUESTIONS.Q1, /fees go up, do people stop swapping/);
});
