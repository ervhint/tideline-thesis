// S2 view of the realised fee trace (T4, PREREG.md section 7 and amendment A2 rule 6). Pure and type-annotations only, so Node can run it directly (tests) and the site can import it.
type Left = { notBothPriced: { swaps: number }; feeUnreadable: { swaps: number; usd: number }; priceCheck: { swaps: number; usd: number } };
export type CostParts = {
  groups: number; swaps: number; grossUsd: number; outUsd: number;
  allInBps: number | null; appFeeBps: number | null; protocolBps: number | null; spreadBps: number | null; partsGapBps: number | null; left: Left;
};
// The confidential path has an all-in cost only: any fee on it is hidden, so it has no app fee or spread to show.
type Confidential = { swaps: number; inUsd: number; allInBps: number | null };
type ByKind = { all: CostParts; tokenDiff: CostParts; transfer: CostParts; confidential?: Confidential };
export type FeeTrace = {
  from: string; to: string; days: number; gapsInWindow: number;
  protocolFee?: { bps: number; collector: string; pips?: number; sameSince?: string };
  trace: { days: string[]; bySize: Record<string, ByKind>; allSizes: ByKind };
  nearRevenue?: { bps: number; from: string; to: string; buyback?: { share: number | null; burned: boolean | null; since?: string } };
  query?: string;
};
const SIZE = 10000;
const EASY_WITHDRAW = 'Paid when you move money out to another blockchain. It is not part of the swap, so these swaps do not hold it.';
const bucketOf = (usd: number) => (usd < 1000 ? '0-1k' : usd < 10000 ? '1k-10k' : usd < 100000 ? '10k-100k' : '100k+');
const BUCKET_NAME: Record<string, string> = { '0-1k': '$0 to $1k', '1k-10k': '$1k to $10k', '10k-100k': '$10k to $100k', '100k+': 'over $100k' };

const usd = (v: number) => (Math.abs(v) < 0.005 ? '< $0.01' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`);
const bps = (v: number) => `${v.toFixed(1)} bps`;
const int = (n: number) => n.toLocaleString('en-US');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const dayName = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// fee() as read from the chain each hour (pipeline/protocol_fee.mjs in the refresh job), never typed in.
export function protocolText(p: FeeTrace['protocolFee']) {
  if (!p) return 'the fee() rate could not be read.';
  const pips = p.pips ?? Math.round(p.bps * 100);
  const since = p.sameSince ? `, and it has read the same at every check since at least ${Number(p.sameSince.slice(8, 10))} ${new Date(`${p.sameSince}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
  return `fee() is ${pips} pip${pips === 1 ? '' : 's'}, which is ${Number(p.bps.toFixed(4))} bps${since}.`;
}

// Easy's twin of protocolText: the same read, in everyday words.
function easyProtocol(p: FeeTrace['protocolFee']) {
  if (!p) return 'Its setting could not be read.';
  const pips = p.pips ?? Math.round(p.bps * 100);
  const since = p.sameSince ? `, and it has read the same at every check since at least ${Number(p.sameSince.slice(8, 10))} ${new Date(`${p.sameSince}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
  return `Its setting reads ${pips} pip${pips === 1 ? '' : 's'}, which is ${Number(p.bps.toFixed(4))} [[bps]]${since}.`;
}

// The buyback line follows DefiLlama's share and its burned flag: "all" only at 100.0%, the share otherwise, and no claim without a figure.
export function buybackPart(near: FeeTrace['nearRevenue']) {
  const b = near?.buyback;
  if (!near || b?.share == null) return { value: '—', text: 'The buyback share is not in the published file, so nothing is said about it here.', easy: 'The buyback share is not in the published file, so nothing is said about it here.' };
  const pct1 = Number((b.share * 100).toFixed(1));
  const burn = b.burned === false ? ' The bought NEAR is not burned (DefiLlama methodology).' : b.burned === true ? ' The bought NEAR is burned (DefiLlama methodology).' : '';
  const text = pct1 === 100
    ? `All of NEAR's captured Intents revenue over the same 30 days bought NEAR on the open market, as DefiLlama books it${b.since ? ` (buybacks began on ${dayName(b.since)} ${b.since.slice(0, 4)})` : ''}, so the buyback is the NEAR revenue above.${burn}`
    : `${pct1}% of NEAR's captured Intents revenue over the same 30 days bought NEAR on the open market, as DefiLlama books it, so the buyback is that share of the NEAR revenue above.${burn}`;
  const easyBurn = b.burned === false ? ' The NEAR bought back is kept, not destroyed.' : b.burned === true ? ' The NEAR bought back is destroyed (burned).' : '';
  const easy = `${pct1 === 100 ? 'All' : `${pct1}%`} of NEAR’s swap income over the same 30 days was used to buy NEAR back on the open market ([[buyback]]), as [[DefiLlama]] counts it${pct1 === 100 && b.since ? ` (buybacks began on ${dayName(b.since)} ${b.since.slice(0, 4)})` : ''}.${easyBurn}`;
  return { value: `${(near.bps * b.share).toFixed(1)} bps`, text, easy };
}

// S2: what a $10,000 swap costs, from the realised swaps of the last frozen chain days.
// Three states: `missing` (the file did not load), `empty` (the public bucket holds no measured swaps) and `split`. No sample figure exists to fall back on.
export function feeView(trace: FeeTrace | null) {
  const bucket = bucketOf(SIZE);
  const k = trace?.trace?.bySize[bucket];
  const g = k?.all;
  if (!trace) return { state: 'missing' as const };
  if (!g || g.allInBps == null || g.appFeeBps == null || g.protocolBps == null || g.spreadBps == null) {
    const c = k?.confidential;
    const when = `${dayName(trace.from)} to ${dayName(trace.to)}`;
    return {
      state: 'empty' as const,
      asOf: trace.to,
      lead: `No public swap of ${BUCKET_NAME[bucket]} could be split into its parts, ${when}.`,
      easyLead: `None of the public swaps of ${BUCKET_NAME[bucket]}, ${when}, could be split into their fees.`,
      easyBody: `The public record shows no swap of this size with a price on both sides, so there is nothing to split. That does not mean fewer people are swapping: swaps now settle in a private system, where fees and [[solvers|solver]] cannot be seen.${c?.allInBps != null ? ` Money of this size through the [[Treasury]] cost ${bps(c.allInBps)} all-in, over ${int(c.swaps)} paired flows; any fee inside is hidden.` : ''}`,
      body: `The chain shows no swap of this size priced on both sides, so there is nothing public to split into fees. That is not a fall in demand: swaps now settle on a private chain, where fees and solvers cannot be seen.${c?.allInBps != null ? ` Funds through the Confidential Intents treasury in this size cost ${bps(c.allInBps)} all-in, over ${int(c.swaps)} paired flows; any fee inside that is hidden.` : ''}`,
    };
  }
  const d = (b: number) => (b / 1e4) * SIZE;
  const span = `${dayName(trace.from)} to ${dayName(trace.to)}`;
  const size = BUCKET_NAME[bucket];
  const plainShare = g.grossUsd ? k.transfer.grossUsd / g.grossUsd : 0;
  const td = k.tokenDiff, plain = k.transfer, conf = k.confidential;
  const confShare = conf && g.grossUsd + conf.inUsd ? conf.inUsd / (g.grossUsd + conf.inUsd) : 0;
  const left = g.left;
  const near = trace.nearRevenue;
  const gap = trace.gapsInWindow ? ` ${trace.gapsInWindow} day${trace.gapsInWindow === 1 ? '' : 's'} in this span could not be read and ${trace.gapsInWindow === 1 ? 'is' : 'are'} left out.` : '';
  return {
    state: 'split' as const,
    total: usd(d(g.allInBps)),
    lead: `${usd(d(g.allInBps))} in total, ${bps(g.allInBps)} of what goes in, from ${int(g.swaps)} real public swaps of ${size} on chain, ${span}.`,
    easyLead: `On a $10,000 swap, about ${usd(d(g.allInBps))} less comes out than goes in: ${bps(g.allInBps)}. That is the average of ${int(g.swaps)} real public swaps of ${size}, ${span}.`,
    spreadNote: `${usd(d(g.protocolBps) + d(g.spreadBps))} Outside the App Fee`,
    spreadSub: `Protocol fee ${usd(d(g.protocolBps))} and solver spread with price noise ${usd(d(g.spreadBps))}`,
    // share = weight in the bar; minPx keeps a tiny part visible (the bar is not to scale for small parts).
    parts: [
      { key: 'app', value: usd(d(g.appFeeBps)), name: `App Fee, ${bps(g.appFeeBps)}`, share: Math.max(g.appFeeBps, 0), minPx: 0, text: `The fee a frontend takes, read on chain as a separate transfer from the user to a fee account. Only token_diff swaps show it (${td.appFeeBps != null ? bps(td.appFeeBps) : 'none'} on those). Plain transfer swaps, ${pct(plainShare)} of this public USD, show none, so any fee they charge sits in the rest below.`,
        easy: `The fee the app you swap in charges for itself, paid as a separate transfer you can see on the public record. Only one kind of swap shows it (${td.appFeeBps != null ? bps(td.appFeeBps) : 'none'} on those). Plain transfer swaps, ${pct(plainShare)} of this money, show none, so any fee they charge is hidden in the rest below.` },
      { key: 'withdraw', value: '—', name: 'Withdraw Fee, Not in These Swaps', share: 0, minPx: 0, text: 'Paid when funds leave intents.near for another chain, outside the swap itself, so the chain swaps here do not hold it.', easy: EASY_WITHDRAW },
      { key: 'protocol', value: usd(d(g.protocolBps)), name: `Protocol Fee, ${g.protocolBps.toFixed(2)} bps`, share: Math.max(g.protocolBps, 0), minPx: 2, text: `Charged by the intents.near contract on token_diff swaps: ${protocolText(trace.protocolFee)} It goes to the contract's fee collector${trace.protocolFee ? `, account ${trace.protocolFee.collector.slice(0, 8)}…${trace.protocolFee.collector.slice(-4)}` : ''}. Plain transfer swaps pay none.`,
        easy: `[[NEAR Intents|intents]]’ own fee, set in its code on the blockchain. ${easyProtocol(trace.protocolFee)} It goes to the contract’s fee account. Plain transfer swaps pay none.` },
      { key: 'unexplained', value: usd(d(g.spreadBps)), name: `Solver Spread, Unexplained Rest, ${bps(g.spreadBps)}`, share: Math.max(g.spreadBps, 0), minPx: 2, text: `What is left after the fees above: what the solver kept, any fee charged inside its price, and price movement within the hour (prices are hourly). On token_diff swaps alone it is ${td.spreadBps != null ? bps(td.spreadBps) : 'not measured'}; on plain transfer swaps ${plain.spreadBps != null ? bps(plain.spreadBps) : 'not measured'}. Shown, never hidden.`,
        easy: `Everything left after the fees above: what the [[solver]] who filled the swap kept, any fee hidden inside the price, and prices moving within the hour. On the swaps that show an app fee it is ${td.spreadBps != null ? bps(td.spreadBps) : 'not measured'}; on plain transfer swaps ${plain.spreadBps != null ? bps(plain.spreadBps) : 'not measured'}. Shown, never hidden.` },
      ...(conf?.allInBps != null
        ? [{ key: 'confidential', value: bps(conf.allInBps), name: 'Confidential Path, Reported Apart', share: 0, minPx: 0, text: `Not in the split above. Funds go to the Confidential Intents treasury, the swap settles on a private chain, and funds come back. From the two public edges, ${int(conf.swaps)} paired confidential flows of ${size} cost ${bps(conf.allInBps)} all-in; they are ${pct(confShare)} of the USD of this size. Any fee on this path is hidden, so none of it is called an app fee or a solver spread, and its app fee is not read as 0.`,
            easy: `Not in the split above. Money goes into the [[Treasury]], the swap happens out of public view, and the money comes back. ${int(conf.swaps)} such round trips of ${size} cost ${bps(conf.allInBps)} all-in, and they are ${pct(confShare)} of the money of this size. Any fee inside is hidden, so none of it is called an app fee, and the app fee is not counted as zero.` }]
        : []),
      near
        ? { key: 'revenue', value: `${near.bps.toFixed(1)} bps`, name: 'NEAR Revenue', share: 0, minPx: 0, text: `Part of the fees above, not on top of them. DefiLlama books ${near.bps.toFixed(1)} bps of Intents volume as NEAR revenue over the 30 days to ${dayName(near.to)}, all Intents. The chain does not show which fee account is NEAR's, so it can't be traced swap by swap.`,
          easy: `The part of the fees above that NEAR keeps, not an extra charge. [[DefiLlama]] counts ${near.bps.toFixed(1)} bps of all swap [[volume]] as NEAR’s income over the 30 days to ${dayName(near.to)}. The public record does not show which account is NEAR’s, so it cannot be traced swap by swap.` }
        : { key: 'revenue', value: '—', name: 'NEAR Revenue', share: 0, minPx: 0, text: 'The revenue figure is not in the published file.', easy: 'The revenue figure is not in the published file.' },
      { key: 'buyback', ...buybackPart(near), name: 'Buyback', share: 0, minPx: 0 },
    ],
    bannerText: `Anything the fees do not explain shows as "unexplained", never hidden. Left out and counted: ${int(left.notBothPriced.swaps)} swaps without a price on both sides, ${int(left.feeUnreadable.swaps)} with an app fee paid in a token the swap did not give, ${int(left.priceCheck.swaps)} that failed the price check. Swaps through the Confidential Intents treasury are not in this split.${gap}`,
    easyBanner: `Anything the fees do not explain is shown as “unexplained”, never hidden. Left out and counted: ${int(left.notBothPriced.swaps)} swaps without a price on both sides, ${int(left.feeUnreadable.swaps)} with an app fee paid in a token the swap did not give, and ${int(left.priceCheck.swaps)} that failed the price check. Swaps through the private system are not in this split.${gap}`,
    card: {
      value: bps(g.allInBps),
      label: `All-In Cost, ${size} Swaps`,
      text: `USD-weighted over ${int(g.swaps)} swaps, ${span}, against DefiLlama hourly prices. token_diff swaps ${td.allInBps != null ? bps(td.allInBps) : 'not measured'}, confidential path ${conf?.allInBps != null ? bps(conf.allInBps) : 'not measured'}, reported apart.`,
      easy: `The average over ${int(g.swaps)} swaps, ${span}, against [[DefiLlama]] hourly prices, with bigger swaps counting more. Swaps that show an app fee: ${td.allInBps != null ? bps(td.allInBps) : 'not measured'}; swaps through the private system: ${conf?.allInBps != null ? bps(conf.allInBps) : 'not measured'}, counted apart.`,
      source: `Chain days to ${dayName(trace.to)} ${trace.to.slice(0, 4)}. Open the Query`,
    },
    explain: `A $10,000 swap costs about ${usd(d(g.allInBps))}: ${bps(g.allInBps)} less value comes out than goes in, at DefiLlama hourly prices. It is the USD-weighted average of ${int(g.swaps)} real public swaps of ${size}, ${span}.`,
    easyExplain: `A $10,000 swap costs about ${usd(d(g.allInBps))}: ${bps(g.allInBps)} less value comes out than goes in, at DefiLlama hourly prices. It is the average of ${int(g.swaps)} real public swaps of ${size}, ${span}, with bigger swaps counting more.`,
    query: `Query: ${trace.query ?? 'feeTrace in analysis/realised_cost.mjs'}, published as data/published/fee_trace.json. Rules in PREREG.md section 7 and amendment A2.`,
    asOf: trace.to,
  };
}
