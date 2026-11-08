// T6g G6 (docs/PLAN.md §6e): no typed figure or typed frontend name in page code. Figures and names come from data.
// Scans app/**/*.tsx, components/*.tsx, lib/*.ts (not tests) and analysis/thesis_text.mjs, comments stripped, for
// $ amounts, percentages, bps, multiples and day-month or month-year dates. Each one found must be on ALLOW with its reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const ts = (d, ext) => readdirSync(d).filter((f) => f.endsWith(ext) && !f.includes('.test.')).map((f) => `${d}/${f}`);
const FILES = [...walk('app').filter((f) => f.endsWith('.tsx')).map((f) => f.replaceAll('\\', '/')), ...ts('components', '.tsx'), ...ts('lib', '.ts'), 'analysis/thesis_text.mjs', 'analysis/thesis_md.mjs'];

// Comments as this code base writes them: `//` at a line start or after a space (so `https://` stays), `/* */` at a line start or as JSX `{/* */}`.
// Lines are kept, so a finding's line number is the file's.
export const strip = (s) =>
  s.replace(/(^|\{)\s*\/\*[\s\S]*?\*\//gm, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' ')).replace(/(^|\s)\/\/.*$/gm, '$1');

const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const FIGURE = new RegExp(
  [
    String.raw`\$\d[\d,]*(?:\.\d+)?(?:\s?(?:k|M|B|bn|million|billion)\b)?`, // $ amounts
    String.raw`\d+(?:\.\d+)?\s?%`, // percentages
    String.raw`\d+(?:\.\d+)?\s?bps\b`, // bps
    String.raw`\d+(?:\.\d+)?\s?×|\b\d+(?:\.\d+)?x\b`, // multiples
    String.raw`\b\d{1,2}\s(?:${MON})[a-z]*\b(?:\s\d{4})?`, // day-month dates, with the year if given
    String.raw`\b(?:${MON})[a-z]*\s\d{4}\b`, // month-year dates
  ].join('|'),
  'g',
);
export const figuresIn = (text) => strip(text).split('\n').flatMap((l, i) => [...l.matchAll(FIGURE)].map((m) => ({ line: i + 1, figure: m[0] })));

// Frontend and solver names: every label name and referral in data/labels/frontends.json, and every solver account in the published solver tables.
const frontends = JSON.parse(readFileSync('data/labels/frontends.json', 'utf8')).labels;
const trace = JSON.parse(readFileSync('data/published/fee_trace.json', 'utf8'));
const solverAccounts = [...new Set(Object.values({ ...trace.solvers.bySize, all: trace.solvers.allSizes }).flatMap((s) => (s.top ?? []).map((t) => t.account)))];
const NAMES = [...new Set([...frontends.flatMap((l) => [l.name.split(' (')[0], ...(l.name.match(/\(([^),]+)\)/)?.[1].split(', ') ?? []), l.referral]), ...solverAccounts])]
  .filter((n) => n.length >= 4 && !/^(Zcash wallet|formerly .*)$/.test(n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NAME = new RegExp(`(?<![\\w.-])(?:${NAMES.map(esc).join('|')})(?![\\w-])`, 'gi');
export const namesIn = (text) => strip(text).split('\n').flatMap((l, i) => [...l.matchAll(NAME)].map((m) => ({ line: i + 1, name: m[0] })));

// The allow-list (8 Nov 2026 check). kind: line = pre-registered (PREREG.md), preset = a model or plan setting, scale = a fixed tick or bound,
// size = a size bucket name, rule = a fixed method rule, quote = another source's figure with its date, history = a dated event, css = layout, example = marked "Example only".
const ALLOW = [
  { file: 'lib/elasticity_view.ts', figures: ['2.8 ×', '80%'], kind: 'rule', why: 'how the minimum detectable effect is set: 2.8 × the placebo spread (analysis/elasticity.mjs), the usual 80% power at p = 0.05' },
  { file: 'app/concentration/page.tsx', figures: ['77%'], kind: 'quote', why: 'the share another source reported, shown as "Reported, not confirmed by our data"' },
  { file: 'app/concentration/page.tsx', figures: ['0%', '50%', '100%'], kind: 'scale', why: 'ticks of the share bar' },
  { file: 'app/follow-the-fee/page.tsx', figures: ['$10,000'], kind: 'size', why: 'the $10,000 swap the page prices' },
  { file: 'app/follow-the-fee/page.tsx', figures: ['0%', '25%', '50%', '75%', '100%'], kind: 'scale', why: 'ticks of the cost bar' },
  { file: 'app/method/page.tsx', figures: ['8 Nov 2026'], kind: 'history', why: 'the first day anchors carry the treasury file hash' },
  { file: 'app/method/page.tsx', figures: ['6 Nov 2026', '9 Nov 2026'], kind: 'quote', why: 'the NEAR Intents email: its date and the date it named' },
  { file: 'app/method/page.tsx', figures: ['7 Nov 2026', '27 Oct'], kind: 'history', why: 'A2 (6 Nov), A3 and A4 (7 Nov) dates and the 27 Oct start of confidential settlement' },
  { file: 'app/method/page.tsx', figures: ['99%'], kind: 'rule', why: 'a day freezes only when 99% of its list was read (pipeline/chain_day.mjs)' },
  { file: 'app/method/page.tsx', figures: ['0.03%'], kind: 'history', why: 'the largest price difference seen on a re-freeze (5 Nov), a dated note' },
  { file: 'app/what-would-move/page.tsx', figures: ['30%', '20%', '5 bps', '10 bps', '60%', '80%', '50%'], kind: 'line', why: 'the pre-registered lines (PREREG.md section 4, A2)' },
  { file: 'app/what-would-move/page.tsx', figures: ['$1k', '$10k'], kind: 'size', why: 'the $1k to $10k size bucket of the Q3 line' },
  { file: 'components/Entrance.tsx', figures: ['100%', '14%', '18%'], kind: 'css', why: 'clip-path of the entrance motion' },
  { file: 'components/Gauge.tsx', figures: ['100%', '50%'], kind: 'css', why: 'tick positions' },
  { file: 'components/Gauge.tsx', figures: ['$0'], kind: 'scale', why: 'the gauge start' },
  { file: 'components/Hero.tsx', figures: ['1.6%'], kind: 'preset', why: 'the 1.6% issuance plan (HSP-029)' },
  { file: 'components/Hero.tsx', figures: ['$0', '$10B', '$20B', '$30B'], kind: 'scale', why: 'gauge ticks' },
  { file: 'components/Hero.tsx', figures: ['60%', '50%'], kind: 'css', why: 'image object-position' },
  { file: 'components/Nav.tsx', figures: ['60%', '50%'], kind: 'css', why: 'image object-position' },
  { file: 'components/IntervalPlot.tsx', figures: ['95%'], kind: 'rule', why: 'the 95% interval the method uses' },
  { file: 'components/ModelView.tsx', figures: ['1.6%', '2.5%'], kind: 'preset', why: 'the issuance presets: the passed 1.6% plan and today\'s 2.5%' },
  { file: 'components/ModelView.tsx', figures: ['50%', '2×'], kind: 'preset', why: 'the growth path buttons +50% and 2×' },
  { file: 'components/ModelView.tsx', figures: ['0%', '1.33%', '2.67%', '4%', '$2', '$4', '$6', '$8', '33%', '67%', '100%'], kind: 'scale', why: 'slider ticks' },
  { file: 'components/ModelView.tsx', figures: ['95%'], kind: 'rule', why: 'the 95% interval of the elasticity estimate' },
  { file: 'components/ModelView.tsx', figures: ['27 Oct'], kind: 'history', why: 'the start of confidential settlement' },
  { file: 'components/PanelNote.tsx', figures: ['27 Oct 2026'], kind: 'history', why: 'the chart marker: confidential settlement begins' },
  { file: 'lib/bar_charts.ts', figures: ['27 Oct 2026'], kind: 'history', why: 'the chart marker: confidential settlement begins' },
  { file: 'lib/elasticity_view.ts', figures: ['5 bps'], kind: 'line', why: 'the pre-registered fee-change rule (PREREG.md)' },
  { file: 'lib/elasticity_view.ts', figures: ['95%'], kind: 'rule', why: 'the 95% interval the method uses' },
  { file: 'lib/fee_view.ts', figures: ['$0', '$1k', '$10k', '$100k', '$10,000'], kind: 'size', why: 'size bucket names and the $10,000 swap' },
  { file: 'lib/fee_view.ts', figures: ['$0.01'], kind: 'scale', why: 'the display floor, "< $0.01"' },
  { file: 'lib/mock.ts', figures: ['10 Nov 2026'], kind: 'example', why: 'preview anchor states, each marked "Example only"' },
  { file: 'lib/model.ts', figures: ['27 Oct'], kind: 'history', why: 'the start of confidential settlement' },
  { file: 'lib/reconcile_view.ts', figures: ['$15.8B', '30 Oct 2026', '$177M', 'Apr 2026', '$6.68M', '19 Oct 2026', '$31.4B', '$29.5B', '$1.9B', '22 Sep 2026', '21 Sep 2026'], kind: 'quote', why: "Other Source column: each source's figure and the date it gave" },
  { file: 'lib/reconcile_view.ts', figures: ['$4.97', '$1.35'], kind: 'quote', why: 'the NEAR prices the draft and TronWeekly worked from' },
  { file: 'lib/reconcile_view.ts', figures: ['1 Sep 2025', '23 Feb', '18 Oct 2026'], kind: 'history', why: 'the start of our DefiLlama series, and the buyback start to the source date' },
  { file: 'lib/reconcile_view.ts', figures: ['1.6%'], kind: 'preset', why: 'the 1.6% issuance plan' },
  { file: 'lib/reproduce_entries.ts', figures: ['3 Oct 2026'], kind: 'history', why: 'the end of the BigQuery fee-change history' },
  { file: 'lib/reproduce_entries.ts', figures: ['$1k', '$10k', '$10,000'], kind: 'size', why: 'size bucket names and the $10,000 swap' },
  { file: 'lib/reproduce_entries.ts', figures: ['50%'], kind: 'line', why: 'the A2 treasury line' },
  { file: 'lib/thesis_view.ts', figures: ['1.6%', '2.5%'], kind: 'preset', why: 'the issuance presets' },
  { file: 'lib/thesis_view.ts', figures: ['$0', '$1k', '$10k', '$100k'], kind: 'size', why: 'size bucket names' },
  { file: 'lib/thesis_view.ts', figures: ['60%', '80%'], kind: 'line', why: 'the pre-registered Solver Competition lines' },
  { file: 'lib/thesis_view.ts', figures: ['28 Oct'], kind: 'history', why: 'the move to the treasury, 28 to 30 Oct' },
  { file: 'lib/easy_text.ts', figures: ['30%', '20%', '5 bps', '10 bps', '60%', '80%', '50%'], kind: 'line', why: 'Easy wording of the pre-registered lines (PREREG.md section 4) and the fee-change rule' },
  { file: 'lib/easy_text.ts', figures: ['$1k', '$10k', '$10,000'], kind: 'size', why: 'the $1k to $10k size bucket of the Q3 line, and the $10,000 swap Follow the Fee prices' },
  { file: 'lib/easy_text.ts', figures: ['1.6%', '2.5%'], kind: 'preset', why: 'the issuance presets' },
  { file: 'analysis/thesis_text.mjs', figures: ['20%', '80%', '50%'], kind: 'line', why: 'the pre-registered Q2 and Q4 lines and the A2 treasury line' },
  { file: 'analysis/thesis_text.mjs', figures: ['1.6%', '2.5%'], kind: 'preset', why: 'the issuance presets' },
  { file: 'analysis/thesis_md.mjs', figures: ['30%', '20%', '5 bps', '10 bps', '60%', '80%', '50%'], kind: 'line', why: 'the pre-registered lines THESIS.md judges against (PREREG.md section 4, A2)' },
  { file: 'analysis/thesis_md.mjs', figures: ['1.6%', '2.5%'], kind: 'preset', why: 'the issuance presets' },
  { file: 'analysis/thesis_md.mjs', figures: ['95%'], kind: 'rule', why: 'the 95% interval the method uses' },
  { file: 'analysis/thesis_md.mjs', figures: ['27 Oct', '27 Oct 2026', '1 Oct 2025'], kind: 'history', why: 'the start of confidential settlement and the start of the BigQuery history' },
];
const allowed = (file, figure) => ALLOW.some((a) => a.file === file && a.figures.includes(figure));

test('T-T6g.6 every typed figure in page code is on the allow-list, and every entry has a reason and is still used', () => {
  const found = FILES.flatMap((file) => figuresIn(readFileSync(file, 'utf8')).map((f) => ({ file, ...f })));
  const typed = found.filter((f) => !allowed(f.file, f.figure)).map((f) => `${f.file}:${f.line} ${f.figure}`);
  assert.deepEqual(typed, [], 'typed figures: build them from data, or add them to ALLOW with a reason');
  for (const a of ALLOW) {
    assert.ok(a.why && a.kind, `${a.file}: every entry needs a kind and a reason`);
    for (const fig of a.figures) assert.ok(found.some((f) => f.file === a.file && f.figure === fig), `${a.file} ${fig}: allowed but no longer used, drop it`);
  }
});

test('T-T6g.6 no frontend or solver name is typed into page code', () => {
  assert.ok(NAMES.includes('SwapKit') && NAMES.includes('LI.FI') && solverAccounts.length > 0);
  const typed = FILES.flatMap((file) => namesIn(readFileSync(file, 'utf8')).map((n) => `${file}:${n.line} ${n.name}`));
  assert.deepEqual(typed, [], 'names must come from data/labels or the published files');
});

test('T-T6g.7 a planted typed figure and a planted frontend name are caught', () => {
  const page = "export const P = () => <p>The Treasury carries 74% of USD and SwapKit brings most fees.</p>;\n// 99% in a comment is fine\nconst s = `about $12.6B, 3.1× today, 5.0 bps, since 4 Nov 2026`;";
  const figs = figuresIn(page).map((f) => f.figure);
  assert.deepEqual(figs, ['74%', '$12.6B', '3.1×', '5.0 bps', '4 Nov 2026']);
  assert.ok(figs.some((f) => !allowed('app/page.tsx', f)), 'a planted figure fails the allow-list');
  assert.deepEqual(namesIn(page).map((n) => n.name), ['SwapKit']);
  assert.deepEqual(namesIn(`const a = 'blockzen-1-main.near';`).map((n) => n.name), solverAccounts.includes('blockzen-1-main.near') ? ['blockzen-1-main.near'] : []);
  assert.deepEqual(figuresIn("const u = 'https://example.com/a'; // 50% here is a comment\n{/* 77% */}"), []);
});

// T-T6g.8: an allowed figure must not be a typed copy of live data. Live data = every measured number in the three published files:
// not whole numbers (counts and zeros, where a match is chance) and not the fixed settings they repeat (`line`, the A2 treasury line;
// `priceBand`, the price check). Scales and CSS are positions, not claims, so they are not compared; dates are not numbers.
// This catches an exact copy. A rounded copy (say 75% for 0.7528) is caught by the first test instead: it is not on ALLOW.
const value = (fig) => {
  const n = Number(fig.replace(/[$,%×x]|bps|\s|k|M|B/g, ''));
  if (fig.endsWith('%')) return [n / 100];
  if (/bps$/.test(fig)) return [n, n / 1e4];
  if (fig.startsWith('$')) return [n * (/k$/.test(fig) ? 1e3 : /M$/.test(fig) ? 1e6 : /B$/.test(fig) ? 1e9 : 1)];
  if (/[×x]$/.test(fig)) return [n];
  return [];
};
const FIXED = ['line', 'priceBand'];
const numbers = (o) => (typeof o === 'number' ? (Number.isInteger(o) ? [] : [o]) : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => (FIXED.includes(k) ? [] : numbers(v))) : []);

test('T-T6g.8 no allowed figure equals a live value in thesis.json, model_inputs.json or fee_trace.json', () => {
  const live = ['thesis', 'model_inputs', 'fee_trace'].flatMap((f) => numbers(JSON.parse(readFileSync(`data/published/${f}.json`, 'utf8'))));
  assert.ok(live.length > 100);
  const same = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
  const clash = ALLOW.filter((a) => !['scale', 'css'].includes(a.kind)).flatMap((a) => a.figures.filter((fig) => value(fig).some((v) => live.some((l) => same(l, v)))).map((fig) => `${a.file} ${fig}`));
  assert.deepEqual(clash, []);
});

test('T-T6i.2 Easy text is scanned too, and a typed figure planted in it is caught', () => {
  for (const f of ['lib/easy_text.ts', 'lib/glossary.ts', 'lib/mode.ts', 'components/Say.tsx', 'components/Term.tsx', 'components/ModeSwitch.tsx']) assert.ok(FILES.includes(f), `${f} is not scanned`);
  const planted = "export const EASY = { home: 'About 79% of the money went private, so volume must reach $12.6B.' };";
  const figs = figuresIn(planted).map((f) => f.figure);
  assert.deepEqual(figs, ['79%', '$12.6B']);
  assert.ok(figs.every((f) => !allowed('lib/easy_text.ts', f)), 'a live figure typed into Easy text fails the allow-list');
});

test('T-T6g.5 the Method email sentence is past tense, so it reads right after 9 Nov', () => {
  const method = readFileSync('app/method/page.tsx', 'utf8');
  assert.match(method, /said this would become the main path on 9 Nov 2026/);
  assert.doesNotMatch(method, /says this becomes the main path/);
});
