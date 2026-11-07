# Tideline progress

## State (7 Nov 2026)

Built and committed locally. Readings as of the 6 Nov chain day: Q1 Neutral, Q2 Bullish, Q3 Not Measured, Q4 Neutral, Q5 Bullish, verdict Undecided on the A2 hold, score +3.

Checked locally on 7 Nov: `npm test` 244/244, `verify` ALL OK, `npm run build`, gitleaks over the full history, the wording scan, the API-data scan, Chrome at 1440 and 375 for every page and state (also with `EXPLORER_PANEL=off` on a production build, and the live panel from a real 30-day run, whose file was then deleted). `attest:check` MATCH on 2026-10-04, 2026-10-20 and 2026-11-03.

## Stage 2 (7 Nov 2026)

Public on GitHub. Passed in Actions on 7 Nov: `test` (tests, verify, build), gitleaks over the full history, `contract`, `refresh` (committed), `chain-day` (6 Nov already frozen, stopped), and `panel` (artifact kept one day; the log shows only progress lines). Treasury days 4 Oct to 6 Nov added; `npm run rebuild` left the readings as they were, and THESIS.md now gives the confidential share. This repo is now the only one that freezes, anchors and refreshes.

Gitleaks fails on the first push of a new repo (the action asks git for the root commit's parent); a hand-started run scans the full history and passed.

## Next

1. **Secrets (human).** `NEAR_ATTEST_ACCOUNT` (`tideline-thesis.testnet`), `NEAR_ATTEST_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Site and localhost: `GITHUB_DATA_TOKEN` (Contents read, Actions read).
2. **cron-job.org** points here, with the panel job added (docs/CRON.md), before 03:17 UTC 8 Nov. Otherwise start `chain-day` for 7 Nov by hand.
3. **First new day.** `chain-day` freezes 7 Nov, then `attest-days` anchors it with its treasury hash in the record.
4. **Full test** again in Chrome at 1440 and 375, then the final report.

Ticket 79934: if the answer is no, set `EXPLORER_PANEL=off`.

## Decisions made while building

- **Visibility: no line, no state.** Chain USD starts on 4 Oct 2026, which leaves 23 days and 17 overlapping ratios before 27 Oct, about 2.4 independent weeks. Too little to set a line (PREREG A3). The ratio is shown with its range. It also reads the other way up from a DefiLlama ÷ Explorer ratio: here a rise means the chain sees less. The Partial View state has no use without a line, so it is not in the site; the revenue split and the "covered" hero state are.
- **PREREG line 1** discloses the private analysis without its figure, because that figure came from API data (A3 rule 2). Removing the disclosure as well would have been misleading.
- **Masking check.** See docs/EXPLORER.md. `minUsdPrice` is honoured, on the input side only. A positive value removed no rows on the day checked, so no masking row was in the plain list. Same-token rows exist, pass every filter and carry app fees, so they need their own exclusion.
- **Treasury anchoring.** The contract keeps one write-once record a day, so the treasury file's hash rides in that record's `readings` string, with no contract change. Records already written can't gain it.
- **Treasury never a solver.** `isTreasury` now also matches a joined solver field.
- **BigQuery range.** From 1 Sep 2025 the read was 927 GB, which with 25 GB already spent would pass 950 GB. From 1 Oct 2025 it was 818 GB. Set by bytes alone.
- **Elasticity history** reads every token_diff entry with a referral, about 5% more swaps than the frozen census on the test day, with the same fee rates. USD uses the stablecoin side or that day's implied rate (PREREG A4).
- **`/api/days`** serves our own frozen chain days. There is no quotes route.
- **Sample figures are gone.** A file that does not load gives a real "did not load" state, and an empty public bucket has its own state (`/follow-the-fee/?state=empty`).
- **Panel rows stay in memory**, never in the runner's temp folder: stricter than needed, and simpler.

## Facts other files point to

- T3: flow moved from token_diff swaps to the Treasury on 28 to 30 Oct 2026. Transfer swaps were 48 to 541 a day until 27 Oct, 954 on 28 Oct, 4,514 on 29 Oct, and 13,208 on 3 Nov.
- A re-run of a frozen day matches its counts, not always its hash: DefiLlama can serve different hourly prices later (up to 0.03% of USD on 5 Nov).
- The census grows with Treasury traffic: 204k transactions on 5 Nov. `chain-day.yml` reads it in 4 parts, which fits about 800k.
- The GitHub schedule dropped most runs, so jobs are started from cron-job.org (docs/CRON.md).

## BigQuery budget

About 847 GB of 950 GB scanned on 7 Nov 2026 (`queries/README.md`). The free tier resets monthly. The saved table `tideline-check.intents.swaps` expires after 60 days, because the project is a Sandbox.

## Known limits

- `lib/mock.ts` keeps its file name, though it now holds only fixed site text and no figures.
- `pipeline/bigquery.mjs` is tested against a stand-in, not a live Google project.
- `events()` does not check that a dip4 log came from intents.near. The BigQuery read does.
- chain-backfill drops treasury files, so run treasury-backfill after it.
- On 16:10 laptops the header has no room for Open Model, so it stays in the hero.
