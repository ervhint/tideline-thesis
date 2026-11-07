// Writes data/published/activity.json from the two stored BigQuery results. No network, no key.
// Usage: node pipeline/build_activity.mjs   (OUT overrides the output path)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { weeklyActivity } from '../analysis/activity.mjs';

const OUT = process.env.OUT ?? 'data/published/activity.json';
const read = (f) => JSON.parse(readFileSync(`data/bigquery/${f}.json`, 'utf8'));
const doc = {
  source: 'BigQuery public dataset crypto_near_mainnet_us, stored in data/bigquery',
  query: 'queries/daily_transactions.sql, queries/daily_contract_usage.sql, analysis/activity.mjs',
  ...weeklyActivity(read('daily_transactions'), read('daily_contract_usage')),
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
console.log(`Activity: ${doc.weeks.length} weeks, ${doc.from} to ${doc.to} -> ${OUT}`);
