// T6f (docs/PLAN.md §6d): the weekly activity job and the hourly protocol fee read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIVITY, activityWindow, checkNewest, moveWindow, refreshActivity } from './activity_refresh.mjs';
import { protocolText } from '../lib/fee_view.ts';

const doc = (rows, columns = ['day', 'transactions', 'activeAccounts']) => ({ query: 'q.sql', columns, rows });
const days = (to, n, v = 100) => Array.from({ length: n }, (_, i) => [new Date(Date.parse(`${to}T00:00:00Z`) - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10), v, 5]);

test('T-T6f.1 the window is the last 90 finished UTC days, and too soon after midnight it refuses', () => {
  assert.deepEqual(activityWindow(new Date('2026-11-14T04:41:00Z')), { from: '2026-08-16', to: '2026-11-13' });
  assert.throws(() => activityWindow(new Date('2026-11-14T01:59:00Z')), /after 2:00 UTC/);
});

test('T-T6f.2 the stored SQL files each hold one date range, and moving it changes nothing else', () => {
  for (const a of ACTIVITY) {
    const sql = readFileSync(a.sql, 'utf8');
    const moved = moveWindow(sql, { from: '2026-08-16', to: '2026-11-13' });
    assert.match(moved, /block_date BETWEEN '2026-08-16' AND '2026-11-13'/);
    assert.equal(moved.replace(/'\d{4}-\d{2}-\d{2}'/g, 'D'), sql.replace(/'\d{4}-\d{2}-\d{2}'/g, 'D'));
  }
  assert.throws(() => moveWindow('SELECT 1', { from: 'a', to: 'b' }), /exactly one/);
});

test('T-T6f.3 a missing or half-loaded newest day is never stored', () => {
  assert.doesNotThrow(() => checkNewest(doc(days('2026-11-13', 30)), 'transactions', '2026-11-13'));
  assert.throws(() => checkNewest(doc(days('2026-11-12', 30)), 'transactions', '2026-11-13'), /newest day is 2026-11-12, expected 2026-11-13/);
  const low = days('2026-11-13', 30); low.at(-1)[1] = 20;
  assert.throws(() => checkNewest(doc(low), 'transactions', '2026-11-13'), /half loaded/);
  const dip = days('2026-11-13', 30); dip.at(-1)[1] = 30; // a real dip to 30% still stores
  assert.doesNotThrow(() => checkNewest(doc(dip), 'transactions', '2026-11-13'));
});

test('T-T6f.4 the job rewrites both queries, runs only those two, then checks both results', async () => {
  const files = new Map(ACTIVITY.map((a) => [a.sql, readFileSync(a.sql, 'utf8')]));
  const ran = [];
  const run = async ({ only }) => {
    ran.push(...only);
    files.set(ACTIVITY[0].out, JSON.stringify(doc(days('2026-11-13', 90))));
    files.set(ACTIVITY[1].out, JSON.stringify(doc(days('2026-11-13', 90), ['day', 'receipts', 'tgasBurnt', 'nearBurnt'])));
  };
  const win = await refreshActivity({ now: new Date('2026-11-14T04:41:00Z'), run, read: (f) => files.get(f), write: (f, s) => files.set(f, s) });
  assert.deepEqual(win, { from: '2026-08-16', to: '2026-11-13' });
  assert.deepEqual(ran, ACTIVITY.map((a) => a.sql));
  for (const a of ACTIVITY) assert.match(files.get(a.sql), /BETWEEN '2026-08-16' AND '2026-11-13'/);
  await assert.rejects(refreshActivity({ now: new Date('2026-11-15T04:41:00Z'), run, read: (f) => files.get(f), write: (f, s) => files.set(f, s) }), /expected 2026-11-14/);
});

test('T-T6f.5 the workflow: one run at a time, no credentials file, verify before commit, only activity paths staged', () => {
  const y = readFileSync('.github/workflows/activity.yml', 'utf8');
  assert.match(y, /on:\n {2}workflow_dispatch:\n/);
  assert.match(y, /concurrency:\n {2}group: activity\n {2}cancel-in-progress: false/);
  assert.match(y, /create_credentials_file: false/);
  assert.match(y, /credentials_json: \$\{\{ secrets\.GOOGLE_SA_KEY \}\}/);
  assert.ok(y.indexOf('npm run verify') < y.indexOf('git commit'));
  const add = y.match(/git add (.+)/)[1].split(' ');
  assert.deepEqual(add.sort(), [...ACTIVITY.flatMap((a) => [a.sql, a.out]), 'data/published/activity.json'].sort());
  assert.doesNotMatch(y, /EXPLORER_JWT|NEAR_ATTEST|echo .*TOKEN|cat /);
});

test('T-T6f.6 the refresh job re-reads the protocol fee every hour and keeps the copy while it is unchanged', () => {
  const r = readFileSync('pipeline/refresh.mjs', 'utf8');
  assert.match(r, /'pipeline\/protocol_fee\.mjs'\]\) \{/);
  assert.match(r, /settle\(PROTOCOL\)/);
  assert.match(r, /const VOLATILE = \[[^\]]*'readAt'/);
});

test('T-T6f.7 the protocol fee sentence comes from the read, never typed in', () => {
  assert.equal(protocolText({ bps: 0.01, pips: 1, sameSince: '2026-01-24', collector: 'x' }), 'fee() is 1 pip, which is 0.01 bps, and it has read the same at every check since at least 24 Jan 2026.');
  assert.equal(protocolText({ bps: 0.05, pips: 5, sameSince: '2026-11-08', collector: 'x' }), 'fee() is 5 pips, which is 0.05 bps, and it has read the same at every check since at least 8 Nov 2026.');
  assert.match(protocolText(undefined), /could not be read/);
  const t = JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8')).protocolFee;
  const p = JSON.parse(readFileSync('data/snapshot/protocol_fee.json', 'utf8'));
  assert.equal(t.pips, p.feePips);
  assert.ok(t.sameSince <= p.readAt.at.slice(0, 10));
  assert.doesNotMatch(readFileSync('lib/fee_view.ts', 'utf8'), /not moved since January/);
});
