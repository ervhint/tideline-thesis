// Writes THESIS.md (T6h, docs/PLAN.md §6f) from data/published/{thesis,elasticity,visibility,model_inputs}.json. No network.
// Usage: node pipeline/build_thesis_md.mjs   (OUT overrides the output path, PUBLISHED_DIR the published copy it reads)
import { readFileSync, writeFileSync } from 'node:fs';
import { thesisMd } from '../analysis/thesis_md.mjs';

const OUT = process.env.OUT ?? 'THESIS.md';
const PUB = process.env.PUBLISHED_DIR ?? 'data/published';
const json = (f) => JSON.parse(readFileSync(`${PUB}/${f}.json`, 'utf8'));

writeFileSync(OUT, thesisMd({ thesis: json('thesis'), elasticity: json('elasticity'), visibility: json('visibility'), inputs: json('model_inputs') }));
console.log(`wrote ${OUT}`);
