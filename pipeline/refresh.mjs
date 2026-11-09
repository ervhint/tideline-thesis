// The refresh job (U8, FR-16): pulls DefiLlama and model inputs, recomputes every published file, and records side changes.
// Freezing a chain day is chain-day.yml's job (T2). Token names for the coverage board come from ft_metadata here (T6).
// A file whose numbers did not change (only its timestamp did) is put back byte for byte, so git sees no change and no commit is made.
// Usage: node pipeline/refresh.mjs [--dry-run] [--message-file <path>] [--public-file <path>]
//   --dry-run        runs everything, prints what would change, then restores all files (nothing is written)
//   --message-file   where to write the private alarm text; pipeline/telegram.mjs sends it after the commit has been pushed
//   --public-file    where to write the public channel text: changes that held 72 hours, in Easy words (T6k, docs/PLAN.md §6i)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { sideChanges, alarmMessage } from '../analysis/alarm.mjs';
import { advance, publicMessage } from '../analysis/public_alarm.mjs';
import { STEPS, THESIS_MD } from './recompute.mjs';

const { values: args } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, 'message-file': { type: 'string' }, 'public-file': { type: 'string' } } });
const dry = args['dry-run'];
const HISTORY = 'alarm/history.json';
const PUBLIC = 'alarm/public.json';
const LINK = process.env.TIDELINE_URL || 'https://github.com/ervhint/tideline-thesis';
const LLAMA = 'data/snapshot/defillama_daily.json';
const COW = 'data/snapshot/cow_daily.json';
const PROTOCOL = 'data/snapshot/protocol_fee.json';
const P = 'data/published';
const VENUES = 'data/snapshot/control_venues.json';
const TOKENS = 'data/labels/tokens.json';
const DERIVED = STEPS;
const THESIS = 'THESIS.md';
const FILES = [LLAMA, COW, VENUES, TOKENS, PROTOCOL, `${P}/model_inputs.json`, ...DERIVED.map((f) => `${P}/${f}.json`), THESIS, HISTORY, PUBLIC];

const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : null);
const backup = new Map(FILES.map((f) => [f, read(f)]));
const restore = (f) => { const old = backup.get(f); if (old !== null) writeFileSync(f, old); };

// Same numbers? Timestamps that change on every run are ignored. readAt is the protocol fee's read: the copy is kept
// until fee() or its collector changes, so its readAt is the first read of the current value.
const VOLATILE = ['asOf', 'pulledAt', 'readAt'];
const core = (text) => { const o = JSON.parse(text); for (const k of VOLATILE) delete o[k]; return JSON.stringify(o); };
// THESIS.md has no timestamp: it changes only when a figure or a judgement in it does.
const changed = (f) => backup.get(f) === null || (f === THESIS ? backup.get(f) !== readFileSync(f, 'utf8') : core(backup.get(f)) !== core(readFileSync(f, 'utf8')));

function node(script, ...a) {
  const r = spawnSync(process.execPath, [script, ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${script} failed:\n${(r.stderr || r.stdout).split('\n').slice(0, 8).join('\n')}`);
  return r.stdout;
}

const kept = [];
function settle(f) {
  if (changed(f)) kept.push(f);
  else restore(f);
}

try {
  // Inputs first: the derived files read the settled copies, so verify can recompute them.
  // A flaky outside source must not stop the run: keep the previous copy, say so, and try again next hour.
  for (const s of ['pipeline/pull_defillama.mjs', 'pipeline/model_inputs.mjs', 'pipeline/token_names.mjs', 'pipeline/protocol_fee.mjs']) {
    try { node(s); } catch (e) { console.log(`WARNING: ${s} failed, the previous copy is kept.\n${String(e.message).split('\n').filter((l) => /^Error: http|: \d{3}$|ECONN|TIMEOUT|terminated/.test(l)).join('\n')}`); }
  }
  settle(LLAMA);
  settle(COW);
  settle(VENUES);
  settle(PROTOCOL);
  settle(`${P}/model_inputs.json`);
  if (existsSync(TOKENS)) settle(TOKENS);

  // Every derived file, in the order `npm run rebuild` uses: fee_trace reads model_inputs, elasticity reads the control venues.
  for (const f of DERIVED) node(`pipeline/build_${f}.mjs`);
  for (const f of DERIVED) settle(`${P}/${f}.json`);
  node(THESIS_MD);
  settle(THESIS);

  const before = backup.get(`${P}/thesis.json`) && JSON.parse(backup.get(`${P}/thesis.json`));
  const after = JSON.parse(readFileSync(`${P}/thesis.json`, 'utf8'));
  const changes = sideChanges(before, after, new Date().toISOString());

  // The public channel: a change is told only once it has held 72 hours; one that flips back first is told to the human only.
  const pub = advance(backup.get(PUBLIC) && JSON.parse(backup.get(PUBLIC)), after, new Date().toISOString());
  const pubText = JSON.stringify(pub.state, null, 1) + '\n';
  if (pubText !== backup.get(PUBLIC)) { mkdirSync(dirname(PUBLIC), { recursive: true }); writeFileSync(PUBLIC, pubText); kept.push(PUBLIC); }
  if (pub.publish.length) {
    const text = publicMessage(pub.publish, after, LINK);
    console.log(`\nPUBLIC: ${pub.publish.length} change${pub.publish.length === 1 ? '' : 's'} held 72 hours\n${text}`);
    if (args['public-file'] && !dry) writeFileSync(args['public-file'], text + '\n');
  }
  const dropped = pub.dropped.map((d) => `Tideline: not told to the channel,${d.id} ${d.from} -> ${d.to} did not hold 72 hours.`);

  if (changes.length) {
    const history = JSON.parse(backup.get(HISTORY) ?? '[]');
    mkdirSync(dirname(HISTORY), { recursive: true });
    writeFileSync(HISTORY, JSON.stringify([...history, ...changes], null, 1) + '\n');
    kept.push(HISTORY);
  }
  if (changes.length || dropped.length) {
    const message = [...(changes.length ? [alarmMessage(changes)] : []), ...dropped].join('\n\n');
    console.log(`\nALARM: ${changes.length} side change${changes.length === 1 ? '' : 's'}\n${message}`);
    if (args['message-file'] && !dry) writeFileSync(args['message-file'], message + '\n');
  } else console.log('\nNo side changed, no alarm.');

  console.log(kept.length ? `\nChanged: ${kept.join(', ')}` : '\nNothing changed, nothing to commit.');
} finally {
  if (dry) for (const f of FILES) { const old = backup.get(f); if (old === null) rmSync(f, { force: true }); else writeFileSync(f, old); }
}
if (dry) console.log('(dry run: every file was put back)');
