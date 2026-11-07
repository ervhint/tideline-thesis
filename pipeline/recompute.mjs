// npm run rebuild: recomputes every published file from the stored public data. No key, no network.
// npm run rebuild -- --bigquery: first re-runs the SQL in queries/ with your own Google project (pipeline/bigquery.mjs), then the same.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// The order matters: thesis reads what comes before it.
export const STEPS = ['chain_days', 'visibility', 'activity', 'fee_trace', 'elasticity', 'confidential', 'thesis', 'reconciliation', 'token_board'];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: args } = parseArgs({ options: { bigquery: { type: 'boolean' }, read: { type: 'boolean' }, 'max-gb': { type: 'string' } } });
  if (args.bigquery) {
    const { rerun } = await import('./bigquery.mjs');
    await rerun({ read: args.read, maxGb: args['max-gb'] ? Number(args['max-gb']) : undefined }).catch((e) => { console.error(e.message); process.exit(1); });
  }
  for (const s of STEPS) {
    const r = spawnSync(process.execPath, [`pipeline/build_${s}.mjs`], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
