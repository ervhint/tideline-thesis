// The visibility check (PREREG.md amendment A3). Pure: daily volumes in, ratio out. No network, no clock.
// DefiLlama counts all Intents and the frozen chain days count what public chain data shows. Before swaps began to settle privately the two moved
// together, so the ratio says how much of DefiLlama's volume the public chain still sees. If it rises, the chain sees less; that is lost sight, not lost demand.
// Stored sources only. There is no line and no state: chain days start on 4 Oct 2026, too little history before 27 Oct to set one (A3).
export const CONFIDENTIAL_START = '2026-10-27';
export const HISTORY_WANTED = 90;
const RATIO_DAYS = 7, WINDOW_DAYS = 30;
const sum = (xs, k) => xs.reduce((t, x) => t + x[k], 0);

// 7-day DefiLlama ÷ chain-counted USD on each day both have. llama: [{ day, volume }], chain: Map of day -> USD.
export function ratios(llama, chain) {
  const both = llama.filter((d) => d.volume != null && chain.has(d.day)).sort((a, b) => (a.day < b.day ? -1 : 1));
  const out = [];
  for (let i = RATIO_DAYS - 1; i < both.length; i++) {
    const w = both.slice(i - RATIO_DAYS + 1, i + 1);
    const chainUsd = w.reduce((t, d) => t + chain.get(d.day), 0);
    out.push({ day: both[i].day, llamaUsd: sum(w, 'volume'), chainUsd, ratio: sum(w, 'volume') / chainUsd });
  }
  return out;
}

function window(days, to, n = WINDOW_DAYS) {
  const w = days.filter((d) => d.day <= to).slice(-n);
  const volumeUsd = sum(w, 'volume'), revenueUsd = sum(w, 'revenue');
  return { from: w[0]?.day ?? null, to: w.at(-1)?.day ?? null, days: w.length, volumeUsd, revenueUsd, revenueRate: volumeUsd ? revenueUsd / volumeUsd : null };
}

export function visibility(llamaDays, chain) {
  const days = llamaDays.filter((d) => d.volume != null).sort((a, b) => (a.day < b.day ? -1 : 1));
  const series = ratios(days, chain);
  const last = series.at(-1) ?? null;
  const since = days.filter((d) => d.day >= CONFIDENTIAL_START);
  const before = days.filter((d) => d.day < CONFIDENTIAL_START);
  const earlier = series.filter((r) => r.day < CONFIDENTIAL_START).map((r) => r.ratio);
  const chainDaysBefore = [...chain.keys()].filter((d) => d < CONFIDENTIAL_START).length;
  return {
    prereg: 'PREREG.md amendment A3',
    source: 'DefiLlama dexs/near-intents daily volume ÷ USD counted in the frozen chain days, 7-day sums',
    query: 'analysis/visibility.mjs visibility → data/snapshot/defillama_daily.json, data/chain/*.jsonl',
    rule: 'Shown as a ratio with no line and no state: too little chain history before 27 Oct 2026 to set one',
    line: null,
    state: null,
    history: { wantedDays: HISTORY_WANTED, chainDaysBefore, ratiosBefore: earlier.length },
    lastDay: last?.day ?? null,
    ratio: last?.ratio ?? null,
    llama7dUsd: last?.llamaUsd ?? null,
    chain7dUsd: last?.chainUsd ?? null,
    rangeBefore: earlier.length ? { low: Math.min(...earlier), high: Math.max(...earlier) } : null,
    revenueSplit: {
      before: before.length ? window(before, before.at(-1).day) : null,
      since: since.length ? window(since, since.at(-1).day, since.length) : null,
    },
    recent: series.slice(-14).map((r) => ({ day: r.day, ratio: r.ratio })),
  };
}
