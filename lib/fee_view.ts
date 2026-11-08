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
const EASY_WITHDRAW = 'You pay this only when you move money out to another blockchain. That’s a separate step, so these swaps don’t include it.';
const bucketOf = (usd: number) => (usd < 1000 ? '0-1k' : usd < 10000 ? '1k-10k' : usd < 100000 ? '10k-100k' : '100k+');
const BUCKET_NAME: Record<string, string> = { '0-1k': '$0 to $1k', '1k-10k': '$1k to $10k', '10k-100k': '$10k to $100k', '100k+': 'over $100k' };

const usd = (v: number) => (Math.abs(v) < 0.005 ? '< $0.01' : `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`);
const bps = (v: number) => `${v.toFixed(1).replace('-', '−')} bps`;
const int = (n: number) => n.toLocaleString('en-US');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const dayName = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// fee() as read from the chain each hour (pipeline/protocol_fee.mjs in the refresh job), never typed in.
// Easy's note on what the split leaves out (docs/PLAN.md §6h J2): one total, then each group that has swaps; a group at zero is not named.
export function easyLeftOut(left: Left, gap: string) {
  const swaps = (n: number) => `${int(n)} swap${n === 1 ? '' : 's'}`;
  const groups = [
    [left.notBothPriced.swaps, 'we couldn’t find a dollar price for one of the coins'],
    [left.feeUnreadable.swaps, 'we couldn’t read the app’s fee'],
    [left.priceCheck.swaps, 'the price looked wrong, because far more or far less came back than went in'],
  ].filter(([n]) => (n as number) > 0).map(([n, why]) => `for ${int(n as number)} ${why}`);
  const total = left.notBothPriced.swaps + left.feeUnreadable.swaps + left.priceCheck.swaps;
  const list = groups.length > 1 ? `${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}` : groups[0];
  const head = total
    ? `Not every swap fits the split above, and we’d rather show that than hide it. We left out ${swaps(total)}: ${list}.`
    : 'Every public swap here fits the split above, so none is left out.';
  return `${head} Private swaps aren’t here either, because nobody can see their fees.${gap}`;
}

export function protocolText(p: FeeTrace['protocolFee']) {
  if (!p) return 'the fee() rate could not be read.';
  const pips = p.pips ?? Math.round(p.bps * 100);
  const since = p.sameSince ? `, and it has read the same at every check since at least ${Number(p.sameSince.slice(8, 10))} ${new Date(`${p.sameSince}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
  return `fee() is ${pips} pip${pips === 1 ? '' : 's'}, which is ${Number(p.bps.toFixed(4))} bps${since}.`;
}

// Easy's twin of protocolText: the same read, in everyday words.
function easyProtocol(p: FeeTrace['protocolFee']) {
  if (!p) return 'We couldn’t read its setting.';
  const pips = p.pips ?? Math.round(p.bps * 100);
  const since = p.sameSince ? `, and it has read the same at every check since at least ${Number(p.sameSince.slice(8, 10))} ${new Date(`${p.sameSince}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : '';
  return `Its setting reads ${pips} pip${pips === 1 ? '' : 's'}, which is ${Number(p.bps.toFixed(4))} [[bps]]${since.replace(', and it has read the same at every check', ', and it hasn’t changed at any check')}.`;
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
  const easy = `NEAR used ${pct1 === 100 ? 'all' : `${pct1}%`} of that income over the same 30 days to buy NEAR back on the open market. That’s called a [[buyback]], and the figures come from [[DefiLlama]].${pct1 === 100 && b.since ? ` Buybacks began on ${dayName(b.since)} ${b.since.slice(0, 4)}.` : ''}${easyBurn}`;
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
      easyBody: `The public record shows no swap of this size with a price on both sides, so there is nothing to split. That does not mean fewer people are swapping: swaps now settle in a private system, where fees and traders ([[solvers|solver]]) cannot be seen.${c?.allInBps != null ? ` Money of this size through the [[Treasury]] cost ${bps(c.allInBps)} all-in, over ${int(c.swaps)} paired flows; any fee inside is hidden.` : ''}`,
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
    easyLead: `Swap $10,000 and you get about ${usd(d(g.allInBps))} less back (${g.allInBps.toFixed(1)} [[bps]]). We worked that out from ${int(g.swaps)} real public swaps of ${size}, ${span}.`,
    easyTitle: `Where the ${usd(d(g.allInBps))} Goes`,
    easyBelow: `${bps(g.allInBps)} less than the market price`,
    spreadNote: `${usd(d(g.protocolBps) + d(g.spreadBps))} Outside the App Fee`,
    spreadSub: `Protocol fee ${usd(d(g.protocolBps))} and solver spread with price noise ${usd(d(g.spreadBps))}`,
    easySpreadNote: `${usd(d(g.protocolBps) + d(g.spreadBps))} Not From the App`,
    easySpreadSub: `NEAR Intents’ own fee ${usd(d(g.protocolBps))}, and ${usd(d(g.spreadBps))} to the trader or price moves`,
    // share = weight in the bar; minPx keeps a tiny part visible (the bar is not to scale for small parts).
    parts: [
      { key: 'app', value: usd(d(g.appFeeBps)), name: `App Fee, ${bps(g.appFeeBps)}`, share: Math.max(g.appFeeBps, 0), minPx: 0, text: `The fee a frontend takes, read on chain as a separate transfer from the user to a fee account. Only fee-tagged swaps (logged as token_diff, which name the frontend and its fee) show it: ${td.appFeeBps != null ? bps(td.appFeeBps) : 'none'} on those. Plain transfer swaps, ${pct(plainShare)} of this public USD, carry no fee record, so any fee they charge sits in the rest below.`,
        easyName: `The App’s Fee, ${bps(g.appFeeBps)}`,
        easy: `The app you used to swap keeps this for itself. We can see it because it’s paid as its own transfer, but only on one kind of swap (${td.appFeeBps != null ? bps(td.appFeeBps) : 'none'} on those). The other kind, ${pct(plainShare)} of this money, shows no fee, so whatever those apps charge ends up in the leftover below.` },
      { key: 'withdraw', value: '—', name: 'Withdraw Fee, Not in These Swaps', easyName: 'Withdraw Fee, Not Here', share: 0, minPx: 0, text: 'Paid when funds leave intents.near for another chain, outside the swap itself, so the chain swaps here do not hold it.', easy: EASY_WITHDRAW },
      { key: 'protocol', value: usd(d(g.protocolBps)), name: `Protocol Fee, ${g.protocolBps.toFixed(2)} bps`, share: Math.max(g.protocolBps, 0), minPx: 2, text: `Charged by the intents.near contract on fee-tagged swaps: ${protocolText(trace.protocolFee)} It goes to the contract's fee collector${trace.protocolFee ? `, account ${trace.protocolFee.collector.slice(0, 8)}…${trace.protocolFee.collector.slice(-4)}` : ''}. Plain transfer swaps pay none.`,
        easyName: `NEAR Intents’ Own Fee, ${g.protocolBps.toFixed(2)} bps`,
        easy: `A tiny fee built into [[NEAR Intents|intents]]’ code. ${easyProtocol(trace.protocolFee)} It goes to NEAR Intents’ fee account, and only one kind of swap pays it.` },
      { key: 'unexplained', value: usd(d(g.spreadBps)), name: `Solver Spread, Unexplained Rest, ${bps(g.spreadBps)}`, share: Math.max(g.spreadBps, 0), minPx: 2, text: `What is left after the fees above: what the solver kept, any fee charged inside its price, and price movement within the hour (prices are hourly). On fee-tagged swaps alone it is ${td.spreadBps != null ? bps(td.spreadBps) : 'not measured'}; on plain transfer swaps ${plain.spreadBps != null ? bps(plain.spreadBps) : 'not measured'}.${[td.spreadBps, plain.spreadBps].some((v) => v != null && v < 0) ? ' A negative figure means users got slightly more than the hourly reference price: price movement within the hour.' : ''} Shown, never hidden.`,
        easyName: `What’s Left, ${bps(g.spreadBps)}`,
        easy: `Everything we can’t pin to a named fee: what the trader ([[solver]]) who filled the swap kept, any fee tucked into the price, and prices moving during the hour we measure. It’s ${td.spreadBps != null ? bps(td.spreadBps) : 'not measured'} on swaps that show an app fee and ${plain.spreadBps != null ? bps(plain.spreadBps) : 'not measured'} on the others.${[td.spreadBps, plain.spreadBps].some((v) => v != null && v < 0) ? ' A minus means people got back slightly more than the market price.' : ''}` },
      ...(conf?.allInBps != null
        ? [{ key: 'confidential', value: bps(conf.allInBps), name: 'Confidential Path, Reported Apart', share: 0, minPx: 0, text: `Not in the split above. Funds go to the Confidential Intents treasury, the swap settles on a private chain, and funds come back. Matching each deposit into the treasury with the funds that came back out, ${int(conf.swaps)} round trips of ${size} cost ${bps(conf.allInBps)} all-in; they are ${pct(confShare)} of the USD of this size. Any fee on this path is hidden, so none of it is called an app fee or a solver spread, and its app fee is not read as 0.`,
            easyName: 'Private Swaps, Counted Apart',
            easy: `These aren’t in the split above. The money goes through the doorway into the private system ([[Treasury]]), the swap happens out of sight, and the money comes back. ${int(conf.swaps)} of these round trips of ${size} cost ${bps(conf.allInBps)} in total, and they carry ${pct(confShare)} of the money at this size. We can’t see the fees inside, so we don’t guess them.` }]
        : []),
      near
        ? { key: 'revenue', value: `${near.bps.toFixed(1)} bps`, name: 'NEAR Revenue', share: 0, minPx: 0, text: `Part of the fees above, not on top of them. DefiLlama books ${near.bps.toFixed(1)} bps of Intents volume as NEAR revenue over the 30 days to ${dayName(near.to)}, all Intents. The chain does not show which fee account is NEAR's, so it can't be traced swap by swap.`,
          easyName: 'NEAR’s Cut',
          easy: `The part of the fees above that NEAR keeps. It’s not an extra charge. [[DefiLlama]] counts it as ${near.bps.toFixed(1)} bps of all the money swapped over the 30 days to ${dayName(near.to)}. We can’t tell which account is NEAR’s, so we can’t follow it swap by swap.` }
        : { key: 'revenue', value: '—', name: 'NEAR Revenue', easyName: 'NEAR’s Cut', share: 0, minPx: 0, text: 'The revenue figure is not in the published file.', easy: 'The revenue figure is not in the published file.' },
      { key: 'buyback', ...buybackPart(near), name: 'Buyback', share: 0, minPx: 0 },
    ],
    bannerText: `Anything the fees do not explain shows as "unexplained", never hidden. Left out and counted: ${int(left.notBothPriced.swaps)} swaps without a price on both sides, ${int(left.feeUnreadable.swaps)} with an app fee paid in a third token that could not be valued, ${int(left.priceCheck.swaps)} that failed the price check (output far from the input's value). Swaps through the Confidential Intents treasury are not in this split.${gap}`,
    easyBanner: easyLeftOut(left, gap),
    card: {
      value: bps(g.allInBps),
      label: `All-In Cost, ${size} Swaps`,
      easyLabel: `Total Cost, ${size} Swaps`,
      easyNote: `${usd(d(g.allInBps))} on a $${SIZE.toLocaleString('en-US')} swap`,
      text: `USD-weighted over ${int(g.swaps)} swaps, ${span}, against DefiLlama hourly prices. Fee-tagged swaps ${td.allInBps != null ? bps(td.allInBps) : 'not measured'}, confidential path ${conf?.allInBps != null ? bps(conf.allInBps) : 'not measured'}, reported apart.`,
      easy: `An average of ${int(g.swaps)} swaps, ${span}, priced against [[DefiLlama]]’s hourly prices, where bigger swaps count more. Swaps that show an app fee cost ${td.allInBps != null ? bps(td.allInBps) : 'an amount we couldn’t measure'}. Private swaps cost ${conf?.allInBps != null ? bps(conf.allInBps) : 'an amount we couldn’t measure'} and are counted separately.`,
      source: `Chain days to ${dayName(trace.to)} ${trace.to.slice(0, 4)}. Open the Query`,
    },
    explain: `A $10,000 swap costs about ${usd(d(g.allInBps))}: ${bps(g.allInBps)} less value comes out than goes in, at DefiLlama hourly prices. It is the USD-weighted average of ${int(g.swaps)} real public swaps of ${size}, ${span}.`,
    easyExplain: `A $10,000 swap costs about ${usd(d(g.allInBps))}: that’s how much less comes out than goes in (${bps(g.allInBps)}), using [[DefiLlama]]’s hourly prices. It’s the average of ${int(g.swaps)} real public swaps of ${size}, ${span}, with bigger swaps counting more.`,
    query: 'Query: feeTrace in analysis/realised_cost.mjs over data/chain/*.jsonl, published as data/published/fee_trace.json. Rules in PREREG.md section 7 and amendment A2.',
    easyQuery: 'We worked this out from the public swap records we save each day. Open the Query to see the exact steps.',
    asOf: trace.to,
  };
}
