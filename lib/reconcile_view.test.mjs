import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileRows, cumulativeVolume } from './reconcile_view.ts';

// One figure per day from 1 Sep 2025 to 21 Sep 2026 (386 days), summing to `total`, plus a day either side that must not count.
const fullVolume = (total) => {
  const rows = [{ day: '2025-08-31', defillama: 7e9 }];
  for (let t = Date.parse('2025-09-01T00:00:00Z'); t <= Date.parse('2026-09-21T00:00:00Z'); t += 86_400_000) rows.push({ day: new Date(t).toISOString().slice(0, 10), defillama: total / 386 });
  rows.push({ day: '2026-09-22', defillama: 1e9 });
  return rows;
};

const inputs = {
  vstar: { priceUsd: 3.81, at16: { mid: 13.7e9 } },
  buybackShare: 1,
  fees: [
    { day: '2026-02-22', fees: 5, revenue: 1e6 }, // before the buyback start: not counted
    { day: '2026-02-23', fees: 5, revenue: 2e6 },
    { day: '2026-10-18', fees: 5, revenue: 4.68e6 },
    { day: '2026-10-19', fees: 5, revenue: 9e6 }, // after the article date: not counted
  ],
  volume: fullVolume(29.5e9),
};

test('T-9.1 every row has a source, a value, a date and our value', () => {
  const rows = reconcileRows(inputs);
  assert.equal(rows.length, 4);
  for (const r of rows) {
    assert.ok(r.ours && r.ours !== 'Not available');
    assert.ok(r.others.length >= 1);
    for (const o of r.others) assert.ok(o.name && o.value && o.date);
  }
});

test('T-9.1 our sums stop on the same day as the source they are compared with', () => {
  const rows = reconcileRows(inputs);
  assert.match(rows[2].ours, /\$6\.68M of revenue/);
  assert.match(rows[3].ours, /^\$29\.5B/);
});

test('T-9.1 with the files missing, our cells say so instead of showing old numbers', () => {
  const rows = reconcileRows({ vstar: null, buybackShare: null, fees: [], volume: [] });
  assert.equal(rows[0].ours, 'Not available');
  assert.equal(rows[2].ours, 'Not available');
  assert.equal(rows[3].ours, 'Not available');
});

test('T-T6g.1 Cumulative Volume: the sentence follows how far ours is from the public part', () => {
  const near = reconcileRows({ ...inputs, volume: fullVolume(29.6e9) })[3];
  assert.match(near.ours, /^\$29\.6B/);
  assert.match(near.why, /^Our figure matches the public part/);
  const off = reconcileRows({ ...inputs, volume: fullVolume(29.5e9 * 0.8) })[3];
  assert.match(off.ours, /^\$23\.6B/);
  assert.match(off.why, /^Our figure is 20% below the public part, so the two do not match/);
  assert.doesNotMatch(off.why, /matches/);
  const above = reconcileRows({ ...inputs, volume: fullVolume(29.5e9 * 1.2) })[3];
  assert.match(above.why, /20% above/);
});

test('T-T6g.1 Cumulative Volume: a day missing or without a figure gives no total and no claim', () => {
  const hole = fullVolume(29.5e9).filter((r) => r.day !== '2026-01-15');
  const nul = fullVolume(29.5e9).map((r) => (r.day === '2026-01-15' ? { ...r, defillama: null } : r));
  for (const volume of [hole, nul, []]) {
    assert.equal(cumulativeVolume(volume), null);
    const row = reconcileRows({ ...inputs, volume })[3];
    assert.equal(row.ours, 'Not available');
    assert.doesNotMatch(row.why, /match/);
  }
});
