// T6e B (docs/PLAN.md §6c): the activity charts on Method.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activityCharts, barAria, shortDay } from './bar_charts.ts';

const doc = JSON.parse(readFileSync('data/published/activity.json', 'utf8'));
const week = (from, to, n) => ({ from, to, transactions: n, signersPerDay: n, receipts: n, nearBurnt: n });

test('T-T6e.1 one chart per measure over every stored week, with first and last values in the label', () => {
  const c = activityCharts(doc);
  assert.deepEqual(c.series.map((s) => s.title), ['Transactions', 'Signers a Day', 'Receipts', 'NEAR Burnt']);
  for (const s of c.series) assert.equal(s.values.length, doc.weeks.length);
  assert.equal(c.periods.length, doc.weeks.length);
  assert.deepEqual(c.series[0].values, doc.weeks.map((w) => w.transactions));
  const aria = barAria(c);
  const [first, last] = [doc.weeks[0], doc.weeks.at(-1)];
  for (const k of ['transactions', 'signersPerDay', 'receipts', 'nearBurnt']) {
    assert.ok(aria.includes(first[k].toLocaleString('en-US')), k);
    assert.ok(aria.includes(last[k].toLocaleString('en-US')), k);
  }
  assert.equal(c.latestLabel, `Week to ${shortDay(last.to)}`);
});

test('T-T6e.1 the marker sits on the week holding 27 Oct 2026, and none when no week holds it', () => {
  const c = activityCharts(doc);
  const w = doc.weeks[c.marker.index];
  assert.ok(w.from <= '2026-10-27' && w.to >= '2026-10-27');
  assert.match(c.marker.label, /Confidential settlement begins/);
  assert.equal(activityCharts({ weeks: [week('2026-09-01', '2026-09-07', 1), week('2026-09-08', '2026-09-14', 2)] }).marker, undefined);
});

test('T-T6e.2 no file, no weeks or one week: no chart', () => {
  assert.equal(activityCharts(null), null);
  assert.equal(activityCharts({ weeks: [] }), null);
  assert.equal(activityCharts({ weeks: [week('2026-11-01', '2026-11-07', 5)] }), null);
});

test('T-T6e.2 a missing value is never drawn as zero, and the label says there is no total', () => {
  const src = readFileSync('components/BarCharts.tsx', 'utf8');
  assert.match(src, /v != null &&/);
  const aria = barAria({ label: 'x', periods: ['1 Oct', '2 Oct'], series: [{ title: 'Swap Volume a Day', values: [null, 3], fmt: String }] });
  assert.match(aria, /no total for 1 Oct, 3 for 2 Oct/);
});

test('shortDay reads a date without a time zone shift', () => {
  assert.equal(shortDay('2026-11-06'), '6 Nov');
  assert.equal(shortDay('2026-08-21'), '21 Aug');
});
