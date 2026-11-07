// Writes data/published/visibility.json (PREREG.md amendment A3): the 7-day DefiLlama ÷ chain-counted USD ratio and the revenue split. No network, no clock.
// Usage: node pipeline/build_visibility.mjs   (OUT overrides the output path)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { visibility } from '../analysis/visibility.mjs';

const OUT = process.env.OUT ?? 'data/published/visibility.json';
const PUB = process.env.PUBLISHED_DIR ?? 'data/published';
const llama = JSON.parse(readFileSync('data/snapshot/defillama_daily.json', 'utf8'));
const chain = new Map(JSON.parse(readFileSync(`${PUB}/chain_days.json`, 'utf8')).days.map((d) => [d.day, d.usd]));
const v = visibility(llama.days, chain);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(v, null, 1) + '\n');
console.log(`Visibility: ratio ${v.ratio?.toFixed(2)} on ${v.lastDay}, no line (${v.history.chainDaysBefore} of ${v.history.wantedDays} days before 27 Oct) -> ${OUT}`);
