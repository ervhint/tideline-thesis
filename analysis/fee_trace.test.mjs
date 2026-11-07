import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteBreakdown, traceQuote } from './fee_trace.mjs';

const row = (o = {}) => ({
  sizeUsd: 1000, http: 201, reference: { mid: 100, usdcUsdtMid: 1 },
  response: { quote: { amountInFormatted: '10', amountOutFormatted: '990', withdrawFee: '1000000' }, quoteRequest: { appFees: [{ fee: 20 }] } }, ...o,
});

test('the parts of a quote add up to its all-in cost', () => {
  const t = traceQuote(row());
  assert.equal(Math.round(t.allInBps), 100);
  assert.equal(t.appFeeBps, 20);
  assert.equal(Math.round(t.withdrawBps), 10);
  assert.ok(Math.abs(t.allInBps - t.appFeeBps - t.withdrawBps - t.unexplainedBps) < 1e-9);
});

test('a failed quote gives no trace, and the breakdown counts it instead of dropping it', () => {
  assert.equal(traceQuote(row({ http: 500 })), null);
  assert.equal(traceQuote({ http: 200, response: {} }), null);
  const [g] = quoteBreakdown([row(), row({ http: 500 })]);
  assert.deepEqual([g.quotes, g.failed], [1, 1]);
  assert.deepEqual(quoteBreakdown([row({ http: 500 })]), [{ sizeUsd: 1000, quotes: 0, failed: 1 }]);
});

test('each size takes the median across pairs, smallest size first', () => {
  const out = (o) => row({ response: { quote: { amountInFormatted: '10', amountOutFormatted: String(o), withdrawFee: '0' }, quoteRequest: {} } });
  const b = quoteBreakdown([{ ...out(990), sizeUsd: 100 }, out(1000), out(990), out(980)]);
  assert.deepEqual(b.map((x) => x.sizeUsd), [100, 1000]);
  assert.equal(Math.round(b[1].allInBps), 100);
});
