-- Daily transactions sent to intents.near, and the accounts that signed them. 90 finished UTC days.
-- Signers are mostly relayers and solvers: a user signs an intent inside the transaction, so this is not a count of users.
SELECT
  block_date,
  COUNT(*) AS transactions,
  COUNT(DISTINCT signer_account_id) AS active_accounts
FROM `bigquery-public-data.crypto_near_mainnet_us.transactions`
WHERE block_date BETWEEN '2026-08-16' AND '2026-11-13'
  AND receiver_account_id = 'intents.near'
GROUP BY block_date
ORDER BY block_date
