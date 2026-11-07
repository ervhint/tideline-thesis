import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyActivity } from './activity.mjs';

const day = (i) => new Date(Date.parse('2026-10-01T00:00:00Z') + i * 864e5).toISOString().slice(0, 10);
const tx = (n) => ({ columns: ['day', 'transactions', 'activeAccounts'], rows: Array.from({ length: n }, (_, i) => [day(i), 10, 7]) });
const use = (n) => ({ columns: ['day', 'receipts', 'tgasBurnt', 'nearBurnt'], rows: Array.from({ length: n }, (_, i) => [day(i), 100, 1, 2]) });

test('weeks count back from the last day and a part week is left out', () => {
  const a = weeklyActivity(tx(16), use(16));
  assert.equal(a.weeks.length, 2);
  assert.deepEqual(a.weeks[1], { from: day(9), to: day(15), transactions: 70, signersPerDay: 7, receipts: 700, nearBurnt: 14 });
  assert.equal(a.from, day(2));
});

test('a day on only one side is left out, not counted as zero', () => {
  const a = weeklyActivity(tx(8), use(7));
  assert.equal(a.weeks.length, 1);
  assert.equal(a.weeks[0].to, day(6));
});

test('too few days gives no week, not a broken one', () => {
  assert.deepEqual(weeklyActivity(tx(3), use(3)), { from: null, to: null, weeks: [] });
});
