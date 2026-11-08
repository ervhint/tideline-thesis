import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diff } from './verify.mjs';

const verify = (env = {}) => spawnSync(process.execPath, ['pipeline/verify.mjs'], { env: { ...process.env, ...env }, encoding: 'utf8' });

test('T-7.1 verify on the committed numbers ends in ALL OK', () => {
  const r = verify();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ALL OK/);
});

test('T-7.2 one edited published number prints its diff and exits non-zero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pub-'));
  cpSync('data/published', dir, { recursive: true });
  const f = join(dir, 'thesis.json');
  const doc = JSON.parse(readFileSync(f, 'utf8'));
  doc.vstar.multiple16 += 1;
  writeFileSync(f, JSON.stringify(doc, null, 1) + '\n');
  const r = verify({ PUBLISHED_DIR: dir });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /DIFF thesis\.json/);
  assert.match(r.stdout, /\.vstar\.multiple16/);
  assert.match(r.stdout, /NOT OK/);
});

test('diff tolerates float noise, flags real changes, missing and extra keys', () => {
  assert.equal(diff({ a: 1 }, { a: 1 + 1e-12 }).bad.length, 0);
  assert.equal(diff({ a: 1 }, { a: 1.001 }).bad.length, 1);
  assert.equal(diff({ a: 1 }, {}).bad.length, 1);
  assert.equal(diff({}, { a: 1 }).bad.length, 1);
  assert.equal(diff({ l: [1, 2] }, { l: [1, 3] }).bad[0].path, '.l[1]');
});

test('the scan finds API fields in stored data, and the stored data has none', async () => {
  const { apiDataIn } = await import('./verify.mjs');
  assert.deepEqual(apiDataIn(['data', 'alarm']).found, []);
  const dir = mkdtempSync(join(tmpdir(), 'scan-'));
  writeFileSync(join(dir, 'x.json'), '{"amountInUsd":"1"}');
  assert.equal(apiDataIn([dir]).found.length, 1);
  rmSync(dir, { recursive: true, force: true });
});

test('T-T6h.2 a hand edit to one figure in THESIS.md fails verify and names the line', () => {
  const dir = mkdtempSync(join(tmpdir(), 'thesis-md-'));
  const f = join(dir, 'THESIS.md');
  const text = readFileSync('THESIS.md', 'utf8');
  const lines = text.split('\n');
  const i = lines.findIndex((l) => /\d+% of the USD counted on chain/.test(l));
  assert.ok(i >= 0, 'THESIS.md has the treasury figure');
  lines[i] = lines[i].replace(/(\d+)% of the USD counted on chain/, (m, n) => `${Number(n) === 1 ? 2 : 1}% of the USD counted on chain`);
  writeFileSync(f, lines.join('\n'));
  try {
    const r = verify({ THESIS_MD: f });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, new RegExp(`DIFF THESIS\.md line ${i + 1}:`));
    assert.match(r.stdout, /NOT OK/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
