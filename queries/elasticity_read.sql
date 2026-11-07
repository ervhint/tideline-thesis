-- The one saved read of intents.near logs (PREREG.md amendment A4). Every token_diff entry with a referral, kept as a small table.
-- About 818 GB of the BigQuery free tier's 1 TB a month: run it once. Replace the project and dataset with your own (dataset in us-east1).
-- A fee is a dip4 transfer by the same account in the same log row: tested on 15 Oct 2026 against the frozen chain day.
CREATE OR REPLACE TABLE `tideline-check.intents.swaps` AS
WITH r AS (
  SELECT
    block_date,
    ARRAY(
      SELECT SAFE.PARSE_JSON(SUBSTR(l.element, 12), wide_number_mode => 'round')
      FROM UNNEST(logs.list) l
      WHERE STARTS_WITH(l.element, 'EVENT_JSON:') AND l.element LIKE '%dip4%'
    ) AS ev
  FROM `bigquery-public-data.crypto_near_mainnet_us.execution_outcomes`
  WHERE block_date BETWEEN '2025-10-01' AND '2026-10-03'
    AND executor_account_id = 'intents.near'
)
SELECT
  block_date,
  JSON_VALUE(x, '$.referral') AS referral,
  TO_JSON_STRING(JSON_QUERY(x, '$.diff')) AS diff,
  ARRAY(
    SELECT TO_JSON_STRING(JSON_QUERY(t, '$.tokens'))
    FROM UNNEST(ev) e2, UNNEST(JSON_QUERY_ARRAY(e2, '$.data')) t
    WHERE JSON_VALUE(e2, '$.event') = 'transfer'
      AND JSON_VALUE(t, '$.account_id') = JSON_VALUE(x, '$.account_id')
  ) AS fee_tokens
FROM r, UNNEST(ev) e, UNNEST(JSON_QUERY_ARRAY(e, '$.data')) x
WHERE JSON_VALUE(e, '$.event') = 'token_diff'
  AND JSON_VALUE(x, '$.referral') IS NOT NULL
