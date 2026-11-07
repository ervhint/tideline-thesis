-- One row per frontend per day from the saved table (PREREG.md amendment A4): swaps, the daily fee under section 3, USD, and the exact cost of stablecoin-to-stablecoin swaps.
-- A frontend-day under 10 swaps cannot have a daily fee, so its USD joins the `_rest` row: it counts in the control and is never a frontend.
-- Reads about 1.5 GB. Replace the project and dataset with your own.
CREATE TEMP FUNCTION fee_bps(diff STRING, fees ARRAY<STRING>) RETURNS FLOAT64 LANGUAGE js AS r'''
  const d = JSON.parse(diff), give = {};
  for (const [t, v] of Object.entries(d)) if (String(v).startsWith("-")) give[t] = Number(String(v).slice(1));
  if (!fees || !fees.length) return 0;
  let b = 0;
  for (const s of fees) for (const [t, v] of Object.entries(JSON.parse(s))) {
    if (give[t] === undefined) return null;
    b += Number(v) / (give[t] + Number(v)) * 1e4;
  }
  return Math.round(b * 10) / 10;
''';
CREATE TEMP FUNCTION legs(diff STRING) RETURNS STRUCT<give STRING, give_raw FLOAT64, got STRING, got_raw FLOAT64> LANGUAGE js AS r'''
  const o = {give: null, give_raw: null, got: null, got_raw: null};
  for (const [t, v] of Object.entries(JSON.parse(diff))) {
    const s = String(v);
    if (s.startsWith("-")) { if (!o.give) { o.give = t; o.give_raw = Number(s.slice(1)); } }
    else if (!o.got) { o.got = t; o.got_raw = Number(s); }
  }
  return o;
''';
WITH stable AS (
  SELECT tok FROM UNNEST([
    'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
    'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near',
    'nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near',
    'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
    'nep141:sol-c800a4bd850783ccb82c2b2c7e84175443606352.omft.near',
    'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
    'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
    'nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near',
    'nep141:usdt.tether-token.near'
  ]) tok
),
s AS (SELECT block_date, referral, fee_bps(diff, fee_tokens) AS fee, legs(diff) AS l FROM `tideline-check.intents.swaps`),
f AS (SELECT s.*, l.give IN (SELECT tok FROM stable) AS gs, l.got IN (SELECT tok FROM stable) AS os FROM s),
p AS (
  SELECT block_date, tok, SAFE_DIVIDE(SUM(usd), SUM(raw)) AS px FROM (
    SELECT block_date, l.give AS tok, l.give_raw AS raw, l.got_raw / 1e6 AS usd FROM f WHERE os AND NOT gs
    UNION ALL
    SELECT block_date, l.got, l.got_raw, l.give_raw / 1e6 FROM f WHERE gs AND NOT os
  ) GROUP BY 1, 2
),
v AS (
  SELECT f.*,
    CASE WHEN gs THEN l.give_raw / 1e6 WHEN os THEN l.got_raw / 1e6 ELSE COALESCE(l.give_raw * pg.px, l.got_raw * po.px) END AS vol
  FROM f
  LEFT JOIN p pg ON pg.block_date = f.block_date AND pg.tok = l.give
  LEFT JOIN p po ON po.block_date = f.block_date AND po.tok = l.got
),
fees AS (
  SELECT block_date, referral, CAST(ROUND(fee) AS INT64) AS bps, COUNT(*) AS c
  FROM v WHERE fee IS NOT NULL GROUP BY 1, 2, 3
),
top AS (
  SELECT block_date, referral,
    ARRAY_AGG(STRUCT(bps, c) ORDER BY c DESC, bps ASC LIMIT 1)[OFFSET(0)] AS t,
    SUM(c) AS with_fee
  FROM fees GROUP BY 1, 2
),
day_ref AS (
  SELECT block_date, referral,
    COUNT(*) AS n,
    COUNTIF(vol IS NULL) AS unpriced,
    SUM(vol) AS vol,
    COUNTIF(gs AND os AND fee IS NOT NULL) AS np,
    SUM(IF(gs AND os AND fee IS NOT NULL, l.give_raw / 1e6, 0)) AS in_usd,
    SUM(IF(gs AND os AND fee IS NOT NULL, l.got_raw / 1e6, 0)) AS out_usd,
    SUM(IF(gs AND os AND fee IS NOT NULL, l.give_raw / 1e6 / (1 - fee / 1e4), 0)) AS gross_usd
  FROM v GROUP BY 1, 2
)
SELECT
  d.block_date AS day,
  IF(d.n >= 10, d.referral, '_rest') AS ref,
  SUM(d.n) AS n,
  SUM(d.unpriced) AS unpriced,
  ROUND(SUM(d.vol), 2) AS vol,
  ANY_VALUE(IF(d.n >= 10 AND t.t.c / t.with_fee >= 0.7, t.t.bps, NULL)) AS fee,
  SUM(IF(d.n >= 10, d.np, 0)) AS np,
  ROUND(SUM(IF(d.n >= 10, d.in_usd, 0)), 2) AS in_usd,
  ROUND(SUM(IF(d.n >= 10, d.out_usd, 0)), 2) AS out_usd,
  ROUND(SUM(IF(d.n >= 10, d.gross_usd, 0)), 2) AS gross_usd
FROM day_ref d
LEFT JOIN top t USING (block_date, referral)
GROUP BY 1, 2
ORDER BY 1, 2
