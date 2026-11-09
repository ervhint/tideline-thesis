// The Monday note for the public channel (T6k, docs/PLAN.md §6i K4). Reads only stored public files: thesis.json and alarm/public.json.
// Usage: node pipeline/weekly_note.mjs --out <message file>   (pipeline/telegram.mjs --channel sends it)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { weeklyNote } from '../analysis/public_alarm.mjs';

const { values: a } = parseArgs({ options: { out: { type: 'string' } } });
const json = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const note = weeklyNote(json('data/published/thesis.json'), json('alarm/public.json'), new Date().toISOString(), process.env.TIDELINE_URL || 'https://github.com/ervhint/tideline-thesis');
if (!note) { console.error('weekly note: no thesis.json'); process.exit(1); }
console.log(note);
if (a.out) writeFileSync(a.out, note + '\n');
