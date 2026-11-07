# Tideline progress

Phase: P7 Test + ship (workflow V12). Next gate: G6 (user acceptance). Waiting for user: yes, on the Telegram question below.
Repo: `ervhint/tideline-thesis` (public) · Contract: `tideline-thesis.testnet` · App: localhost:3115 until G6, then Vercel.

## State (7 Nov 2026, 19:30 WIB)

Readings as of the 6 Nov chain day: Q1 Neutral, Q2 Bullish, Q3 Not Measured, Q4 Neutral, Q5 Bullish, verdict Undecided on the A2 hold, score +3. Treasury carried 74% of counted USD over 31 Oct to 6 Nov.

Checked locally on 7 Nov: `npm test` 244/244, `verify` ALL OK, `npm run build`, gitleaks over the full history, the wording scan, the API-data scan, Chrome at 1440 and 375 for every page and state (also with `EXPLORER_PANEL=off` on a production build). `attest:check` MATCH on 2026-10-04, 2026-10-20 and 2026-11-03.

Passed in GitHub Actions on 7 Nov: `test` (tests, verify, build), gitleaks over the full history, `contract`, `refresh` (committed), `chain-day` (6 Nov already frozen, stopped), `panel` (artifact kept one day; the log shows only progress lines). Treasury days 4 Oct to 6 Nov are in `data/treasury/`; `npm run rebuild` left the readings as they were.

**Setup done:**
- Repo secrets: `INTENTS_EXPLORER_JWT`, `NEAR_ATTEST_ACCOUNT`, `NEAR_ATTEST_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- cron-job.org: four jobs start this repo's workflows (docs/CRON.md): chain-day 10:17 and 13:17 WIB, attest-days 12:41 and 15:41, refresh hourly at :23, panel 09:07. The `tideline-cron` token covers this repo; a test run of refresh returned 204 and passed.
- This repo is the only one that freezes, anchors and refreshes.
- Localhost: `GITHUB_DATA_TOKEN` (Contents and Actions read) is in `.env`, so pages and the panel read from GitHub. Checked: the panel shows on Follow the Fee and Concentration.

**Watch out:**
- A terminal that ran a local panel test may still hold `PANEL_FILE`. The site then reads only that file and shows "Rolling Panel: Not Available". Start the dev server from a fresh terminal.
- Gitleaks in Actions fails on a repo's first push (no parent for the root commit); a hand-started `test` run scans the full history.
- Telegram alerts only a failed `chain-day`. refresh messages only when a reading changes side; attest-days and panel send nothing. Failures there show as red runs, plus GitHub and cron-job.org emails.

## Next

1. **Decide (user):** add Telegram failure alerts to attest-days, refresh and panel (job name and run link only, no figures)?
2. **8 Nov, after 12:41 WIB:** check that chain-day froze 7 Nov and attest-days anchored it with its treasury hash in the record (`attest:check` on 2026-11-07). Check the 09:07 panel run.
3. **P7a test:** full Chrome test of every page and state at 1440 and 375 (docs/TESTS.md), `/code-review` and `spec-review`, fix what fails.
4. **G6:** the user clicks through on localhost and reviews the look (the beautification pass). Layout changes need the user's yes (design references are exact).
5. **P7b ship (G7):** Vercel Preview, then Production, with `GITHUB_DATA_TOKEN` set on Vercel (and `EXPLORER_PANEL=off` if ticket 79934 says no). Then README demo link, pitch outline, demo script, demo video, final report.

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
