import test from 'node:test';
import assert from 'node:assert/strict';
import { census, panelOf, changeRanges, estimate, estimateAll, historyDays, LEFT_OUT_DAYS, JOIN_DAY } from './elasticity.mjs';

const dayAt = (start, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10);
function lcg(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const row = (ref, fee, vol, allIn, n = 20) => {
  const gross = vol / (1 - fee / 1e4);
  return { t: 'swap', k: 'd', solver: 's.near', ref, fee, b: '1k-10k', n, np: n, vol, in: vol, out: gross * (1 - allIn / 1e4) };
};

// A made-up market on 80 chain days: 30 frontends, a shared daily mood, and 8 of them raise their fee from 10 to 30 bps once.
// After the change their volume moves by elasticity × ln(35/15) and their all-in cost by passThrough × 20 bps.
function market({ elasticity, passThrough, seed = 7, start = '2027-01-01', N = 80, hits = 8, base = 50000 }) {
  const rnd = lcg(seed), mood = Array.from({ length: N }, () => Math.exp((rnd() - 0.5) * 0.3));
  const days = Array.from({ length: N }, (_, d) => ({ head: { day: dayAt(start, d) }, swaps: [] }));
  for (let k = 0; k < 30; k++) {
    const ref = `app${k}`, at = 25 + k * 4, hit = k < hits;
    for (let d = 0; d < N; d++) {
      const after = hit && d > at, fee = after ? 30 : 10;
      let v = base * (1 + k * 0.06) * mood[d] * Math.exp((rnd() - 0.5) * 0.3);
      if (after) v *= Math.exp(elasticity * Math.log(35 / 15));
      days[d].swaps.push(row(ref, fee, v, 20 + (after ? passThrough * 20 : 0)));
    }
  }
  const cen = census(days), panel = panelOf(days);
  return { days, cen, panel, ranges: changeRanges(panel, cen), mood };
}

test('census: a clean step of 20 bps with 7+ days each side is an event', () => {
  const { cen } = market({ elasticity: 0, passThrough: 0 });
  assert.equal(cen.events.length, 8);
  assert.deepEqual(cen.events[0], { frontend: 'app0', lastDayBefore: '2027-01-26', firstDayAfter: '2027-01-27', from: 10, to: 30, daysBefore: 26, daysAfter: 54 });
});

test('T-5.2 finds a known elasticity and covers it with the interval; E2 finds the pass-through', () => {
  const { panel, ranges, cen } = market({ elasticity: -1.5, passThrough: 0.7 });
  const r = estimate(panel, ranges, cen.events, { reps: 500 });
  assert.equal(r.usable, 8);
  assert.ok(Math.abs(r.e1.estimate + 1.5) < 0.3, `estimate ${r.e1.estimate}`);
  assert.ok(r.e1.lo < -1.5 && r.e1.hi > -1.5, 'interval covers the true value');
  assert.ok(r.e1.hi < 0 && !r.e1.underpowered, 'a strong effect is not underpowered');
  assert.ok(Math.abs(r.e2.estimate - 0.7) < 0.01, `pass-through ${r.e2.estimate}`);
  assert.equal(r.e2Events, 8);
});

test('T-5.2 no effect reads as underpowered, and the result repeats exactly', () => {
  const { panel, ranges, cen } = market({ elasticity: 0, passThrough: 0 });
  const a = estimate(panel, ranges, cen.events, { reps: 500 }), b = estimate(panel, ranges, cen.events, { reps: 500 });
  assert.equal(a.e1.underpowered, true);
  assert.deepEqual(a, b);
});

test('PREREG 3: fewer than 3 usable events gives no E1 or E2', () => {
  const { panel, ranges, cen } = market({ elasticity: -1.5, passThrough: 0.7, hits: 2 });
  const r = estimate(panel, ranges, cen.events, { reps: 200 });
  assert.equal(r.usable, 2);
  assert.equal(r.e1, null);
  assert.equal(r.e2, null);
});

test('PREREG 3: under $50,000 in the 7 days before is dropped with the amount', () => {
  const { panel, ranges, cen } = market({ elasticity: 0, passThrough: 0, base: 2000 });
  const r = estimate(panel, ranges, cen.events, { reps: 100 });
  assert.equal(r.usable, 0);
  assert.match(r.dropped[0].reason, /under \$50,000 in the 7 days before \(\$/);
});

const flat = (ref, fees, start = '2027-01-01', extra = () => []) => fees.map((f, d) => ({ head: { day: dayAt(start, d) }, swaps: [...(f == null ? [] : Array.isArray(f) ? f : [row(ref, f, 1000, 20)]), ...extra(d)] }));

test('census rules: 7 days on both sides, at least 5 bps, at most 7 days between', () => {
  const run = (a, b, gap = 0) => census(flat('x', [...Array(a).fill(10), ...Array(gap).fill(null), ...Array(b).fill(16)])).events.length;
  assert.equal(run(7, 7), 1);
  assert.equal(run(6, 7), 0, 'six days before');
  assert.equal(run(7, 6), 0, 'six days after');
  assert.equal(run(7, 7, 6), 1, 'first day after is 7 days after the last day before');
  assert.equal(run(7, 7, 7), 0, '8 days between');
  assert.equal(census(flat('x', [...Array(7).fill(10), ...Array(7).fill(14)])).events.length, 0, 'a 4 bps step is not an event');
});

test('census rules: the fee is rounded, needs 10 swaps and a 70% share, and 1click-unknown is not a frontend', () => {
  assert.equal(census(flat('x', [[row('x', 9.6, 1, 0)]])).frontends[0].runs[0].fee, 10);
  const thin = census(flat('x', [[row('x', 10, 1, 0, 9)]])).frontends[0];
  assert.equal(thin.feeDays, 0, 'nine swaps give no daily fee');
  const mixed = census(flat('x', [[row('x', 10, 1, 0, 13), row('x', 30, 1, 0, 7)]])).frontends[0];
  assert.equal(mixed.feeDays, 0, '65% is under the 70% share');
  const mostly = census(flat('x', [[row('x', 10, 1, 0, 14), row('x', 30, 1, 0, 6)]])).frontends[0];
  assert.equal(mostly.runs[0].fee, 10);
  assert.equal(census(flat('1click-unknown', Array(20).fill(10))).frontends.length, 0);
  const blank = census(flat('', Array(20).fill(10)));
  assert.equal(blank.frontends.length, 0);
  assert.equal(census(flat('x', [[{ ...row('x', 10, 1, 0), fee: null }]])).frontends[0].feeDays, 0, 'a null fee is left out');
});

test('A4: the 1 to 4 Oct pause and gap days are left out of the windows', () => {
  const days = flat('x', Array(20).fill(10), '2026-10-01').filter((d) => d.head.day !== '2026-10-08');
  const p = panelOf(days);
  assert.equal(p.days.length, 20, 'the calendar keeps the gap day');
  assert.deepEqual([...p.out].map((i) => p.days[i]).sort(), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-08']);
});

test('AC-5.2 checks: drop the largest, fee shifts, the hub-shift days and an outside control each run on their own', () => {
  const { panel, ranges, cen, mood } = market({ elasticity: -1.5, passThrough: 0.7 });
  const r = estimateAll(panel, ranges, cen.events, { reps: 200, venues: [{ key: 'cow', name: 'CoW Swap', series: Float64Array.from(mood, (m) => 9e6 * m) }] });
  const largest = [...r.main.events].sort((a, b) => b.beforeUsd - a.beforeUsd)[0].frontend;
  assert.equal(r.checks.dropLargest.skipped, largest);
  assert.equal(r.checks.dropLargest.usable, 7);
  assert.ok(r.checks.shift2.e1 && r.checks.shift10.e1);
  assert.deepEqual(r.checks.noHubShift.skipped, [], 'no window touches 28 to 30 Oct 2026 in 2027 data');
  assert.ok(Math.abs(r.checks.control_cow.e1.estimate + 1.5) < 0.3, 'a control that follows the market finds the same effect');
});

test('an outside control missing a day makes the windows around it unusable', () => {
  const { panel, ranges, cen, mood } = market({ elasticity: -1.5, passThrough: 0.7 });
  const series = Float64Array.from(mood, (m) => 9e6 * m);
  series[panel.at.get('2027-01-24')] = 0;
  const r = estimate(panel, ranges, cen.events, { reps: 100, control: series });
  assert.ok(r.dropped.some((d) => d.frontend === 'app0'), 'app0 windows include 24 Jan');
});

test('A4: a history row gives the census its daily fee and a stablecoin cost group, and _rest is never a frontend', () => {
  const doc = { columns: ['day', 'ref', 'n', 'unpriced', 'vol', 'fee', 'np', 'inUsd', 'outUsd', 'grossUsd'], rows: [
    ['2026-01-01', '1click-a', 40, 1, 5000, 20, 4, 1000, 985, 1002],
    ['2026-01-01', '_rest', 7, 0, 900, null, 0, 0, 0, 0],
    ['2026-01-02', '1click-a', 12, 0, 800, null, 0, 0, 0, 0],
  ] };
  const days = historyDays(doc);
  assert.deepEqual(days.map((d) => d.head.day), ['2026-01-01', '2026-01-02']);
  const cost = days[0].swaps.find((r) => r.np > 0);
  assert.deepEqual([cost.n, cost.vol, cost.in, cost.out], [0, 0, 1000, 985]);
  assert.ok(Math.abs(cost.fee - (2 / 1002) * 1e4) < 1e-9);
  const c = census(days);
  assert.deepEqual(c.frontends.map((f) => f.frontend), ['1click-a']); // _rest gives no frontend
  assert.deepEqual(c.frontends[0].runs.map((r) => [r.fee, r.days]), [[20, 1]]); // the cost group does not move the daily fee, and a day with no fee stays one
  const p = panelOf(days);
  assert.equal(p.total[0], 5900); // _rest counts in the control
});

test('A4: a window may not cross from the history to the frozen days, and 1 to 4 Oct are left out', () => {
  const day = (i) => new Date(Date.parse('2026-09-01T00:00:00Z') + i * 864e5).toISOString().slice(0, 10);
  const days = Array.from({ length: 70 }, (_, i) => ({ head: { day: day(i) }, swaps: [{ k: 'd', ref: '1click-a', fee: i < 25 ? 10 : 30, b: 'history', n: 20, np: 0, vol: 100000, in: 0, out: 0 }, { k: 'd', ref: '1click-b', fee: 5, b: 'history', n: 20, np: 0, vol: 100000, in: 0, out: 0 }] }));
  const p = panelOf(days);
  assert.equal(p.days[p.join], JOIN_DAY);
  for (const d of LEFT_OUT_DAYS) assert.ok(p.out.has(p.at.get(d)), d);
  const cen = census(days);
  const ranges = changeRanges(p, cen);
  const r = estimate(p, ranges, cen.events, { reps: 10 });
  const placeboCrossing = r.events.flatMap((e) => e.placeboDates);
  assert.equal(cen.events.length, 1);
  assert.equal(r.usable, 1); // the event itself is well before the join
  assert.ok(placeboCrossing[0] < 70 - 21); // every placebo date whose windows cross the join is gone
  const early = estimate({ ...p, join: undefined }, ranges, cen.events, { reps: 10 });
  assert.ok(early.events[0].placeboDates > r.events[0].placeboDates);
});
