-- Daily use of the intents.near contract: receipts it executed, gas burnt and NEAR burnt as gas. 90 finished UTC days.
SELECT
  block_date,
  COUNT(*) AS receipts,
  ROUND(SUM(gas_burnt) / 1e12) AS tgas_burnt,
  ROUND(SUM(tokens_burnt) / 1e24, 3) AS near_burnt
FROM `bigquery-public-data.crypto_near_mainnet_us.execution_outcomes`
WHERE block_date BETWEEN '2026-08-09' AND '2026-11-06'
  AND executor_account_id = 'intents.near'
GROUP BY block_date
ORDER BY block_date
