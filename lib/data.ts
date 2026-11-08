// The site's only data reader. Pages call it on the server; Route Handlers expose it to the browser.
// A published file that cannot be read gives a real "did not load" state; no sample figure exists.
// With GITHUB_DATA_TOKEN set, files come from GitHub (D24, cached 5 minutes), so new data shows without a redeploy.
// Without it, or when GitHub does not answer, they come from disk (what was built or checked out), and the log says so.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { anchorPanel, dayState, FAILED_PANEL, type AttestRecord, type DayCheck } from './attest_view';
import { listRepoDir, readRepoFile } from './github_data';
import { callView, type RpcTarget } from './near_view';
import { easyElasticity, easyHome, easyReadingLine } from './easy_text';
import { elasticitySpan, elasticityView, type ElasticityDoc } from './elasticity_view';
import { feeView } from './fee_view';
import { concentrationView, thesisView, type ConcentrationDoc, type ThesisDoc } from './thesis_view';
import { type Market } from './model';
import { reconcileRows, type Row } from './reconcile_view';
import { freshness } from './status_view';
import { tokenBoardView, type TokenBoard } from './token_board_view';
import { chainChecksView, type ChainDays } from './chain_checks_view';
import { anchorStates, commandsFor } from './mock';

type FeeTrace = import('./fee_view').FeeTrace;

const token = () => process.env.GITHUB_DATA_TOKEN || null;

// Bytes of a file under the repo root: GitHub first when there is a token, disk otherwise. null = the file does not exist.
async function readData(rel: string): Promise<Uint8Array | null> {
  const t = token();
  if (t) {
    try {
      return await readRepoFile(rel, { token: t });
    } catch (e) {
      console.warn(`GitHub read failed for ${rel}, using the disk copy: ${(e as Error).message}`);
    }
  }
  return readFile(path.join(process.cwd(), rel)).catch(() => null);
}

async function readPublished<T>(name: string): Promise<T | null> {
  const bytes = await readData(`data/published/${name}`);
  try {
    return bytes ? (JSON.parse(Buffer.from(bytes).toString('utf8')) as T) : null;
  } catch {
    return null;
  }
}

// The real file with the $10k to $100k public swaps taken away: what the page shows once that bucket is empty.
function withoutPublicBucket(t: FeeTrace): FeeTrace {
  const b = t.trace.bySize['10k-100k'];
  const none = { ...b.all, allInBps: null, appFeeBps: null, protocolBps: null, spreadBps: null };
  return { ...t, trace: { ...t.trace, bySize: { ...t.trace.bySize, '10k-100k': { ...b, all: none } } } };
}

async function listChainDays(): Promise<string[]> {
  const t = token();
  let names: string[] | null = null;
  if (t) {
    try {
      names = await listRepoDir('data/chain', { token: t });
    } catch (e) {
      console.warn(`GitHub list failed for data/chain, using the disk copy: ${(e as Error).message}`);
    }
  }
  names ??= await readdir(chainDir()).catch(() => []);
  return names.filter((f) => f.endsWith('.jsonl')).map((f) => f.replace('.jsonl', ''));
}

// `few` previews AC-5.4 and `emptyFee` previews an empty public bucket: the real files with those parts taken away, through the same view code.
export async function getNumbers({ few = false, emptyFee = false } = {}) {
  const read = await readPublished<FeeTrace>('fee_trace.json');
  const trace = read && emptyFee ? withoutPublicBucket(read) : read;
  const raw = await readPublished<ElasticityDoc>('elasticity.json');
  const el = raw && few ? { ...raw, frozenEvents: Math.max(raw.frozenEvents, 4), main: { ...raw.main, usable: 2, e1: null } } : raw;
  const th = await readPublished<ThesisDoc>('thesis.json');
  const head = thesisView(th);
  const elasticity = elasticityView(el);
  // Easy mode's words, built from the same files (docs/PLAN.md §6g E4).
  const easyEl = el && elasticity.live
    ? easyElasticity(elasticity.plot ? { est: elasticity.plot.est, lo: elasticity.plot.lo, hi: elasticity.plot.hi } : null, { usable: el.main.usable, total: el.frozenEvents, span: elasticitySpan(el), pass: elasticity.plot && el.main.e2 ? { est: el.main.e2.estimate, lo: el.main.e2.lo, hi: el.main.e2.hi } : null })
    : null;
  // The line under each Home question in Easy (docs/PLAN.md §6h J6), from the same files.
  const ctx = { elasticity: el?.main?.e1 ?? null, largest: (th as { concentration?: { largest?: { name: string; share: number } } } | null)?.concentration?.largest ?? null };
  const readings = th ? head.readings.map((r) => {
    const raw = th.readings.find((x) => x.id === r.qid);
    return raw ? { ...r, easyDetail: easyReadingLine(raw as Parameters<typeof easyReadingLine>[0], ctx) } : r;
  }) : head.readings;
  return { figures: head.figures, readings, headline: head, fee: feeView(trace), elasticity, easy: { home: easyHome(th), elasticity: easyEl } };
}

// S6: per-size integrator shares from thesis.json; Not Measured when the file is missing.
export async function getConcentration() {
  const th = await readPublished<ThesisDoc & { concentration?: ConcentrationDoc }>('thesis.json');
  return concentrationView(th, th?.readings.find((r) => r.id === 'Q4')?.detail ?? null);
}

// U4: the model's inputs from the published file; `market` is null when it cannot be read, and the page says so.
// The elasticity interval from U5 sets the Model page's elasticity slider (FR-10, FR-11); null when the file is missing.
export type ElasticityRange = { estimate: number; lo: number; hi: number } | null;
export type RevenueSplit = { before: { days: number; revenueRate: number } | null; since: { days: number; revenueRate: number } | null } | null;
export async function getMarket(): Promise<{ market: Market | null; asOf: string | null; elasticity: ElasticityRange; split: RevenueSplit }> {
  const p = await readPublished<any>('model_inputs.json');
  const el = await readPublished<{ main?: { e1?: { estimate: number; lo: number; hi: number } | null } }>('elasticity.json');
  const elasticity = el?.main?.e1 ? { estimate: el.main.e1.estimate, lo: el.main.e1.lo, hi: el.main.e1.hi } : null;
  const vis = await getVisibility();
  if (!p) return { market: null, asOf: null, elasticity, split: null };
  return {
    asOf: p.asOf,
    elasticity,
    split: vis?.revenueSplit ?? null,
    market: { supply: p.supply.now, revenueRate: p.revenueRate, revenueRateRange: p.revenueRateRange, gasBurnNearPerYear: p.issuance.gasBurnNearPerYear, todayVolume: p.volume30dUsd, priceUsd: p.priceUsd, feeBps: p.feeBpsOfVolume },
  };
}

// A3: the 7-day DefiLlama ÷ chain-counted USD ratio, shown with no line and no state.
export type Visibility = { ratio: number | null; lastDay: string | null; llama7dUsd: number | null; chain7dUsd: number | null; rangeBefore: { low: number; high: number } | null; history: { wantedDays: number; chainDaysBefore: number; ratiosBefore: number }; revenueSplit: RevenueSplit };
export const getVisibility = () => readPublished<Visibility>('visibility.json');

// The weekly public activity table on Method, from the stored BigQuery results.
export type Activity = { from: string | null; to: string | null; weeks: { from: string; to: string; transactions: number; signersPerDay: number; receipts: number; nearBurnt: number }[] };
export const getActivity = () => readPublished<Activity>('activity.json');

// S8: our side of the figures that public sources disagree on, from the published file `verify` checks. Missing file: every "Ours" cell says "Not available".
export async function getReconciliation() {
  const doc = await readPublished<{ rows: Row[] }>('reconciliation.json');
  return doc?.rows ?? reconcileRows({ vstar: null, buybackShare: null, fees: [], volume: [] });
}

// AC-2.3: how completely each frozen chain day was read (data/published/chain_days.json). null when the file is missing.
export async function getChainChecks() {
  return chainChecksView(await readPublished<ChainDays>('chain_days.json'));
}

// FR-21 coverage board: which routes carry the swaps and how many have a price on both sides. null when the file is missing.
export async function getTokenBoard() {
  return tokenBoardView(await readPublished<TokenBoard>('token_board.json'));
}

// FR-20 feeds. The thesis feed is the published file as it is stored, so it cannot differ from what the Headline page reads.
export async function getThesisBytes() {
  return readData('data/published/thesis.json');
}

// Frozen chain days with size and SHA-256 (the hash attest:check compares with the chain), and one day's file as stored.
export async function getDayList() {
  const days = (await listChainDays()).sort();
  const files = await Promise.all(days.map(async (day) => ({ day, bytes: await readData(`data/chain/${day}.jsonl`) })));
  return files.flatMap((f) => (f.bytes ? [{ day: f.day, bytes: f.bytes.length, sha256: createHash('sha256').update(f.bytes).digest('hex') }] : []));
}

export async function getChainDay(day: string) {
  return readData(`data/chain/${day}.jsonl`);
}

// NFR-6: freshness from the last frozen day, plus the hash of the published numbers.
export async function getStatus() {
  const bytes = await readData('data/published/thesis.json');
  const th = bytes ? (JSON.parse(Buffer.from(bytes).toString('utf8')) as { asOf: string; snapshotLastDay?: string | null }) : null;
  const lastFrozenDay = th?.snapshotLastDay ?? null;
  return {
    lastRefresh: th?.asOf ?? null,
    lastFrozenDay,
    publishedSha256: bytes && createHash('sha256').update(bytes).digest('hex'),
    ...freshness(lastFrozenDay, new Date()),
  };
}

// S5 and /api/attest read the real contract; the hash comes from the same day file attest:check uses.
const chainDir = () => path.join(process.cwd(), 'data', 'chain');

async function readDeployment() {
  const d = JSON.parse(await readFile(path.join(process.cwd(), 'contract', 'deployment.json'), 'utf8'));
  return { rpcUrl: d.rpcUrl as string, contractId: d.contractId as string };
}

// NEAR's public testnet endpoint refuses bursts, so a refused call is tried once more after a short pause.
async function callViewRetry(method: string, args: object, target: RpcTarget) {
  try {
    return await callView(method, args, target);
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return callView(method, args, target);
  }
}

async function checkDay(day: string, target: RpcTarget): Promise<DayCheck> {
  const bytes = await readData(`data/chain/${day}.jsonl`);
  const record: AttestRecord | null = await callViewRetry('get', { day }, target);
  return { day, local: bytes && createHash('sha256').update(bytes).digest('hex'), record };
}

// Runs the day checks a few at a time instead of all at once (docs/PLAN.md §6h J17).
async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

// The newest frozen chain day, for Reproduce's step 3 (docs/PLAN.md §6h J16). One small published file, no testnet call.
export async function getLatestChainDay(): Promise<string | null> {
  return (await readPublished<{ lastDay?: string }>('chain_days.json'))?.lastDay ?? null;
}

export async function getAnchorPanel() {
  let current = FAILED_PANEL;
  try {
    const target = await readDeployment();
    const lastDay: string | null = await callViewRetry('last_day', {}, target);
    const days = (await listChainDays()).filter((d) => lastDay && d <= lastDay);
    if (lastDay && !days.includes(lastDay)) days.push(lastDay);
    const checks = await inBatches(days, 6, (d) => checkDay(d, target));
    current = anchorPanel(checks, `https://testnet.nearblocks.io/address/${target.contractId}`);
  } catch (e) {
    // Testnet did not answer: the page says so instead of guessing, and the log says why.
    console.warn(`Anchor panel: NEAR testnet check failed: ${(e as Error).message}`);
  }
  return { current, anchorStates, commands: commandsFor(process.env.EXPLORER_PANEL === 'off') };
}

export async function getAttestation(day: string) {
  const target = await readDeployment();
  const check = await checkDay(day, target);
  return {
    day,
    state: dayState(check),
    contract: target.contractId,
    archiveSha256: check.local,
    onChainSha256: check.record?.archive_sha256 ?? null,
    readings: check.record?.readings ?? null,
    blockTimestamp: check.record?.block_timestamp ?? null,
  };
}
