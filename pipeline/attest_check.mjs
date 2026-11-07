// attest:check <day>: hash data/chain/<day>.jsonl and compare it with the testnet contract, and the day's treasury file too when the record names one.
// Read-only, no key. Contract id and RPC come from contract/deployment.json (or env).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callView } from '../lib/near_view.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// "Could not check" gets its own exit code, so a script can't read it as a mismatch.
export const EXIT = { match: 0, mismatch: 1, 'not-anchored': 1, error: 2 };

export const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function compare(localHash, record) {
  if (!record) return 'not-anchored';
  return record.archive_sha256 === localHash ? 'match' : 'mismatch';
}

export const viewGet = (day, target) => callView('get', { day }, target);

// The treasury file's hash, carried in the readings string of records written since treasury files were anchored.
export const treasuryHashIn = (readings) => /(?:^|;)treasury=([0-9a-f]{64})(?:;|$)/.exec(readings ?? '')?.[1] ?? null;

export async function checkDay(day, { quotesDir, treasuryDir, ...rpc }) {
  const local = sha256Hex(await readFile(join(quotesDir, `${day}.jsonl`)));
  const record = await viewGet(day, rpc);
  const anchored = treasuryHashIn(record?.readings);
  const bytes = anchored && treasuryDir ? await readFile(join(treasuryDir, `${day}.jsonl`)).catch(() => null) : null;
  const treasury = !anchored ? 'not-in-record' : bytes && sha256Hex(bytes) === anchored ? 'match' : 'mismatch';
  const status = compare(local, record);
  return { status: status === 'match' && treasury === 'mismatch' ? 'mismatch' : status, local, record, treasury };
}

async function readDeployment() {
  try {
    return JSON.parse(await readFile(join(ROOT, 'contract', 'deployment.json'), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function main() {
  const day = process.argv[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) {
    console.error('usage: npm run attest:check -- YYYY-MM-DD');
    return EXIT.error;
  }
  const deployment = await readDeployment();
  const contractId = process.env.NEAR_ATTEST_CONTRACT ?? deployment.contractId;
  const rpcUrl = process.env.NEAR_RPC_URL ?? deployment.rpcUrl;
  if (!contractId || !rpcUrl) {
    console.error('COULD NOT CHECK: no contract deployed yet (contract/deployment.json is missing)');
    return EXIT.error;
  }
  const quotesDir = process.env.CHAIN_DIR ?? join(ROOT, 'data', 'chain');
  const treasuryDir = process.env.TREASURY_DIR ?? join(ROOT, 'data', 'treasury');
  const { status, local, record, treasury } = await checkDay(day, { quotesDir, treasuryDir, rpcUrl, contractId });
  console.log(`day      ${day}`);
  console.log(`contract ${contractId}`);
  console.log(`file     ${local}`);
  console.log(`on chain ${record?.archive_sha256 ?? '(no record)'}`);
  console.log(`treasury ${{ match: 'matches its hash in the record', mismatch: 'DIFFERS from its hash in the record', 'not-in-record': 'no hash in this record' }[treasury]}`);
  console.log({ match: 'MATCH', mismatch: 'MISMATCH', 'not-anchored': 'NOT ANCHORED' }[status]);
  return EXIT[status];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main().catch((err) => {
    console.error(`COULD NOT CHECK: ${err.message}`);
    return EXIT.error;
  });
}
