import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ENTRIES, fileUrl } from './reproduce_entries.ts';

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

test('every entry names real files, a source and one plain sentence', () => {
  assert.equal(new Set(ENTRIES.map((e) => e.id)).size, ENTRIES.length);
  for (const e of ENTRIES) {
    assert.ok(e.files.length > 0, e.id);
    for (const f of e.files) assert.ok(existsSync(f), `${e.id}: ${f}`);
    assert.ok(e.source.length > 0, e.id);
    assert.match(e.sentence, /^[A-Z].+\.$/, e.id);
  }
});

test('every SQL file is listed, and every result names its query, date and bytes', () => {
  const listed = new Set(ENTRIES.flatMap((e) => e.files));
  for (const f of readdirSync('queries').filter((x) => x.endsWith('.sql'))) assert.ok(listed.has(`queries/${f}`), f);
  for (const f of readdirSync('data/bigquery')) {
    const d = JSON.parse(readFileSync(`data/bigquery/${f}`, 'utf8'));
    assert.ok(d.query && d.ranOn && d.bytesProcessed, f);
  }
});

test('every Open the Query link lands on a real entry, never the bare page', () => {
  const ids = new Set(ENTRIES.map((e) => e.id));
  const pages = [...walk('app'), ...walk('components')].filter((f) => f.endsWith('.tsx'));
  let links = 0;
  for (const f of pages) {
    const text = readFileSync(f, 'utf8');
    for (const [, id] of text.matchAll(/href="\/reproduce\/#([a-z0-9-]+)"/g)) { links++; assert.ok(ids.has(id), `${f}: #${id}`); }
    assert.doesNotMatch(text, /href="\/reproduce\/"[^>]*>\s*Open the Query/, f);
  }
  assert.ok(links >= 7, `only ${links} links`);
  for (const page of ['app/elasticity/page.tsx', 'app/model/page.tsx', 'app/concentration/page.tsx']) assert.match(readFileSync(page, 'utf8'), /\/reproduce\/#/, page);
});

test('a query link points at the file in this repo', () => {
  assert.equal(fileUrl('queries/x.sql'), 'https://github.com/ervhint/tideline-thesis/blob/main/queries/x.sql');
});
