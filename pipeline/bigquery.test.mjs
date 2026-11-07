import { test } from 'node:test';
import assert from 'node:assert/strict';
import { client, forProject, JOBS, rerun } from './bigquery.mjs';

const env = { GOOGLE_PROJECT: 'my-proj', GOOGLE_ACCESS_TOKEN: 't' };
const dry = (gb) => async () => Response.json({ totalBytesProcessed: String(gb * 1e9) });

test('it needs your own project and token', async () => {
  await assert.rejects(rerun({ env: {} }), /GOOGLE_PROJECT/);
});

test('a query over the limit is refused before anything runs', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push(JSON.parse(init.body)); return dry(500)(); };
  await assert.rejects(rerun({ env, fetchFn, log: () => {} }), /over the 30 GB limit\. Nothing was run/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].dryRun, true);
});

test('the 818 GB log read is skipped unless asked for by name', async () => {
  assert.equal(JOBS.filter((j) => j.read).length, 1);
  const seen = [];
  const log = (l) => seen.push(l);
  await assert.rejects(rerun({ env, fetchFn: async (u, i) => (JSON.parse(i.body).dryRun ? dry(1)() : Response.json({ error: { message: 'stop' } }, { status: 500 })), log }), /stop/);
  await rerun({ env, log, fetchFn: dry(1) }).catch(() => {});
  assert.ok(!seen.some((l) => /elasticity_read.*estimated/.test(l)));
});

test('your project replaces ours in the SQL, and the public dataset stays', () => {
  const s = forProject('FROM `tideline-check.intents.swaps` JOIN `bigquery-public-data.crypto_near_mainnet_us.transactions`', 'my-proj');
  assert.match(s, /`my-proj\.intents\.swaps`/);
  assert.match(s, /bigquery-public-data\.crypto_near_mainnet_us/);
});

test('results are read across pages, as numbers where they are numbers', async () => {
  const pages = [
    { jobComplete: false, jobReference: { jobId: 'j' } },
    { jobComplete: true, jobReference: { jobId: 'j' }, pageToken: 'p', totalBytesProcessed: '2000000000', rows: [{ f: [{ v: '2026-11-01' }, { v: '5' }] }] },
    { jobComplete: true, jobReference: { jobId: 'j' }, totalBytesProcessed: '2000000000', rows: [{ f: [{ v: '2026-11-02' }, { v: null }] }] },
  ];
  const bq = client({ project: 'p', token: 't', fetchFn: async () => Response.json(pages.shift()) });
  const r = await bq.run('SELECT 1');
  assert.deepEqual(r.rows, [['2026-11-01', 5], ['2026-11-02', null]]);
  assert.equal(r.bytes, 2);
});
