import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ENTRIES, GROUPS } from './reproduce_entries.ts';
import { PAGE_OF, WIDE } from './charts_page.ts';

// T-T6l.1 (docs/PLAN.md §6j L2): every chart and side measure on Reproduce has a card on All Charts, and no card is left over.
const page = readFileSync('app/charts/page.tsx', 'utf8');
const cards = ENTRIES.filter((e) => e.group !== 'reading');

test('every chart and side measure has a page link and a card body on All Charts', () => {
  assert.deepEqual(Object.keys(PAGE_OF).sort(), cards.map((e) => e.id).sort());
  for (const e of cards) {
    assert.ok(existsSync(`app${PAGE_OF[e.id] === '/' ? '' : PAGE_OF[e.id].replace(/\/$/, '')}/page.tsx`), `${e.id}: ${PAGE_OF[e.id]} has no page`);
    assert.match(page, new RegExp(`^    ${/^[a-z]+$/.test(e.id) ? e.id : `'${e.id}'`}: `, 'm'), `${e.id}: no card body`);
  }
  for (const id of WIDE) assert.ok(cards.some((e) => e.id === id), `${id} is wide but not an entry`);
});

test('the page walks the shared groups and entries, so order and wording follow Reproduce', () => {
  assert.match(page, /GROUPS\.map/);
  assert.match(page, /ENTRIES\.filter\(\(x\) => x\.group === g\.id\)/);
  assert.match(page, /readings\.map/);
  assert.match(page, /ENTRIES\.find\(\(e\) => e\.id === r\.qid/);
  assert.equal(GROUPS.length, 3);
});

// L8: no rolling panel on this page.
test('All Charts shows no rolling panel', () => {
  assert.doesNotMatch(page, /PanelSlot|PanelNote|panel_source|panel_view/);
});
