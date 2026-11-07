// The rolling panel as the pages read it. Pure and type-annotations only, so Node runs it in tests and the site imports it.
// Off: the slots are gone. Over 24 hours old or unreadable: "Not Available". Nothing here ever reaches a published file or a feed.
export const MAX_AGE_HOURS = 24;
export type PanelDoc = {
  kind: string; startedAt: string; window: { from: string; to: string; days: number };
  swaps: { swaps: number; usd: number; appFeeBps: number | null };
  sinceConfidential: { from: string; swaps: number; usd: number; appFeeBps: number | null };
  frontends: { name: string; share: number; appFeeBps: number | null }[];
  byDay?: { day: string; swaps: number; usd: number }[]; // missing in panels made before T6e
  leftOut: { sameToken: number; unpriced: number };
  quotes: { sizeUsd: number; quotes: number; failed: number; allInBps?: number; appFeeBps?: number; withdrawBps?: number; unexplainedBps?: number }[];
};
// days: every day of the window, with null for a day the panel has no total for (never drawn as zero). null when the panel has no per-day totals.
export type Panel = { state: 'off' } | { state: 'unavailable' } | { state: 'live'; age: string; swapsText: string; frontendText: string; quoteText: string; days: { day: string; usd: number | null }[] | null };

const usd = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(1)}M`);
const bps = (v: number | null | undefined) => (v == null ? 'not measured' : `${v.toFixed(1)} bps`);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const int = (n: number) => n.toLocaleString('en-US');
const size = (n: number) => `$${int(n)}`;

export const isFresh = (doc: PanelDoc, now: Date) => {
  const age = now.getTime() - Date.parse(doc.startedAt);
  return age >= 0 && age <= MAX_AGE_HOURS * 3_600_000;
};

function windowDays(from: string, to: string) {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function panelView(doc: PanelDoc | null, { off = false, now = new Date() }: { off?: boolean; now?: Date } = {}): Panel {
  if (off) return { state: 'off' };
  if (doc?.kind !== 'tideline-panel' || !isFresh(doc, now)) return { state: 'unavailable' };
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(doc.startedAt)) / 3_600_000));
  const s = doc.sinceConfidential;
  const q = doc.quotes.filter((x) => x.quotes > 0);
  return {
    state: 'live',
    age: `${hours} hour${hours === 1 ? '' : 's'} old`,
    swapsText: `The Intents Explorer lists ${int(doc.swaps.swaps)} swaps worth ${usd(doc.swaps.usd)} over the last ${doc.window.days} days, at ${bps(doc.swaps.appFeeBps)} in app fees, ${int(s.swaps)} of them since confidential settlement began. It sees swaps the public chain no longer shows.`,
    frontendText: `Largest frontends by Explorer volume, last ${doc.window.days} days: ${doc.frontends.map((f) => `${f.name} ${pct(f.share)}`).join(', ')}.`,
    days: doc.byDay?.length ? windowDays(doc.window.from, doc.window.to).map((day) => ({ day, usd: doc.byDay!.find((d) => d.day === day)?.usd ?? null })) : null,
    quoteText: q.length ? `Live 1Click dry quotes, median across four pairs: ${q.map((x) => `${size(x.sizeUsd)} costs ${bps(x.allInBps)} all-in, ${bps(x.appFeeBps)} of it app fee`).join('; ')}.` : 'No live quote came back this time.',
  };
}
