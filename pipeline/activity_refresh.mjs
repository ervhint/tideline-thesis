// The weekly activity job (T6f): moves the date window in the two activity queries to the last 90 finished UTC days, re-runs
// them on BigQuery, checks the newest day is there and whole, and recomputes data/published/activity.json.
// The SQL files are updated with the new dates and committed with their results, so queries/ always holds the exact query
// behind each stored file. About 20 GB a run, under 30 GB per query (pipeline/bigquery.mjs refuses more).
// Needs GOOGLE_PROJECT and GOOGLE_ACCESS_TOKEN; .github/workflows/activity.yml gets the token from the repo's service account.
// Usage: node pipeline/activity_refresh.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rerun } from './bigquery.mjs';

export const WINDOW_DAYS = 90;
export const ACTIVITY = [
  { sql: 'queries/daily_transactions.sql', out: 'data/bigquery/daily_transactions.json', measure: 'transactions' },
  { sql: 'queries/daily_contract_usage.sql', out: 'data/bigquery/daily_contract_usage.json', measure: 'receipts' },
];
// BigQuery's NEAR tables fill in near real time; two hours after midnight UTC, yesterday is whole.
export const EARLIEST_HOUR_UTC = 2;
// A newest day under a quarter of the week before it is taken as half loaded, never stored.
export const LOW_DAY = 0.25;

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

export function activityWindow(now) {
  if (now.getUTCHours() < EARLIEST_HOUR_UTC) throw new Error(`run after ${EARLIEST_HOUR_UTC}:00 UTC, so yesterday is whole in BigQuery`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: iso(today - WINDOW_DAYS * DAY), to: iso(today - DAY) };
}

const RANGE = /block_date BETWEEN '\d{4}-\d{2}-\d{2}' AND '\d{4}-\d{2}-\d{2}'/g;
export function moveWindow(sql, { from, to }) {
  if ((sql.match(RANGE) ?? []).length !== 1) throw new Error('expected exactly one block_date BETWEEN range in the query');
  return sql.replace(RANGE, `block_date BETWEEN '${from}' AND '${to}'`);
}

// The newest day must be the window's last day, and not far below the seven days before it.
export function checkNewest(doc, measure, to) {
  const col = doc.columns.indexOf(measure);
  const rows = [...doc.rows].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const last = rows.at(-1);
  if (!last || last[0] !== to) throw new Error(`${doc.query}: newest day is ${last?.[0] ?? 'missing'}, expected ${to}. Nothing is stored.`);
  const week = rows.slice(-8, -1).map((r) => r[col]).sort((a, b) => a - b);
  const median = week[Math.floor(week.length / 2)];
  if (week.length === 7 && last[col] < LOW_DAY * median) throw new Error(`${doc.query}: ${to} has ${last[col]} ${measure}, under a quarter of the week before (median ${median}). It looks half loaded. Nothing is stored.`);
}

export async function refreshActivity({ now = new Date(), run = rerun, read = (f) => readFileSync(f, 'utf8'), write = writeFileSync } = {}) {
  const win = activityWindow(now);
  for (const a of ACTIVITY) write(a.sql, moveWindow(read(a.sql), win));
  await run({ only: ACTIVITY.map((a) => a.sql) });
  for (const a of ACTIVITY) checkNewest(JSON.parse(read(a.out)), a.measure, win.to);
  return win;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const win = await refreshActivity();
    const r = spawnSync(process.execPath, ['pipeline/build_activity.mjs'], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build_activity failed');
    console.log(`activity window ${win.from} to ${win.to}`);
  } catch (e) {
    console.error(`activity refresh failed: ${e.message}`);
    process.exitCode = 1;
  }
}
