// Takes 1Click dry quotes on a fixed grid and returns them in memory, for the rolling panel. Nothing is written: a quote response is API data (terms 4.1(e)).
// Dry quotes sign nothing and move no funds. No JWT on purpose: a JWT removes the default fee, and this records what a default user is charged.
const USDC_ETH = 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near';
const PAIRS = [
  { name: 'BTC-USDC', asset: '1cs_v1:btc:native:coin', decimals: 8, symbol: 'BTCUSDT' },
  { name: 'ETH-USDC', asset: 'nep141:eth.omft.near', decimals: 18, symbol: 'ETHUSDT' },
  { name: 'SOL-USDC', asset: 'nep141:sol.omft.near', decimals: 9, symbol: 'SOLUSDT' },
  { name: 'NEAR-USDC', asset: 'nep141:wrap.near', decimals: 24, symbol: 'NEARUSDT' },
];
const SIZES_USD = [100, 1_000, 10_000, 100_000];
const MIN_GAP_MS = 5_200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bookMid(symbol, fetchFn) {
  const r = await fetchFn(`https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=${symbol}`);
  if (!r.ok) throw new Error(`binance ${symbol} ${r.status}`);
  const { bidPrice, askPrice } = await r.json();
  return { mid: (Number(bidPrice) + Number(askPrice)) / 2 };
}

function toBaseUnits(tokens, decimals) {
  const [whole, frac = ''] = tokens.toFixed(Math.min(decimals, 12)).split('.');
  return (BigInt(whole + frac) * 10n ** BigInt(decimals - frac.length)).toString();
}

async function quote(pair, amount, fetchFn) {
  const body = {
    dry: true, swapType: 'EXACT_INPUT', slippageTolerance: 100, originAsset: pair.asset, depositType: 'ORIGIN_CHAIN', destinationAsset: USDC_ETH, amount,
    recipient: '0x1111111111111111111111111111111111111111', recipientType: 'DESTINATION_CHAIN', refundTo: 'test.near', refundType: 'INTENTS',
    deadline: new Date(Date.now() + 3_600_000).toISOString(),
  };
  try {
    const r = await fetchFn('https://1click.chaindefuser.com/v0/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000),
    });
    return { http: r.status, response: await r.json() };
  } catch {
    return { http: 0, response: {} };
  }
}

// Sixteen quotes, 5.2 seconds apart, so this job never runs faster than the rate the terms allow.
export async function sampleQuotes({ fetchFn = fetch, gapMs = MIN_GAP_MS } = {}) {
  const { mid: usdcUsdtMid } = await bookMid('USDCUSDT', fetchFn);
  const rows = [];
  for (const pair of PAIRS) {
    const { mid } = await bookMid(pair.symbol, fetchFn);
    for (const sizeUsd of SIZES_USD) {
      if (rows.length) await sleep(gapMs);
      const { http, response } = await quote(pair, toBaseUnits(sizeUsd / mid, pair.decimals), fetchFn);
      rows.push({ sizeUsd, reference: { mid, usdcUsdtMid }, http, response });
    }
  }
  return rows;
}
