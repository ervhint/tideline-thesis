// Splits the all-in cost of a live 1Click dry quote into parts, for the rolling panel only. Pure: quote rows in, numbers out.
// All-in cost = how much less USDC comes out than the outside mid says the input is worth, in bps.
// App fee and withdraw fee are read from the quote itself. Whatever is left is "unexplained": mostly the solver spread, plus price movement.
const USDC_DECIMALS = 6;

export function traceQuote(row) {
  const q = row?.response?.quote;
  const ref = row?.reference;
  if (!q || !ref || row.http >= 400) return null;
  const fair = (Number(q.amountInFormatted) * ref.mid) / ref.usdcUsdtMid; // USDC the input is worth at the outside price
  const out = Number(q.amountOutFormatted);
  if (!(fair > 0) || !(out > 0)) return null;
  const allInBps = (1 - out / fair) * 1e4;
  const appFeeBps = (row.response.quoteRequest?.appFees ?? []).reduce((s, f) => s + f.fee, 0);
  const withdrawBps = ((Number(q.withdrawFee) / 10 ** USDC_DECIMALS) / fair) * 1e4;
  return { sizeUsd: row.sizeUsd, allInBps, appFeeBps, withdrawBps, unexplainedBps: allInBps - appFeeBps - withdrawBps };
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// One line per size: medians across the pairs quoted. A failed quote counts in `failed` and is never dropped silently.
export function quoteBreakdown(rows) {
  const sizes = new Map();
  for (const row of rows) {
    const g = sizes.get(row.sizeUsd) ?? { sizeUsd: row.sizeUsd, traces: [], failed: 0 };
    const t = traceQuote(row);
    if (t) g.traces.push(t); else g.failed++;
    sizes.set(row.sizeUsd, g);
  }
  return [...sizes.values()].sort((a, b) => a.sizeUsd - b.sizeUsd).map(({ sizeUsd, traces, failed }) => {
    if (!traces.length) return { sizeUsd, quotes: 0, failed };
    const mid = (k) => median(traces.map((t) => t[k]));
    return { sizeUsd, quotes: traces.length, failed, allInBps: mid('allInBps'), appFeeBps: mid('appFeeBps'), withdrawBps: mid('withdrawBps'), unexplainedBps: mid('unexplainedBps') };
  });
}
