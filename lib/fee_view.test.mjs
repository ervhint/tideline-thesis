import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { feeView, buybackPart } from './fee_view.ts';

const left = { notBothPriced: { swaps: 3 }, feeUnreadable: { groups: 1, swaps: 2, usd: 10 }, priceCheck: { groups: 0, swaps: 0, usd: 0 } };
const parts = (o) => ({ groups: 2, swaps: 10, grossUsd: 100000, outUsd: 99000, allInBps: 100, appFeeBps: 20, protocolBps: 0.01, spreadBps: 79.99, partsGapBps: 0, left, ...o });
const trace = {
  from: '2026-10-29', to: '2026-11-04', days: 7, gapsInWindow: 0, protocolFee: { bps: 0.01, collector: '7066024d3f20f94de601c003163367873cca78507eeca4df66d9be645f197f05' },
  trace: { days: [], bySize: { '10k-100k': { all: parts({}), tokenDiff: parts({ grossUsd: 40000 }), transfer: parts({ grossUsd: 60000, appFeeBps: 0 }), confidential: { groups: 5, swaps: 40, inUsd: 300000, outUsd: 297000, allInBps: 89 } } }, allSizes: {} },
  nearRevenue: { bps: 4.99, from: '2026-10-06', to: '2026-11-04' },
};

test('T-3.1 S2 view: the bar parts add up to the all-in cost within 0.5 bps, and the dollars follow from $10,000', () => {
  const v = feeView(trace);
  assert.equal(v.state, 'split');
  const sum = v.parts.filter((p) => p.share).reduce((s, p) => s + p.share, 0);
  assert.ok(Math.abs(sum - 100) < 0.5);
  assert.equal(v.total, '$100.00');
  assert.equal(v.card.value, '100.0 bps');
  assert.match(v.parts.find((p) => p.key === 'app').text, /60% of this public USD/);
});

test('T-3.1 S2 view on the published file: parts sum within 0.5 bps (INV-4)', () => {
  const real = JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8'));
  const v = feeView(real);
  assert.equal(v.state, 'split');
  const g = real.trace.bySize['10k-100k'].all;
  const sum = v.parts.filter((p) => p.share).reduce((s, p) => s + p.share, 0);
  assert.ok(Math.abs(sum - g.allInBps) < 0.5);
  for (const k of Object.values(real.trace.bySize)) for (const c of Object.values(k)) if (c.partsGapBps != null) assert.ok(Math.abs(c.partsGapBps) <= 0.5);
});

test('T-3.2 S2 view: the number carries its plain-language line, its query, and the unexplained part is listed', () => {
  const v = feeView(trace);
  assert.match(v.explain, /\$10,000 swap/);
  assert.match(v.query, /PREREG\.md section 7/);
  assert.ok(v.parts.some((p) => p.key === 'unexplained'));
  assert.match(v.bannerText, /3 swaps without a price/);
});

test('T-T6j.1 Easy unexplained note: plain words, counts from the data, Pro unchanged', () => {
  const v = feeView(trace);
  // J2: one total, then each group with swaps; a group at zero is not named.
  assert.match(v.easyBanner, /We left out 5 swaps: for 3 we couldn’t find a dollar price for one of the coins and for 2 we couldn’t read the app’s fee\./);
  assert.doesNotMatch(v.easyBanner, /both sides|price check|token|looked wrong/);
  assert.match(v.easyBanner, /nobody can see their fees/);
  assert.match(v.bannerText, /3 swaps without a price on both sides, 2 with an app fee paid in a third token that could not be valued, 0 that failed the price check/);
  const at = (l) => feeView({ ...trace, trace: { ...trace.trace, bySize: { '10k-100k': { ...trace.trace.bySize['10k-100k'], all: parts({ left: l }) } } } }).easyBanner;
  assert.match(at({ ...left, notBothPriced: { swaps: 1234 }, priceCheck: { groups: 1, swaps: 7, usd: 5 } }), /left out 1,243 swaps: for 1,234 .*, for 2 .* and for 7 the price looked wrong/);
  assert.match(at({ notBothPriced: { swaps: 0 }, feeUnreadable: { groups: 0, swaps: 1, usd: 1 }, priceCheck: { groups: 0, swaps: 0, usd: 0 } }), /left out 1 swap: for 1 we couldn’t read the app’s fee\./);
  assert.match(at({ notBothPriced: { swaps: 0 }, feeUnreadable: { groups: 0, swaps: 0, usd: 0 }, priceCheck: { groups: 0, swaps: 0, usd: 0 } }), /^Every public swap here fits the split above, so none is left out\./);
});

test('T-3.1 S2 view: a missing file and an empty public bucket are real states, with no sample figure', () => {
  assert.deepEqual(feeView(null), { state: 'missing' });
  const none = { ...trace, trace: { ...trace.trace, bySize: { '10k-100k': { ...trace.trace.bySize['10k-100k'], all: parts({ allInBps: null }) } } } };
  const v = feeView(none);
  assert.equal(v.state, 'empty');
  assert.match(v.lead, /No public swap of \$10k to \$100k/);
  assert.match(v.body, /not a fall in demand/);
  assert.doesNotMatch(JSON.stringify(v), /\$20\.30|Sample|sample/);
});

test('A2 rule 6: the confidential path is its own line, outside the bar, with no app fee or spread claimed for it', () => {
  const v = feeView(trace);
  const c = v.parts.find((p) => p.key === 'confidential');
  assert.equal(c.value, '89.0 bps');
  assert.equal(c.share, 0, 'not in the bar, so the bar still adds up to the public all-in cost');
  assert.match(c.text, /Not in the split above/);
  assert.match(c.text, /40 round trips of/);
  assert.match(c.text, /75% of the USD of this size/);
  assert.match(c.text, /its app fee is not read as 0/);
  assert.match(v.card.text, /confidential path 89\.0 bps, reported apart/);
  assert.match(v.lead, /real public swaps/);
  assert.doesNotMatch(JSON.stringify(v), /\b[Hh]ub\b/);
});

test('A2 rule 6: no treasury swaps of this size, no confidential line', () => {
  const none = { ...trace, trace: { ...trace.trace, bySize: { '10k-100k': { ...trace.trace.bySize['10k-100k'], confidential: { swaps: 0, inUsd: 0, allInBps: null } } } } };
  const v = feeView(none);
  assert.equal(v.parts.find((p) => p.key === 'confidential'), undefined);
  assert.match(v.card.text, /confidential path not measured/);
});

test('T-T6g.3 buyback: "all" only at 100%, the share otherwise, "not burned" only when false, no claim without a figure', () => {
  const near = (buyback) => ({ bps: 5, from: '2026-10-08', to: '2026-11-06', buyback });
  const all = buybackPart(near({ share: 1, burned: false, since: '2026-02-23' }));
  assert.equal(all.value, '5.0 bps');
  assert.match(all.text, /^All of NEAR's captured Intents revenue/);
  assert.match(all.text, /is not burned/);
  assert.match(all.text, /buybacks began on 23 Feb 2026/);
  const some = buybackPart(near({ share: 0.8, burned: false }));
  assert.equal(some.value, '4.0 bps');
  assert.match(some.text, /^80% of NEAR's captured Intents revenue/);
  assert.doesNotMatch(some.text, /^All/);
  const burned = buybackPart(near({ share: 1, burned: true }));
  assert.doesNotMatch(burned.text, /not burned/);
  assert.match(burned.text, /is burned/);
  for (const b of [undefined, { share: null, burned: false }]) {
    const none = buybackPart(near(b));
    assert.equal(none.value, '—');
    assert.doesNotMatch(none.text, /All|bought NEAR|burned/);
  }
  assert.equal(buybackPart(undefined).value, '—');
  assert.equal(feeView({ ...trace, nearRevenue: near({ share: 0.8, burned: false }) }).parts.find((p) => p.key === 'buyback').value, '4.0 bps');
});

test('T-T6g.5 the cost card takes its year from the last chain day', () => {
  assert.match(feeView({ ...trace, to: '2027-01-05' }).card.source, /^Chain days to 5 Jan 2027\./);
  assert.match(feeView(trace).card.source, /^Chain days to 4 Nov 2026\./);
});

test('T-T6j.5 Easy top section: every row name shown in Easy has the same numbers as Pro; the minus line only when a part is negative', () => {
  const nums = (t) => (t.match(/-?\d[\d,.]*/g) ?? []).join(' ');
  const real = feeView(JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8')));
  for (const v of [feeView(trace), real]) {
    for (const p of v.parts) {
      assert.equal(nums(p.easyName ?? p.name), nums(p.name), p.key);
    }
    assert.equal(nums(v.easySpreadNote), nums(v.spreadNote));
    assert.ok(v.easyTitle.includes(v.total));
    assert.doesNotMatch([v.easyLead, v.easySpreadSub, ...v.parts.map((p) => p.easy)].join(' '), /plain transfer|price noise|all-in|token_diff/);
  }
  const neg = (x) => x.parts.find((p) => p.key === 'unexplained').easy;
  const anyNeg = (tr) => Object.values(tr.trace.bySize['10k-100k']).some((c) => c && c.spreadBps < 0);
  const realTrace = JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8'));
  assert.equal(/A minus means/.test(neg(real)), anyNeg(realTrace) && ['tokenDiff', 'transfer'].some((k) => realTrace.trace.bySize['10k-100k'][k].spreadBps < 0));
});

test('T-T6j.15 Pro Follow the Fee: token_diff only as the named kind, the minus note only when a part is negative', () => {
  const raw = JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8'));
  const real = feeView(raw);
  for (const v of [feeView(trace), real]) {
    const pro = [v.lead, v.bannerText, v.card.text, ...v.parts.map((p) => p.text)].join(' ');
    assert.doesNotMatch(pro.replace(/logged as token_diff/g, ''), /token_diff/);
    assert.doesNotMatch(pro, /paired confidential flows|two public edges|a token the swap did not give/);
  }
  const k = raw.trace.bySize['10k-100k'];
  const neg = [k.tokenDiff.spreadBps, k.transfer.spreadBps].some((x) => x != null && x < 0);
  assert.equal(/A negative figure means/.test(real.parts.find((p) => p.key === 'unexplained').text), neg);
});

test('T-T6j.19 the number sheet: Pro query names only this number, Easy gets a plain line and the dollar figure', () => {
  const v = feeView(JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8')));
  assert.match(v.query, /^Query: feeTrace in analysis\/realised_cost\.mjs/);
  assert.doesNotMatch(v.query, /q3Spread|solverConcentration/);
  assert.doesNotMatch(v.easyQuery, /\.mjs|\.json|PREREG/);
  assert.equal(v.card.easyNote, `${v.total} on a $10,000 swap`);
});
