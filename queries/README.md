# BigQuery queries

Every query that fed this project, run in a BigQuery Sandbox project on the public dataset `bigquery-public-data.crypto_near_mainnet_us`. Each result is in `data/bigquery/` with its date and bytes scanned. Every query filters on `block_date`, which is the table's partition column.

| File | Result | Scanned | What it answers |
| --- | --- | --- | --- |
| `daily_transactions.sql` | `data/bigquery/daily_transactions.json` | 3.27 GB | Daily transactions to `intents.near`, and the accounts that signed them |
| `daily_contract_usage.sql` | `data/bigquery/daily_contract_usage.json` | 17.06 GB | Daily receipts, gas and NEAR burnt by `intents.near` |
| `elasticity_read.sql` | saved table `intents.swaps` | 817.88 GB | The one read of `intents.near` logs, 1 Oct 2025 to 3 Oct 2026 (PREREG.md A4) |
| `elasticity_days.sql` | `data/bigquery/elasticity_days.json` | 2.2 GB | One row per frontend per day from the saved table |

## The free tier

BigQuery gives 1 TB of scanning a month with no billing account. `elasticity_read.sql` alone takes 818 GB of that, so a reader can run it about once a month. The range starts on 1 Oct 2025 because a start of 1 Sep 2025 came to 927 GB, which would have passed a 950 GB budget.

Scanned in all on 7 Nov 2026, with checks and the one-day test on 15 Oct 2026: about 847 GB. `elasticity_days.sql` ran twice, because the console copies at most about 10,000 rows at a time.

## The weekly activity job

`daily_transactions.sql` and `daily_contract_usage.sql` re-run every Saturday in GitHub Actions (`.github/workflows/activity.yml`, `pipeline/activity_refresh.mjs`). The job moves their `block_date` range to the last 90 finished UTC days, writes the new dates into the two files, runs them with the repo's service account, and commits the files with their results. So the dates in these two files are always the dates of the stored result. It stores nothing if the newest day is missing or under a quarter of the week before it, which would mean BigQuery had not finished loading it. About 20 GB a run, about 88 GB a month. The Sandbox project has no billing account, so going over the free tier stops the query; it never costs money.

## Re-running

`npm run rebuild -- --bigquery` prints these steps. Use your own Google project and a dataset in `us-east1`, and change the project and dataset names at the top of the two elasticity files. Always read the byte estimate in the console before you run a query.
