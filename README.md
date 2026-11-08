# Tideline

A re-runnable investment thesis for NEAR, built on NEAR Intents fee data. Research, not financial advice.

> **Why the Explorer data is only in the rolling panel.** The track asks for swap volume from the NEAR Intents Explorer API. Its terms ([1ClickSwap API Terms of Use](https://partners.near-intents.org/legal/terms-of-service), Section 4.1(e)) do not allow storing API data for more than 24 hours, so Tideline shows it only in a panel that is rebuilt each day and kept for one day. The thesis and the verdict use stored public data (BigQuery, chain reads, DefiLlama) that anyone can re-run.

**Read the argument in [THESIS.md](THESIS.md).** It is written from the published files by `pipeline/build_thesis_md.mjs`, so its figures always match the site. The rules, written down before the results they govern, are in [PREREG.md](PREREG.md).

## The problem

NEAR spends its share of Intents fees buying NEAR on the open market. Whether that can ever cover new issuance depends on numbers that are hard to check: public sources disagree, the best per-swap data can't legally be kept, and since 27 Oct 2026 swaps have been moving to a private chain that public indexers cannot see.

So a thesis built on public data is losing the data it reads. Tideline says so instead of reading what is left as if it were the whole market. A fall in public numbers is never described as a fall in demand.

## The confidential shift

Account `51e8f94d…7cbe` looks like the largest solver. It is the Confidential Intents treasury: funds sent to it move to `intents.far`, the swap settles there out of public view, and funds come back. It is a bridge, so it is never counted as a solver.

- Solver Competition reads Not Measured while the Treasury holds over 50% of counted USD.
- While it does, the verdict is held at Undecided whatever the score, so a loss of data can't move it.
- Follow the Fee splits public swaps only. The confidential path has its own line, with the all-in cost.

What cannot be seen: fees on confidential swaps, solver identity, and any flow that stays shielded.

## Data sources

| Piece | Source | Stored here? |
| --- | --- | --- |
| Frontends, fees, solvers: a year of history for elasticity | BigQuery `crypto_near_mainnet_us` and chain data | Yes, `data/bigquery/`, `data/chain/` |
| Treasury flow and confidential share | `intents.near` dip4 logs (FastNEAR, NEAR RPC) | Yes, `data/treasury/` |
| V*, revenue, volume, prices | DefiLlama | Yes, `data/snapshot/`, `data/published/` |
| Active accounts, transactions, contract use | BigQuery | Yes, `data/bigquery/` |
| Frontends and fees since 27 Oct | Intents Explorer API | **No. Rolling panel only** |
| Current quote breakdown | 1Click dry quotes | **No. Rolling panel only** |

## What updates on its own

Every job runs in GitHub Actions, started by cron-job.org ([docs/CRON.md](docs/CRON.md)), and commits only after `npm run verify` passes.

| Job | When (WIB) | What it updates |
| --- | --- | --- |
| `refresh` | every hour | DefiLlama volume, fees and revenue, NEAR price and supply, the intents.near protocol fee, token names, then every published file and THESIS.md |
| `chain-day` | daily, 10:17 | Freezes yesterday's chain day and treasury file |
| `attest-days` | daily, 12:41 | Records each frozen day's hash on NEAR testnet |
| `panel` | daily, 09:07 | The rolling panel (a one-day artifact, never committed) |
| `activity` | weekly, Saturday 11:41 | Re-runs the two BigQuery activity queries for the last 90 days |

Fixed on purpose: the year of fee-change history before 3 Oct 2026 (one BigQuery read, frozen by PREREG.md amendment A4) and the pre-registered lines.

## What is kept, what is not, and why

A re-runnable thesis has to keep its inputs, so everything stored here is public chain data or a keyless public source that anyone may store.

The Explorer and 1Click APIs are different. Their terms (1ClickSwap API Terms, updated 7 Oct 2026) bar keeping their data past 24 hours, so nothing from them is in git, `data/`, `thesis.json`, a log or a message: not raw, not summed, and not typed into a document. Instead a rolling panel is re-pulled once a day, kept as a one-day artifact, shown beside the readings, and never used to set one. Past 24 hours it reads "Not Available". See [docs/EXPLORER.md](docs/EXPLORER.md). Intents Technology is the technology provider of these APIs; nothing here is endorsed by it.

The panel is optional. `EXPLORER_PANEL=off` removes it and its job, and the site still passes every test.

## Re-run it

You need Node 24. No key, no account, about a minute.

```bash
npm ci
```

```bash
npm run verify
```

`verify` recomputes every published number from the stored data and diffs it against the committed file. It ends in `ALL OK`.

```bash
npm run rebuild
```

This recomputes every chart from stored public data.

```bash
npm run rebuild -- --bigquery
```

This re-runs the SQL in [queries/](queries/) with your own Google project: set `GOOGLE_PROJECT` and `GOOGLE_ACCESS_TOKEN`. It dry-runs each query and refuses anything over 30 GB. The log read is about 818 GB of the free tier's 1 TB a month, so it runs only with `--read --max-gb 900`. Read [queries/README.md](queries/README.md) first.

```bash
npm run panel
```

This prints the rolling panel with your own `INTENTS_EXPLORER_JWT`, and writes nothing to the repo.

```bash
npm run attest:check -- 2026-11-03
```

This compares a frozen day with its hash on NEAR testnet.

```bash
npx next dev -p 3112
```

This runs the site.

## The contract

`contract/` is a small NEAR contract, deployed on testnet as `tideline-thesis.testnet`. It records one write-once hash per day. A day's record also carries the hash of that day's treasury file, for records written from 8 Nov 2026; earlier records can't gain it, because a record is never changed. Testnet only: no mainnet, no funds. Details in `contract/deployment.json`.

## For machines

- `GET /api/thesis.json`: the verdict, readings, V* and text, as published.
- `GET /api/days`: every frozen chain day with its size and SHA-256.
- `GET /api/days/<YYYY-MM-DD>`: one frozen day, byte for byte.
- `GET /api/attest/<YYYY-MM-DD>`: that day's hash on testnet against the file.
- `GET /api/status`: last frozen day, freshness, and the hash of the published numbers.

No route serves the panel. Published files are in `data/published/`, each with its `source` and `query`. Rules for agents are in [AGENTS.md](AGENTS.md).

## Limits

- It is not blind, and `PREREG.md` says what was known when each rule was written.
- Elasticity is underpowered: the interval is too wide to read a side.
- DefiLlama's figures come from a dataset nobody can re-run for free, so they are stored as evidence, not recomputed.
- How DefiLlama counts private volume is not known.
- A re-run from scratch matches a frozen day's counts, not always its hash, because DefiLlama can serve slightly different hourly prices later.
- History starts on 1 Oct 2025, set by the free BigQuery tier.
- "Active accounts" counts transaction signers, mostly relayers and solvers, not users.

MIT licence.
