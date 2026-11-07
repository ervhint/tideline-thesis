// The rolling panel's numbers. Pure: Explorer pages in, totals out. No network, no clock, no disk.
// Terms 4.1(e): the result is kept for at most 24 hours (docs/EXPLORER.md). It holds totals only, and sets no reading.
import { CONFIDENTIAL_START } from './visibility.mjs';

export const PANEL_KIND = 'tideline-panel';
export const MAX_AGE_HOURS = 24;
export const TOP_FRONTENDS = 5;

// A real swap turns one token into another. Same token in and out is a liquidity movement (docs/EXPLORER.md), so it is left out and only counted.
export const isRealSwap = (row) => row.originAsset !== row.destinationAsset;

// A referral is a label a frontend chooses, so one that looks like an address is never shown by name.
const looksLikeAccount = (s) => /^0x/i.test(s) || /^[0-9a-f]{32,}$/i.test(s) || s.length > 40 || !/^[\w.-]+$/.test(s);
export const frontendName = (referral) => (!referral ? 'No Referral' : looksLikeAccount(referral) ? 'Other' : referral);

const bpsOf = (row) => (row.appFees ?? []).reduce((t, f) => t + (Number(f.fee) || 0), 0);
const empty = () => ({ swaps: 0, usd: 0, feeUsd: 0 });
function add(t, usd, bps) {
  t.swaps++;
  t.usd += usd;
  t.feeUsd += (usd * bps) / 1e4;
}

export const newTotals = () => ({ all: empty(), since: empty(), frontends: new Map(), byDay: new Map(), sameToken: 0, unpriced: 0 });

// Folds one page of rows into the totals and keeps nothing of the rows themselves.
// A failed page stops the whole run (pipeline/explorer.mjs throws), so no half-read day can reach the panel.
export function foldRows(totals, rows, day) {
  if (!totals.byDay.has(day)) totals.byDay.set(day, { swaps: 0, usd: 0 });
  const d = totals.byDay.get(day);
  for (const row of rows) {
    if (!isRealSwap(row)) { totals.sameToken++; continue; }
    const usd = Number(row.amountInUsd);
    if (!(usd > 0)) { totals.unpriced++; continue; }
    const bps = bpsOf(row);
    add(totals.all, usd, bps);
    d.swaps++;
    d.usd += usd;
    if (day >= CONFIDENTIAL_START) add(totals.since, usd, bps);
    const name = frontendName(row.referral);
    if (!totals.frontends.has(name)) totals.frontends.set(name, empty());
    add(totals.frontends.get(name), usd, bps);
  }
  return totals;
}

const line = (t) => ({ swaps: t.swaps, usd: t.usd, appFeeBps: t.usd ? (1e4 * t.feeUsd) / t.usd : null });

export function panelDoc(totals, quotes, { startedAt, from, to, days }) {
  const frontends = [...totals.frontends].map(([name, t]) => ({ name, share: totals.all.usd ? t.usd / totals.all.usd : 0, appFeeBps: t.usd ? (1e4 * t.feeUsd) / t.usd : null }))
    .sort((a, b) => b.share - a.share).slice(0, TOP_FRONTENDS);
  return { kind: PANEL_KIND, startedAt, window: { from, to, days }, swaps: line(totals.all), sinceConfidential: { from: CONFIDENTIAL_START, ...line(totals.since) }, frontends, byDay: [...totals.byDay].map(([day, t]) => ({ day, swaps: t.swaps, usd: t.usd })).sort((a, b) => a.day.localeCompare(b.day)), leftOut: { sameToken: totals.sameToken, unpriced: totals.unpriced }, quotes };
}
