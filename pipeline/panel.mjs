// npm run panel: re-pulls the last 30 finished UTC days from the Explorer API, takes the current 1Click dry quotes, and works out the rolling panel.
// Rows stay in memory and are folded into totals page by page; they are never written. Needs your own INTENTS_EXPLORER_JWT (.env or the environment).
// Usage: npm run panel                  prints the panel; writes nothing
//        npm run panel -- --out <file>  writes it to <file>, which must be outside this repo, and prints no figure (the Actions job does this, because logs are public)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { foldRows, newTotals, panelDoc } from '../analysis/panel.mjs';
import { quoteBreakdown } from '../analysis/fee_trace.mjs';
import { eachPage } from './explorer.mjs';
import { sampleQuotes } from './quotes_sampler.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const WINDOW_DAYS = 30;
// A swap-specific filter excludes masking transactions (docs/EXPLORER.md). The value must be above zero to prove anything.
export const SWAPS_ONLY = { minUsdPrice: '0.000001' };

export function lastFinishedDays(now, n = WINDOW_DAYS) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: n }, (_, i) => new Date(today - (n - i) * 86_400_000).toISOString().slice(0, 10));
}

// Terms 4.1(e): the panel never lands inside the repo.
export function assertOutsideRepo(file, root = ROOT) {
  const rel = relative(root, resolve(file));
  if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('the panel must be written outside this repo');
}

export async function buildPanel({ now = new Date(), pull = eachPage, quotes = sampleQuotes, log = console.error } = {}) {
  const days = lastFinishedDays(now);
  const totals = newTotals();
  for (const [i, day] of days.entries()) {
    await pull(day, (rows) => foldRows(totals, rows, day), { filter: SWAPS_ONLY });
    log(`day ${i + 1} of ${days.length} read`);
  }
  return panelDoc(totals, quoteBreakdown(await quotes()), { startedAt: now.toISOString(), from: days[0], to: days.at(-1), days: days.length });
}

async function main() {
  const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
  if (process.env.EXPLORER_PANEL === 'off') { console.log('EXPLORER_PANEL is off: nothing pulled'); return; }
  if (args.out) assertOutsideRepo(args.out);
  else if (process.env.CI) throw new Error('in CI the panel goes to --out: a printed figure would stay in the public log');
  const doc = await buildPanel();
  if (args.out) {
    mkdirSync(dirname(resolve(args.out)), { recursive: true });
    writeFileSync(args.out, JSON.stringify(doc));
    console.log('panel written');
  } else console.log(JSON.stringify(doc, null, 1));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((e) => { console.error(`panel failed: ${e.message}`); process.exitCode = 1; });
}
