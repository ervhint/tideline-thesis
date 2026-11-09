import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advance, HOLD_HOURS, publicMessage, weeklyNote, failureMessage } from './public_alarm.mjs';

const IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
const doc = (sides, verdict = 'Undecided', extra = {}) => ({
  asOf: '2026-11-09T00:00:00Z',
  readings: sides.map((side, i) => ({ id: IDS[i], name: `Reading ${i + 1}`, side, detail: `Spread 3.4 bps, top 3 hold 64%`, ...(extra[IDS[i]] ?? {}) })),
  verdict: { verdict, score: 3, missing: 0, held: [] },
});
const at = (h) => new Date(Date.UTC(2026, 10, 3, 3) + h * 3_600_000).toISOString();
const run = (steps) => {
  let state = null; const out = [];
  for (const [h, d] of steps) { const r = advance(state, d, at(h)); state = r.state; out.push(r); }
  return { state, out };
};
const BASE = ['Neutral', 'Bullish', 'Neutral', 'Neutral', 'Bullish'];
const PRO = /\bbps\b|\bscore\b|top 3|\bbuy\b|\bsell\b|demand/i;

test('T-T6k.1 the first run only records the sides and announces nothing', () => {
  const { state, out } = run([[0, doc(BASE, 'Bullish')]]);
  assert.deepEqual(out[0].publish, []);
  assert.equal(state.announced.Verdict, 'Bullish');
  assert.equal(state.announced.Q5, 'Bullish');
});

test('T-T6k.1 a change goes public only once it has held 72 hours', () => {
  const moved = ['Neutral', 'Bullish', 'Neutral', 'Neutral', 'Neutral'];
  assert.equal(HOLD_HOURS, 72);
  const { out, state } = run([[0, doc(BASE)], [1, doc(moved)], [72, doc(moved)], [73, doc(moved)], [74, doc(moved)]]);
  assert.deepEqual(out.map((o) => o.publish.length), [0, 0, 0, 1, 0]);
  assert.deepEqual(out[3].publish[0], { at: at(73), id: 'Q5', from: 'Bullish', to: 'Neutral', since: at(1) });
  assert.equal(state.announced.Q5, 'Neutral');
  assert.deepEqual(state.pending, {});
  assert.equal(state.log.length, 1);
});

test('T-T6k.1 hourly runs that skip still count the hours since the change', () => {
  const moved = ['Neutral', 'Bullish', 'Neutral', 'Bullish', 'Bullish'];
  const { out } = run([[0, doc(BASE)], [5, doc(moved)], [90, doc(moved)]]);
  assert.equal(out[2].publish.length, 1);
});

test('T-T6k.2 the 3 and 4 Nov flip-flop never goes public and is noted privately', () => {
  // Verdict Bullish -> Undecided at 11:03 on 3 Nov, back to Bullish at 14:34 on 4 Nov (about 28 hours).
  const { out, state } = run([[0, doc(BASE, 'Bullish')], [8, doc(['Neutral', 'Bullish', 'Neutral', 'Neutral', 'Neutral'], 'Undecided')], [35.5, doc(BASE, 'Bullish')], [200, doc(BASE, 'Bullish')]]);
  assert.deepEqual(out.flatMap((o) => o.publish), []);
  assert.deepEqual(out[2].dropped.map((d) => d.id).sort(), ['Q5', 'Verdict']);
  assert.equal(state.announced.Verdict, 'Bullish');
  assert.deepEqual(state.pending, {});
});

test('T-T6k.2 a change that moves on to a third side restarts the clock', () => {
  const a = ['Neutral', 'Bullish', 'Neutral', 'Neutral', 'Neutral'];
  const b = ['Neutral', 'Bullish', 'Neutral', 'Neutral', 'Bearish'];
  const { out } = run([[0, doc(BASE)], [1, doc(a)], [50, doc(b)], [100, doc(b)], [123, doc(b)]]);
  assert.deepEqual(out.map((o) => o.publish.length), [0, 0, 0, 0, 1]);
  assert.deepEqual(out[2].dropped.map((d) => d.to), ['Neutral']);
  assert.equal(out[4].publish[0].to, 'Bearish');
});

const LINK = 'https://example.org/';
const checkPublic = (m) => {
  assert.doesNotMatch(m, PRO);
  assert.doesNotMatch(m, /\[\[|\]\]/);
  assert.ok(m.trimEnd().endsWith('Research, not financial advice.'), m);
  assert.ok(m.includes(LINK));
};

test('T-T6k.3 each public kind is in Easy words and ends with the link and the advice line', () => {
  const d = doc(['Neutral', 'Bullish', 'Not Measured', 'Neutral', 'Neutral'], 'Undecided', { Q3: { privateFlow: true } });
  const kinds = {
    reading: { id: 'Q5', from: 'Bullish', to: 'Neutral' },
    verdict: { id: 'Verdict', from: 'Bullish', to: 'Undecided' },
    blind: { id: 'Q3', from: 'Neutral', to: 'Not Measured' },
    back: { id: 'Q3', from: 'Not Measured', to: 'Bullish' },
  };
  for (const [k, c] of Object.entries(kinds)) {
    const m = publicMessage([c], d, LINK);
    checkPublic(m);
    if (k === 'reading') assert.match(m, /“Is NEAR['’]s fee income growing\?” went from looks good to unclear/);
    if (k === 'verdict') assert.match(m, /not that the price will go up or down/);
    if (k === 'blind') assert.match(m, /can no longer answer “Do the traders really compete\?”/);
    if (k === 'back') assert.match(m, /can answer “Do the traders really compete\?” again/);
  }
});

test('T-T6k.4 a worse answer never reads as a fall in demand; the Treasury is never a solver; the hold is said plainly', () => {
  const d = doc(['Neutral', 'Bearish', 'Not Measured', 'Neutral', 'Bullish'], 'Undecided', { Q3: { privateFlow: true } });
  d.verdict.held = ['Q3'];
  const m = publicMessage([{ id: 'Q2', from: 'Bullish', to: 'Bearish' }, { id: 'Q3', from: 'Neutral', to: 'Not Measured' }, { id: 'Verdict', from: 'Bullish', to: 'Undecided' }], d, LINK);
  checkPublic(m);
  assert.match(m, /does not mean fewer people are swapping/);
  assert.match(m, /on hold/);
  assert.doesNotMatch(m, /Treasury[^.]*(solver|trader)/i);
});

test('T-T6k.5 the weekly note: a quiet week, and a week with a change', () => {
  const d = doc(['Neutral', 'Bullish', 'Not Measured', 'Neutral', 'Bullish'], 'Undecided', { Q3: { privateFlow: true } });
  d.verdict.held = ['Q3'];
  const now = '2026-11-16T01:00:00Z';
  const quiet = weeklyNote(d, { log: [{ at: '2026-11-01T00:00:00Z', id: 'Q5', from: 'Neutral', to: 'Bullish' }] }, now, LINK);
  checkPublic(quiet);
  assert.match(quiet, /Quiet week: no answer changed side/);
  assert.match(quiet, /16 Nov/);
  for (const id of IDS) assert.ok(quiet.includes('“'), id);
  assert.match(quiet, /What we can’t see/);
  const busy = weeklyNote(d, { log: [{ at: '2026-11-12T00:00:00Z', id: 'Q5', from: 'Neutral', to: 'Bullish' }] }, now, LINK);
  checkPublic(busy);
  assert.match(busy, /“Is NEAR['’]s fee income growing\?” went from unclear to looks good/);
  assert.doesNotMatch(busy, /Quiet week/);
});

test('T-T6k.5 no thesis file means no weekly note', () => {
  assert.equal(weeklyNote(null, null, '2026-11-16T01:00:00Z', LINK), null);
});

test('T-T6k.8 the channel gets a post only while TELEGRAM_PUBLIC is on; failures go to the private chat only', () => {
  const gate = "TELEGRAM_CHANNEL_ID: ${{ vars.TELEGRAM_PUBLIC == 'on' && secrets.TELEGRAM_CHANNEL_ID || '' }}";
  let channelSteps = 0;
  for (const f of readdirSync('.github/workflows')) {
    const y = readFileSync(`.github/workflows/${f}`, 'utf8');
    for (const line of y.split('\n').filter((l) => l.includes('TELEGRAM_CHANNEL_ID'))) { assert.equal(line.trim(), gate, f); channelSteps++; }
    assert.doesNotMatch(y, /TELEGRAM_CHAT_ID: \$\{\{ secrets\.TELEGRAM_CHANNEL_ID/, f);
    for (const m of y.matchAll(/telegram\.mjs --failed (\S+)/g)) assert.doesNotThrow(() => failureMessage(m[1], 'x'), f);
  }
  assert.equal(channelSteps, 2); // refresh and weekly-note
  for (const f of ['refresh.yml', 'attest-days.yml', 'panel.yml', 'weekly-note.yml']) assert.match(readFileSync(`.github/workflows/${f}`, 'utf8'), /telegram\.mjs --failed /, f);
});

test('T-T6k.8 without the channel id the sender prints and posts nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-'));
  const file = join(dir, 'm.txt');
  writeFileSync(file, 'hello channel');
  const r = spawnSync(process.execPath, ['pipeline/telegram.mjs', '--channel', file], { encoding: 'utf8', env: { ...process.env, TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHANNEL_ID: '' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /TELEGRAM_CHANNEL_ID is not set, printing instead of sending:\n\nhello channel/);
});

test('T-T6k.6 a failure message names the job and the run only', () => {
  const url = 'https://github.com/ervhint/tideline-thesis/actions/runs/123';
  for (const job of ['attest-days', 'refresh', 'panel', 'weekly-note']) {
    const m = failureMessage(job, url);
    assert.ok(m.startsWith(`Tideline: the ${job} run failed.`), m);
    assert.ok(m.endsWith(`Run: ${url}`));
    assert.doesNotMatch(m.replace(url, ''), /\d/);
  }
  assert.throws(() => failureMessage('other', 'x'));
});
