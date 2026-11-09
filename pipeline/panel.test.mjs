// Terms 4.1(e): these tests prove that nothing from the Explorer or 1Click API can reach a tracked file, a published file, a feed or a log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { assertOutsideRepo, buildPanel, lastFinishedDays, SWAPS_ONLY } from './panel.mjs';
import { foldRows, frontendName, isRealSwap, newTotals } from '../analysis/panel.mjs';
import { isFresh, panelView } from '../lib/panel_view.ts';
import { readArtifactPanel, unzipOne } from '../lib/panel_source.ts';
import { commandsFor, reproduceLead } from '../lib/mock.ts';

const CANARY_USD = 987654.321;
const row = (o = {}) => ({ originAsset: 'nep141:a', destinationAsset: 'nep141:b', amountInUsd: String(CANARY_USD), appFees: [{ fee: 20, recipient: 'canary-recipient.near' }], referral: 'canary-frontend', depositAddress: 'canary-deposit-address', recipient: 'canary-wallet.near', senders: ['canary-sender.near'], ...o });
const quoteRow = { sizeUsd: 1000, http: 201, reference: { mid: 100, usdcUsdtMid: 1 }, response: { quote: { amountInFormatted: '10', amountOutFormatted: '990', withdrawFee: '0', depositAddress: 'canary-quote-address' }, quoteRequest: { appFees: [] } } };
const fakePull = async (_day, onRows) => onRows([row(), row({ destinationAsset: 'nep141:a' })]);
const now = new Date('2026-11-08T03:00:00Z');
const panel = () => buildPanel({ now, pull: fakePull, quotes: async () => [quoteRow], log: () => {} });

test('the window is the last 30 finished UTC days, today left out', () => {
  const d = lastFinishedDays(now);
  assert.deepEqual([d.length, d[0], d.at(-1)], [30, '2026-10-09', '2026-11-07']);
});

test('real swaps only: same-token rows are left out of every total and only counted', () => {
  assert.equal(isRealSwap(row()), true);
  assert.equal(isRealSwap(row({ destinationAsset: 'nep141:a' })), false);
  const t = foldRows(newTotals(), [row(), row({ destinationAsset: 'nep141:a' }), row({ amountInUsd: null })], '2026-11-01');
  assert.deepEqual([t.all.swaps, t.since.swaps, t.sameToken, t.unpriced], [1, 1, 1, 1]);
  assert.equal(foldRows(newTotals(), [row()], '2026-10-26').since.swaps, 0);
});

test('every pull sets a swap-specific filter above zero, so masking rows stay out', async () => {
  const seen = [];
  await buildPanel({ now, pull: async (_d, _f, o) => seen.push(o.filter), quotes: async () => [], log: () => {} });
  assert.equal(seen.length, 30);
  assert.ok(seen.every((f) => f === SWAPS_ONLY));
  assert.ok(Number(SWAPS_ONLY.minUsdPrice) > 0);
});

test('a referral that looks like an account is never shown by name', () => {
  assert.equal(frontendName('1click-swapkit'), '1click-swapkit');
  assert.equal(frontendName(null), 'No Referral');
  for (const a of ['0x1111111111111111111111111111111111111111', '51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe', 'a'.repeat(41), 'has space']) assert.equal(frontendName(a), 'Other');
});

test('the panel holds totals only: no address, deposit address, recipient or row', async () => {
  const text = JSON.stringify(await panel());
  for (const leak of ['canary-deposit-address', 'canary-wallet', 'canary-sender', 'canary-recipient', 'canary-quote-address', 'depositAddress', 'recipient']) assert.ok(!text.includes(leak), leak);
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ['byDay', 'frontends', 'kind', 'leftOut', 'quotes', 'sinceConfidential', 'startedAt', 'swaps', 'window']);
});

test('a canary pushed through the panel leaves every tracked file as it was', async () => {
  const before = execSync('git status --porcelain', { encoding: 'utf8' });
  const dir = mkdtempSync(join(tmpdir(), 'panel-'));
  try {
    writeFileSync(join(dir, 'panel.json'), JSON.stringify(await panel()));
    assert.equal(execSync('git status --porcelain', { encoding: 'utf8' }), before);
    assert.equal(spawnSync('git', ['grep', '-l', 'canary-frontend', '--', 'data', 'alarm', 'THESIS.md', 'README.md'], { encoding: 'utf8' }).stdout, '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the panel can only be written outside the repo', () => {
  for (const f of ['data/published/panel.json', 'panel.json', '.panel/x.json', '../tideline-thesis/data/x.json']) assert.throws(() => assertOutsideRepo(f), /outside this repo/, f);
  assert.doesNotThrow(() => assertOutsideRepo(join(tmpdir(), 'panel.json')));
});

test('in CI a printed panel is refused, because the log is public; the switch pulls nothing', () => {
  const env = { ...process.env, INTENTS_EXPLORER_JWT: 'x' };
  const ci = spawnSync(process.execPath, ['pipeline/panel.mjs'], { encoding: 'utf8', env: { ...env, CI: 'true', EXPLORER_PANEL: '' } });
  assert.equal(ci.status, 1);
  assert.match(ci.stderr, /public log/);
  const off = spawnSync(process.execPath, ['pipeline/panel.mjs'], { encoding: 'utf8', env: { ...env, EXPLORER_PANEL: 'off' } });
  assert.equal(off.status, 0);
  assert.match(off.stdout, /nothing pulled/);
});

// Every local file an entry reaches through its imports.
function reach(entry, seen = new Set()) {
  const file = resolve(entry);
  if (seen.has(file) || !existsSync(file)) return seen;
  seen.add(file);
  for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    const path = spec.startsWith('@/') ? resolve(spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(file), spec) : null;
    if (!path) continue;
    for (const c of [path, `${path}.ts`, `${path}.tsx`, `${path}.mjs`]) if (existsSync(c) && !c.endsWith('/')) { try { reach(c, seen); } catch { /* a folder */ } }
  }
  return seen;
}
const API_CODE = ['pipeline/explorer.mjs', 'pipeline/quotes_sampler.mjs', 'pipeline/panel.mjs', 'analysis/panel.mjs', 'analysis/fee_trace.mjs', 'lib/panel_source.ts', 'lib/panel_view.ts'].map((f) => resolve(f));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

test('nothing that writes a published file, sets a reading or sends a message can reach panel code', () => {
  const entries = [...readdirSync('pipeline').filter((f) => /^build_.*\.mjs$/.test(f)).map((f) => `pipeline/${f}`), 'pipeline/refresh.mjs', 'pipeline/verify.mjs', 'pipeline/telegram.mjs', 'pipeline/attest_send.mjs', 'pipeline/chain_day.mjs', 'analysis/readings.mjs', 'analysis/thesis_text.mjs', 'analysis/alarm.mjs', 'analysis/public_alarm.mjs', 'pipeline/weekly_note.mjs', 'lib/data.ts'];
  for (const e of entries) for (const f of reach(e)) assert.ok(!API_CODE.includes(f), `${e} reaches ${f}`);
});

test('no route serves the panel or passes an API response through (4.1(a))', () => {
  const routes = walk('app/api');
  assert.ok(routes.length > 0);
  assert.ok(!routes.some((f) => /quotes/.test(f)));
  for (const r of routes) for (const f of reach(r)) assert.ok(!API_CODE.includes(f), `${r} reaches ${f}`);
});

test('the job keeps the panel one day, commits nothing, prints no figure, and is the only one holding the JWT', () => {
  const y = readFileSync('.github/workflows/panel.yml', 'utf8');
  assert.match(y, /retention-days: 1\n/);
  assert.match(y, /if: vars\.EXPLORER_PANEL != 'off'/);
  assert.match(y, /--out "\$RUNNER_TEMP\/panel\/panel\.json"/);
  assert.match(y, /concurrency:\n {2}group: panel\n {2}cancel-in-progress: false/);
  assert.doesNotMatch(y, /git (add|commit|push)|\bcat\b|tee /);
  for (const f of readdirSync('.github/workflows')) if (f !== 'panel.yml') assert.doesNotMatch(readFileSync(`.github/workflows/${f}`, 'utf8'), /EXPLORER_JWT/, f);
});

test('the panel is never a tracked path', () => {
  assert.equal(spawnSync('git', ['ls-files', '.panel', 'data/published/panel.json', 'data/quotes', 'data/panel'], { encoding: 'utf8' }).stdout, '');
  assert.match(readFileSync('.gitignore', 'utf8'), /^\.panel\/$/m);
});

test('over 24 hours old, unreadable or the wrong file reads Not Available; the switch removes the slots', async () => {
  const doc = await panel();
  const later = (h) => new Date(now.getTime() + h * 3_600_000);
  assert.equal(panelView(doc, { now: later(24) }).state, 'live');
  assert.equal(panelView(doc, { now: later(24.01) }).state, 'unavailable');
  assert.equal(panelView(null, { now }).state, 'unavailable');
  assert.equal(panelView({ ...doc, kind: 'x' }, { now }).state, 'unavailable');
  assert.equal(isFresh(doc, new Date(now.getTime() - 1000)), false); // from the future is not fresh
  assert.equal(panelView(doc, { off: true, now }).state, 'off');
  assert.equal(panelView(null, { off: true, now }).state, 'off');
});

test('the live panel says what it is and names no wallet', async () => {
  const v = panelView(await panel(), { now });
  assert.equal(v.state, 'live');
  assert.equal(v.age, '0 hours old');
  assert.match(v.frontendText, /canary-frontend 100%/);
  assert.match(v.quoteText, /\$1,000 costs 100\.0 bps all-in/);
  // T-T6j.16 (J8): the pairs are named, and the app fee is said to be the one on our own test request.
  assert.match(v.quoteText, /median across BTC, ETH, SOL and NEAR into USDC/);
  assert.match(v.quoteText, /the one 1Click attached to our own test request, not what real swaps paid/);
});

function zipOf(name, body, method) {
  const data = method === 8 ? deflateRawSync(body) : body;
  const n = Buffer.from(name);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(method, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(method, 10); central.writeUInt32LE(data.length, 20); central.writeUInt16LE(n.length, 28);
  const start = local.length + n.length + data.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length + n.length, 12); end.writeUInt32LE(start, 16);
  return Buffer.concat([local, n, data, central, n, end]);
}

test('the artifact zip opens whether stored or deflated, and a missing entry gives nothing', () => {
  const body = Buffer.from('{"a":1}');
  assert.equal(unzipOne(zipOf('panel.json', body, 0), 'panel.json').toString(), '{"a":1}');
  assert.equal(unzipOne(zipOf('panel.json', body, 8), 'panel.json').toString(), '{"a":1}');
  assert.equal(unzipOne(zipOf('other.json', body, 0), 'panel.json'), null);
  assert.equal(unzipOne(Buffer.alloc(40), 'panel.json'), null);
});

test('the BFF takes the newest unexpired artifact, and no artifact means no panel', async () => {
  const zip = zipOf('panel.json', Buffer.from('{"kind":"tideline-panel"}'), 8);
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (String(url).includes('/actions/artifacts')) return Response.json({ artifacts: [
      { expired: false, created_at: '2026-11-07T01:00:00Z', archive_download_url: 'https://x/old' },
      { expired: true, created_at: '2026-11-09T01:00:00Z', archive_download_url: 'https://x/gone' },
      { expired: false, created_at: '2026-11-08T01:00:00Z', archive_download_url: 'https://x/new' },
    ] });
    return new Response(zip);
  };
  assert.deepEqual(await readArtifactPanel({ token: 't', fetchFn }), { kind: 'tideline-panel' });
  assert.equal(calls[1], 'https://x/new');
  assert.equal(await readArtifactPanel({ token: 't', fetchFn: async () => Response.json({ artifacts: [] }) }), null);
  assert.equal(await readArtifactPanel({ token: 't', fetchFn: async () => new Response('', { status: 500 }) }), null);
});

test('T-T6j.35 a slow or failed GitHub call is tried once more, and the log names no body (J26)', async () => {
  const zip = zipOf('panel.json', Buffer.from('{"kind":"tideline-panel"}'), 8);
  let downloads = 0;
  const logged = [];
  const warn = console.warn;
  console.warn = (m) => logged.push(String(m));
  try {
    const fetchFn = async (url) => {
      if (String(url).includes('/actions/artifacts')) return Response.json({ artifacts: [{ expired: false, created_at: '2026-11-08T01:00:00Z', archive_download_url: 'https://x/new' }] });
      downloads += 1;
      if (downloads === 1) throw Object.assign(new Error('canary-body-text'), { name: 'TimeoutError' });
      return new Response(zip);
    };
    assert.deepEqual(await readArtifactPanel({ token: 't', fetchFn }), { kind: 'tideline-panel' });
    assert.equal(downloads, 2);
    assert.deepEqual(logged, ['Rolling panel: GitHub artifact download failed: TimeoutError (try 1)']);
    assert.ok(!logged.join(' ').includes('canary'));
    // A refused token is not retried; a server error is, up to three tries (P7a code review).
    let calls = 0;
    assert.equal(await readArtifactPanel({ token: 't', fetchFn: async () => { calls += 1; return new Response('canary', { status: 401 }); } }), null);
    assert.equal(calls, 1);
    calls = 0;
    assert.equal(await readArtifactPanel({ token: 't', fetchFn: async () => { calls += 1; return new Response('canary', { status: 502 }); } }), null);
    assert.equal(calls, 3);
    assert.ok(!logged.join(' ').includes('canary'));
  } finally {
    console.warn = warn;
  }
});

test('with the switch off the Reproduce page has no panel command and no mention of it', () => {
  assert.ok(commandsFor(false).some((c) => c.cmd === 'npm run panel'));
  assert.ok(!commandsFor(true).some((c) => /panel/i.test(c.cmd + c.example)));
  assert.match(reproduceLead(false), /panel/);
  assert.doesNotMatch(reproduceLead(true), /panel/);
});

// T6e (docs/PLAN.md §6c, A1 to A5): the per-day totals.
const threeDays = (now3) => buildPanel({ now: now3, quotes: async () => [], log: () => {}, pull: async (day, onRows) => {
  if (day === '2026-10-26') onRows([row({ amountInUsd: '100' }), row({ amountInUsd: '50' })]);
  if (day === '2026-10-27') { onRows([row({ amountInUsd: '10' }), row({ destinationAsset: 'nep141:a', amountInUsd: '999' })]); onRows([row({ amountInUsd: null })]); }
  if (day === '2026-10-28') onRows([row({ amountInUsd: '5' })]);
} });

test('T-T6e.4 one per-day total for each day read, sorted, summing to the window total; same-token and unpriced left out', async () => {
  const doc = await threeDays(new Date('2026-11-08T03:00:00Z'));
  const seen = doc.byDay.filter((d) => d.swaps > 0);
  assert.deepEqual(seen, [{ day: '2026-10-26', swaps: 2, usd: 150 }, { day: '2026-10-27', swaps: 1, usd: 10 }, { day: '2026-10-28', swaps: 1, usd: 5 }]);
  assert.deepEqual(doc.byDay.map((d) => d.day), [...doc.byDay.map((d) => d.day)].sort());
  assert.equal(doc.byDay.reduce((t, d) => t + d.usd, 0), doc.swaps.usd);
});

test('T-T6e.4 a failed page stops the run, so a half-read day never reaches a panel, as zero or otherwise', async () => {
  let wrote = false;
  const run = buildPanel({ now, quotes: async () => [], log: () => {}, pull: async (day, onRows) => {
    onRows([row()]);
    if (day === '2026-10-20') throw new Error('explorer: too many failures');
  } }).then(() => { wrote = true; });
  await assert.rejects(run, /too many failures/);
  assert.equal(wrote, false);
});

test('T-T6e.5 a per-day total holds only day, swaps and usd', async () => {
  const doc = await panel();
  assert.equal(doc.byDay.length, 30);
  for (const d of doc.byDay) assert.deepEqual(Object.keys(d).sort(), ['day', 'swaps', 'usd']);
  const text = JSON.stringify(doc.byDay);
  for (const leak of ['canary', 'referral', 'frontend', 'recipient', 'depositAddress', 'sender']) assert.ok(!text.includes(leak), leak);
});

test('T-T6e.6 the series is live with the panel, absent without byDay, gone when stale or off', async () => {
  const doc = await threeDays(now);
  const v = panelView(doc, { now });
  assert.equal(v.days.length, 30);
  assert.deepEqual(v.days.find((d) => d.day === '2026-10-26'), { day: '2026-10-26', usd: 150 });
  const { byDay, ...old } = doc;
  const o = panelView(old, { now });
  assert.equal(o.state, 'live');
  assert.equal(o.days, null);
  assert.match(o.swapsText, /swaps worth/);
  const gap = panelView({ ...doc, byDay: doc.byDay.filter((d) => d.day !== '2026-10-27') }, { now });
  assert.deepEqual(gap.days.find((d) => d.day === '2026-10-27'), { day: '2026-10-27', usd: null });
  assert.equal(panelView(doc, { now: new Date(now.getTime() + 25 * 3_600_000) }).state, 'unavailable');
  assert.equal(panelView(doc, { off: true, now }).state, 'off');
});

test('T-T6e.7 the shared chart code imports nothing from the panel', () => {
  for (const f of ['components/BarCharts.tsx', 'lib/bar_charts.ts']) for (const g of reach(f)) assert.ok(!API_CODE.includes(g), `${f} reaches ${g}`);
});
