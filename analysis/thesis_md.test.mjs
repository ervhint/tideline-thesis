import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { thesisMd, treasuryWords, integratorWords } from './thesis_md.mjs';

const pub = (f) => JSON.parse(readFileSync(`data/published/${f}.json`, 'utf8'));
const docs = () => ({ thesis: pub('thesis'), elasticity: pub('elasticity'), visibility: pub('visibility'), inputs: pub('model_inputs') });
const clone = (o) => JSON.parse(JSON.stringify(o));

test('T-T6h.1 the script on the published files gives the committed THESIS.md', () => {
  assert.equal(thesisMd(docs()), readFileSync('THESIS.md', 'utf8'));
});

// A thesis doc with the treasury share, the largest frontend's share and the hold set as asked.
function altered({ treasury, swapkit, held }) {
  const d = docs(), t = clone(d.thesis);
  t.privateFlow.q3.share = treasury;
  t.concentration.largest.share = swapkit;
  const q3 = t.readings.find((r) => r.id === 'Q3'), q4 = t.readings.find((r) => r.id === 'Q4');
  q4.side = swapkit > 0.8 ? 'Bearish' : swapkit < 0.5 ? 'Bullish' : 'Neutral';
  delete q4.privateFlow;
  if (held) { q3.side = 'Not Measured'; q3.privateFlow = true; t.verdict = { verdict: 'Undecided', score: 3, missing: 1, held: ['Q3'] }; }
  else { q3.side = 'Neutral'; delete q3.privateFlow; q3.detail = 'Spread 7.0 bps, top 3 hold 56%'; t.verdict = { verdict: 'Undecided', score: 2, missing: 0, held: [] }; }
  return thesisMd({ ...d, thesis: t });
}

test('T-T6h.3 judgement words follow the lines: treasury 40% and 74%, the largest frontend 79% and 85%', () => {
  assert.equal(treasuryWords(0.4), 'at or under the 50% line');
  assert.equal(treasuryWords(0.74), 'well over the 50% line');
  assert.equal(treasuryWords(0.55), 'over the 50% line');
  assert.equal(integratorWords(0.79), 'just under the 80% line for Bearish');
  assert.equal(integratorWords(0.85), 'over the 80% line for Bearish');
  assert.equal(integratorWords(0.8), 'just under the 80% line for Bearish', 'exactly on a line is Neutral, so not "over"');

  const low = altered({ treasury: 0.4, swapkit: 0.79, held: false });
  assert.match(low, /carried 40% of the USD counted on chain, at or under the 50% line/);
  assert.doesNotMatch(low, /well over the 50% line|moved out of public view/);
  assert.match(low, /pays 79% of visible app fees .*just under the 80% line for Bearish/);
  assert.match(low, /One frontend brings much of the visible fees/);

  const high = altered({ treasury: 0.74, swapkit: 0.85, held: true });
  assert.match(high, /carried 74% of the USD counted on chain, well over the 50% line/);
  assert.match(high, /pays 85% of visible app fees .*over the 80% line for Bearish/);
  assert.match(high, /One frontend brings most visible fees/);
});

test('T-T6h.3 the held text appears only when the verdict is held', () => {
  const held = altered({ treasury: 0.74, swapkit: 0.75, held: true });
  assert.match(held, /held at Undecided on purpose: Solver Competition can no longer be measured/);
  assert.match(held, /which would normally read Bullish/);
  assert.match(held, /so that Solver Competition can be measured again and the hold lifts/);
  const free = altered({ treasury: 0.4, swapkit: 0.75, held: false });
  assert.doesNotMatch(free, /held at Undecided|hold lifts|would normally read/);
  assert.match(free, /The score is \+2 of 7, and the lines are \+3 and −3/);
  assert.match(free, /Solver competition sits between the lines\.\*\* Spread 7\.0 bps, top 3 hold 56%/);
});

test('T-T6h.4 the made THESIS.md: no Explorer or 1Click figure, the demand sentence, no advice wording', () => {
  for (const md of [thesisMd(docs()), altered({ treasury: 0.4, swapkit: 0.85, held: false })]) {
    assert.doesNotMatch(md, /Explorer|1Click|rolling panel/i, 'API data lives only in the rolling panel (terms 4.1(e))');
    assert.match(md, /A fall in public numbers is not a fall in demand/);
    assert.match(md, /^Research, not financial advice\./m);
    assert.doesNotMatch(md, /\b(you should|we recommend|recommend(ed|s)? (buying|selling)|price target|will (rise|fall|go up)|undervalued|overvalued|buy now|sell now|go long|go short)\b/i);
  }
  // The script reads these four published files and nothing else.
  const src = readFileSync('pipeline/build_thesis_md.mjs', 'utf8');
  assert.deepEqual([...src.matchAll(/json\('(\w+)'\)/g)].map((m) => m[1]).sort(), ['elasticity', 'model_inputs', 'thesis', 'visibility']);
});
