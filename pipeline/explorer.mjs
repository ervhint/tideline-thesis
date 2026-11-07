// The Intents Explorer API (needs INTENTS_EXPLORER_JWT): one request every 5.2 seconds, 1,000 swaps a page.
// Terms 4.1(e): rows from here live in memory for the length of one job and are never written, logged or returned to the site.
import { existsSync, readFileSync } from 'node:fs';

export const MIN_GAP_MS = 5_200;
export const PAGE_SIZE = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;

export function explorerJwt() {
  const fromFile = existsSync('.env') ? readFileSync('.env', 'utf8').match(/^INTENTS_EXPLORER_JWT=(.+)$/m)?.[1]?.trim() : null;
  const jwt = process.env.INTENTS_EXPLORER_JWT || fromFile;
  if (!jwt) throw new Error('INTENTS_EXPLORER_JWT is missing');
  return jwt;
}

async function page(query, jwt, fetchFn) {
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_GAP_MS - Date.now()));
    lastRequest = Date.now();
    let status = 0;
    try {
      const r = await fetchFn(`https://explorer.near-intents.org/api/v0/transactions?${new URLSearchParams(query)}`, {
        headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(60_000),
      });
      if (r.ok) return await r.json();
      status = r.status;
    } catch (e) {
      console.error(`explorer request failed (${e.name}), attempt ${attempt}`);
    }
    // A response body is API data, so only the status is ever reported.
    if (status >= 400 && status < 500 && status !== 429) throw new Error(`explorer answered ${status}`);
    if (status) console.error(`explorer answered ${status}, attempt ${attempt}`);
    if (attempt === 8) throw new Error('explorer: too many failures');
    await sleep(15_000 * attempt);
  }
}

// Calls `onRows` with each page of successful swaps of one UTC day, so a caller can fold them into totals and keep nothing.
export async function eachPage(day, onRows, { jwt = explorerJwt(), filter = {}, fetchFn = fetch } = {}) {
  const start = `${day}T00:00:00Z`;
  const end = new Date(Date.parse(start) + 86_400_000).toISOString();
  let cursor = {};
  for (;;) {
    const batch = await page({ numberOfTransactions: String(PAGE_SIZE), statuses: 'SUCCESS', startTimestamp: start, endTimestamp: end, ...filter, ...cursor }, jwt, fetchFn);
    onRows(batch);
    if (batch.length < PAGE_SIZE) return;
    const last = batch.at(-1);
    cursor = { lastDepositAddress: last.depositAddress, direction: 'next', ...(last.depositMemo ? { lastDepositMemo: last.depositMemo } : {}) };
  }
}
