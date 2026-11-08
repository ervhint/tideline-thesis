# Tideline progress

Phase: P7 Test + ship (workflow V12). Next unit: T6i Easy and Pro (§6g). Next gate: G6 (user acceptance). Waiting for user: yes, on the Telegram question below.
Repo: `ervhint/tideline-thesis` (public) · Contract: `tideline-thesis.testnet` · App: localhost:3112 (AGENTS.md) until G6, then Vercel.

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
3. **T6g and T6h are on main** (`4796d56`, 8 Nov). Left: T-T6h.5, the next hourly refresh in Actions, and a Chrome check at 375 px.
4. (T6h done in the same chat as T6g, at the human's request.)
5. **T6i Easy and Pro, next unit** (own chat, Opus 5.5 · high). Spec: docs/PLAN.md §6g. Tests: docs/TESTS.md T-T6i.1 to .12. Agreed with the human 8 Nov: an Easy / Pro switch on every page, Pro the default, Easy words built from the data, tap-to-explain notes. Start by asking the five §6g questions with mockups; build nothing before the answers. `BEGINNER.md` (repo root, uncommitted, written 8 Nov) is a draft for the Easy wording, and its fate is question 5. Do it before P7a, so the full test covers both modes.
6. **P7a test:** full Chrome test of every page and state at 1440 and 375 (docs/TESTS.md), `/code-review` and `spec-review`, fix what fails.
7. **G6:** the user clicks through on localhost and reviews the look (the beautification pass). Layout changes need the user's yes (design references are exact).
8. **P7b ship (G7):** Vercel Preview, then Production, with `GITHUB_DATA_TOKEN` set on Vercel (and `EXPLORER_PANEL=off` if ticket 79934 says no). Then README demo link, pitch outline, demo script, demo video, final report.

Ticket 79934: if the answer is no, set `EXPLORER_PANEL=off`.

## Units ready for review: T6g Words follow the numbers, T6h THESIS.md follows the data

Built in one chat on 8 Nov at the human's request (an exception to one unit per chat). Status: **on main** (`4796d56`, 8 Nov); `test` passed in Actions (tests, verify, build, gitleaks). After the push, localhost shows Method's Cumulative Volume ($29.5B, "matches the public part, within 1%") and the Buyback line from the data. `npm test` 276/276 (also with `EXPLORER_PANEL=off`), `npm run rebuild` then `verify` ALL OK, `next build`, gitleaks on every changed file, wording scan clean.

### T6g (§6e, T-T6g.1 to .9)

- **G1** Cumulative Volume: `build_reconciliation.mjs` passes DefiLlama daily volume; Ours is $29.5B for 1 Sep 2025 to 21 Sep 2026, and the sentence is picked by distance from the source's public part (within 5% matches, otherwise how far, no total no claim). **G2** Buyback: `fee_trace.json` `nearRevenue.buyback` is now `{ share, burned, since }` from model_inputs; the line says "all" only at 100.0%, its value is revenue × share. **G3** "So few days" only while the days since 27 Oct are fewer than the 30 before (`splitSentence` in `lib/model.ts`). **G4** email sentence in the past tense. **G5** card year from `trace.to`.
- **G6** `lib/typed_text.test.mjs`: the allow-list, each entry with a kind and reason; also scans `analysis/thesis_md.mjs`. T-T6g.8 compares against measured (non-whole) values only, because counts and the fixed `line` and `priceBand` coincide by chance; it catches exact copies, and a rounded copy fails the allow-list instead.
- **Also fixed:** Method said treasury files "are not anchored"; it now says anchors from 8 Nov 2026 carry the file hash. A straight apostrophe in that sentence broke the page in dev; fixed and `next build` passes.
- **T-T6g.9 partial:** localhost reads published files from GitHub, so Method's Cumulative Volume ("Not available") and the Buyback line ("not in the published file", the safe fallback for the old string field) show main's data until the push. The 375 px resize did not apply in this Chrome window. No layout changed.

### T6h (§6f option A, the human's choice; T-T6h.1 to .5)

- `analysis/thesis_md.mjs` (pure) and `pipeline/build_thesis_md.mjs` write THESIS.md from thesis, elasticity, visibility and model_inputs. Every judgement picked by condition (treasury vs 50%, largest frontend vs 50/80%, rate lower/level/higher, held or not, checks inside −1 or not).
- Wiring: `npm run rebuild` writes it last; `refresh` writes it and keeps it only when the text changed; `verify` fails on a hand edit, naming the line; refresh, chain-day and both backfills `git add` THESIS.md. README says THESIS.md is generated.
- The new THESIS.md differs from the old in the figures that moved (treasury 79%, confidential share 85%, interval tops) and says plainly that 8 of 9 elasticity checks keep −1 inside; the CoW Swap control sits just above (−0.99).
- **Waiting on later:** T-T6h.5, the first refresh in Actions after the commit.
- **Commit note:** the hourly refresh moves the data. Pull main right before committing, then `npm run rebuild` and `verify`, so fee_trace, reconciliation and THESIS.md match main's inputs.

## Units done: T6e Track brief charts, T6f Nothing stuck

Both built in one chat on 7 and 8 Nov, at the user's request (an exception to one unit per chat). Each has its own file list and commit.

### T6e

Spec: docs/PLAN.md §6c. Tests: docs/TESTS.md, T-T6e.1 to T-T6e.12. Opus 5.5 · medium. Status: **on main** (`e4dcb81`); T-T6e.12 passed 8 Nov. Design approved 7 Nov with the panel chart full width. `npm test` 254/254 (also with `EXPLORER_PANEL=off`), `npm run rebuild` then `verify` ALL OK with `data/` unchanged, `next build`, gitleaks on the changed files, wording scan clean, Chrome T-T6e.9 to .11 pass (1366 and 375). T-T6e.12 waits for the first `panel` run after this is on main.

- **What:** B, an activity chart on Method (four small charts over the stored BigQuery weeks); A, a per-day chart in the rolling panel on Follow the Fee (Explorer API, last 30 days); C, a note at the top of the README on why the Explorer data is only in the panel, linking the terms.
- **First step:** show the user the chart design at 1440 and 375, and build only after their yes.
- **Panel rules:** a per-day total is still a total, in the same one-day artifact, setting no reading. Never type a panel figure into THESIS.md, the README, the pitch, the final report or the demo video (record with the panel off or blurred).
- **What A cannot do:** go back more than 30 days, count as thesis evidence, or be made again by `npm run rebuild`. It goes away if ticket 79934 says no.

### T6f

Spec: docs/PLAN.md §6d. Tests: T-T6f.1 to T-T6f.8. Status: **on main** (`e4dcb81`, fix `96756fd`). `npm test` 261/261 (also with `EXPLORER_PANEL=off`), `verify` ALL OK, `next build`, gitleaks on the changed files, wording scan clean.
- **What:** a weekly `activity` job re-runs the two BigQuery activity queries for the last 90 days (Saturday 11:41 WIB, about 20 GB); the hourly refresh re-reads the protocol fee and commits only when it changes; Follow the Fee's protocol fee sentence comes from the read.
- **Fifth cronjob done (8 Nov):** `tideline activity` on cron-job.org, cloned from `tideline refresh` (same headers and token), `41 11 * * 6` Asia/Jakarta, body `{"ref":"main"}`, enabled, no test run. First run Saturday 14 Nov 11:41 WIB, so this unit must be on main before then.
- **Committed 8 Nov as `e4dcb81`;** `test` passed in Actions. `GOOGLE_SA_KEY` is set. The first `activity` run (by hand) failed at sign-in: `token_format: access_token` needs the IAM Credentials API, which the project does not have. Fix (not committed yet): gcloud on the runner mints the token from the key, masked in the log. Fix committed as `96756fd`. The run by hand then passed (8 Nov 01:10 WIB): signed in, 21.8 GB, `verify` ALL OK, committed `1abe79f`; `test` passed too. The stored files lost their hand-written `project`, `bytesBilled` and `note` fields (the job writes query, date and bytes only); the numbers are the same. BigQuery used in November: about 869 GB; three more Saturdays bring it to about 935 GB, under the 950 GB line.
- **Not run locally** (AGENTS.md: only tests, verify and gitleaks run here): `protocol_fee.mjs` inside refresh, and the BigQuery job. Both first run in Actions after the commit.
- **Commit note:** `data/published/fee_trace.json` gains `pips` and `sameSince`. Pull main right before committing and run `node pipeline/build_fee_trace.mjs` and `verify`, because the hourly refresh moves the data.

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
