import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ratios, visibility } from './visibility.mjs';

test('the ratio is 7 days of DefiLlama over 7 days of chain-counted USD', () => {
  const llama = Array.from({ length: 8 }, (_, i) => ({ day: `2026-10-0${i + 1}`, volume: 300, revenue: 1 }));
  const chain = new Map(llama.map((d) => [d.day, 100]));
  chain.set('2026-10-08', 200);
  const r = ratios(llama, chain);
  assert.equal(r.length, 2);
  assert.equal(r[0].ratio, 3);
  assert.equal(r[1].ratio, 2100 / 800);
});

test('a day missing from either side is left out, not filled in', () => {
  const llama = Array.from({ length: 9 }, (_, i) => ({ day: `2026-10-0${i + 1}`, volume: i === 2 ? null : 300, revenue: 1 }));
  const chain = new Map(llama.map((d) => [d.day, 100]));
  chain.delete('2026-10-05');
  assert.equal(ratios(llama, chain).length, 1);
});

test('A3: no line and no state, whatever the ratio does, and the history behind that is published', () => {
  const days = [];
  for (let t = Date.parse('2026-10-04'); t <= Date.parse('2026-11-06'); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    days.push({ day, volume: 400, revenue: 1 });
  }
  const chain = new Map(days.map((d) => [d.day, d.day < '2026-10-27' ? 100 : 1]));
  const v = visibility(days, chain);
  assert.equal(v.line, null);
  assert.equal(v.state, null);
  assert.deepEqual(v.history, { wantedDays: 90, chainDaysBefore: 23, ratiosBefore: 17 });
  assert.ok(v.ratio > 100);
  assert.deepEqual(v.rangeBefore, { low: 4, high: 4 });
});

test('revenue is split at 27 Oct, with 30 days before and the days since', () => {
  const days = [];
  for (let t = Date.parse('2026-09-01'); t <= Date.parse('2026-10-31'); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    days.push({ day, volume: 100, revenue: day < '2026-10-27' ? 5 : 4 });
  }
  const v = visibility(days, new Map(days.map((d) => [d.day, 30])));
  assert.deepEqual([v.revenueSplit.before.days, v.revenueSplit.before.to, v.revenueSplit.before.revenueRate], [30, '2026-10-26', 0.05]);
  assert.deepEqual([v.revenueSplit.since.days, v.revenueSplit.since.from, v.revenueSplit.since.revenueRate], [5, '2026-10-27', 0.04]);
});
