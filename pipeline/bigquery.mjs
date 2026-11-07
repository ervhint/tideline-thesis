// Re-runs the SQL in queries/ with your own Google project and overwrites data/bigquery/. npm run rebuild -- --bigquery
// Needs GOOGLE_PROJECT and GOOGLE_ACCESS_TOKEN (gcloud auth print-access-token), and a dataset named intents in us-east1.
// Every query is dry-run first, and any over the limit is refused: the free tier is 1 TB a month and the log read alone is about 818 GB.
// The small tracks and the daily table run by default. Add --read --max-gb 900 to run the log read as well.
import { readFileSync, writeFileSync } from 'node:fs';

const API = 'https://bigquery.googleapis.com/bigquery/v2';
const LOCATION = 'us-east1';
export const DEFAULT_MAX_GB = 30;
const gb = (bytes) => Number(bytes) / 1e9;

export const JOBS = [
  { sql: 'queries/daily_transactions.sql', out: 'data/bigquery/daily_transactions.json', columns: ['day', 'transactions', 'activeAccounts'] },
  { sql: 'queries/daily_contract_usage.sql', out: 'data/bigquery/daily_contract_usage.json', columns: ['day', 'receipts', 'tgasBurnt', 'nearBurnt'] },
  { sql: 'queries/elasticity_read.sql', read: true },
  { sql: 'queries/elasticity_days.sql', out: 'data/bigquery/elasticity_days.json', columns: ['day', 'ref', 'n', 'unpriced', 'vol', 'fee', 'np', 'inUsd', 'outUsd', 'grossUsd'] },
];

export const forProject = (sql, project) => sql.replaceAll('tideline-check.intents', `${project}.intents`);
const value = (v) => (v === null ? null : /^-?\d+(\.\d+)?(E-?\d+)?$/i.test(v) ? Number(v) : v);

export function client({ project, token, fetchFn = fetch }) {
  const call = async (path, body) => {
    const r = await fetchFn(`${API}/projects/${project}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(`BigQuery ${r.status}: ${j.error?.message ?? 'no message'}`);
    return j;
  };
  return {
    estimate: async (query) => gb((await call('/queries', { query, useLegacySql: false, dryRun: true, location: LOCATION })).totalBytesProcessed),
    async run(query) {
      let page = await call('/queries', { query, useLegacySql: false, location: LOCATION, timeoutMs: 60_000 });
      const id = page.jobReference.jobId, rows = [];
      for (;;) {
        if (page.jobComplete) rows.push(...(page.rows ?? []).map((r) => r.f.map((c) => value(c.v))));
        if (page.jobComplete && !page.pageToken) return { rows, bytes: gb(page.totalBytesProcessed ?? 0) };
        page = await call(`/queries/${id}?location=${LOCATION}&timeoutMs=60000${page.pageToken ? `&pageToken=${page.pageToken}` : ''}`);
      }
    },
  };
}

export async function rerun({ read = false, maxGb = DEFAULT_MAX_GB, env = process.env, fetchFn = fetch, log = console.log } = {}) {
  const project = env.GOOGLE_PROJECT, token = env.GOOGLE_ACCESS_TOKEN;
  if (!project || !token) throw new Error('Set GOOGLE_PROJECT and GOOGLE_ACCESS_TOKEN (gcloud auth print-access-token). See queries/README.md.');
  const bq = client({ project, token, fetchFn });
  for (const job of JOBS) {
    if (job.read && !read) { log(`skipped ${job.sql}: about 818 GB. Add --read --max-gb 900 to run it.`); continue; }
    const query = forProject(readFileSync(job.sql, 'utf8'), project);
    const estimate = await bq.estimate(query);
    log(`${job.sql}: ${estimate.toFixed(2)} GB estimated`);
    if (estimate > maxGb) throw new Error(`${job.sql} would scan ${estimate.toFixed(2)} GB, over the ${maxGb} GB limit. Nothing was run. Raise it with --max-gb.`);
    const { rows, bytes } = await bq.run(query);
    if (!job.out) continue;
    const doc = { query: job.sql, ranOn: new Date().toISOString().slice(0, 10), bytesProcessed: `${bytes.toFixed(2)} GB`, columns: job.columns, rows };
    writeFileSync(job.out, JSON.stringify(doc).replace(/\],\[/g, '],\n[') + '\n');
    log(`wrote ${job.out}: ${rows.length} rows`);
  }
}
