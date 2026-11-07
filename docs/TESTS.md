# Tideline: tests

Every test below comes from docs/SRS.md. IDs match the SRS exactly. Rows marked "proposed" are not in the SRS; they fill a gap and need the human's OK.

How tests are run:

- unit and cli tests: the project's test runner (Node), run from the repo root.
- e2e tests: Claude in Chrome against the Vercel Preview, at 1440px and again at 375px.
- contract tests: near-sdk-rs tests for the attest contract (INV-1 to INV-3 included).
- manual: a person checks by hand and records what they saw.

Result starts as "⏭ not run". Evidence (screenshot, log, command output) is added when a test is run.

Tests written for the Explorer API or a quote archive (T-1.1, T-2.1, T-3.x quote traces, T-5.6, T-7.3, T-7.4, T-21.1) were replaced by chain-day tests in T1 to T6 (docs/PLAN.md §4).

## U0: Skeleton and deploy

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-0.1 | AC-0.1 | e2e | Open each planned route on the Preview after a push to `main` | Every route loads as a static page, no 404 | ⏭ not run | |
| T-0.2 | AC-0.2 | cli | Fresh clone, `npm i && npm run verify` | Exits 0 and prints its number count | ⏭ not run | |

## U1: Quote archive and attest contract

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-1.1 | AC-1.1 | cli | Run `node pipeline/quotes_sampler.mjs` once; then force one quote to fail | Raw signed quotes are written to `data/quotes/`; the failed quote is recorded as failed | ⏭ not run | |
| T-1.2 | AC-1.2 | integration | Run the daily job on a finished day against testnet | The day's SHA-256 is stored on the contract once | ⏭ not run | |
| T-1.3 | AC-1.3 | cli | `npm run attest:check <day>`; then change one byte in the file and run again | First run prints a match; second prints a mismatch | ⏭ not run | |
| T-1.4 | AC-1.4 | contract | Call `attest` for an already anchored day; call it from a non-owner | Both calls fail and state is unchanged | ⏭ not run | |
| INV-1 | INV-1 | contract | Try to overwrite a stored day's record | Rejected; record unchanged | ⏭ not run | |
| INV-2 | INV-2 | contract | Write from a non-owner account | Rejected | ⏭ not run | |
| INV-3 | INV-3 | contract | Call `attest` with an attached deposit | Fails | ⏭ not run | |

## U2: History snapshot and coverage

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-2.1 | AC-2.1 | integration | Pull a date range, then pull it again | Every swap in range is present; second run adds no duplicates | ⏭ not run | |
| T-2.2 | AC-2.2 | unit | Compare a fixture snapshot with DefiLlama daily volume | Daily coverage is output, including days that disagree | ⏭ not run | |
| T-2.3 | AC-2.3 | integration | Compare three sampled days with chain data | Differences appear in the reconciliation table | ⏭ not run | |
| T-2.4 | AC-2.4 | unit | Read every label in the label file | Each label has an evidence link | ⏭ not run | |

## U3: Follow the fee

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-3.1 | AC-3.1 | e2e golden | Open /follow-the-fee/, pick a route and size | Cost parts sum to the all-in cost within 0.5 bps; any remainder is labelled "unexplained" | ⏭ not run | |
| T-3.2 | AC-3.2 | e2e | Open a number on the page | Its query and plain-language line are visible | ⏭ not run | |
| T-3.3 | AC-3.3 | unit | Check the day-1 fee account `5880ad2b…47dd` result | It states whether this is a revenue account, with an evidence link | ⏭ not run | |
| INV-4 (proposed) | INV-4 | unit | Run the cost split across a grid of routes and sizes | Parts plus shown remainder always equal the all-in cost | ⏭ not run | |

## U4: Threshold model

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-4.1 | AC-4.1 | unit | Solve V* from the hand-worked fixture inputs | V* equals the fixture value | ⏭ not run | |
| T-4.2 | AC-4.2 | unit | Solve with the HSP-029 schedule and with the failed-vote path | V* is a dated path; the failed-vote path is returned beside it | ⏭ not run | |
| T-4.3 | AC-4.3 | e2e golden | On the Model page (`/model`, dev server), move a slider and release; time the update with a MutationObserver | V* and its date update within 100ms | ⏭ not run | |
| T-4.4 | AC-4.4 | cli | `npm run model -- --issuance 1.6` | V* prints with its interval | ⏭ not run | |
| INV-5 (proposed) | INV-5 | unit | Raise revenue per dollar of volume; then raise price; then raise issuance | V* falls, rises, rises | ⏭ not run | |

## U5: Elasticity and pass-through

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-5.1 | AC-5.1 | cli | Read git history for `PREREG.md` and the estimation code | Event list and estimands were committed before the estimation code | ⏭ not run | |
| T-5.2 | AC-5.2 | unit | Estimate on synthetic data with a known effect | Interval covers the true effect; placebo distribution, MDE and drop-the-largest result are all output | ⏭ not run | |
| T-5.3 | AC-5.3 | e2e golden | Open /elasticity/ with an interval spanning zero (or MDE above the estimate) | First line says "underpowered" | ⏭ not run | |
| T-5.4 | AC-5.4 | e2e | Open /elasticity/ with fewer than 3 usable events | Page states the event count; fee trace and threshold stay the lead | ⏭ not run | |

## U6: Readings and Headline

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-6.1 | AC-6.1 | unit | Feed each reading a value just below, at and just above its threshold | Side matches `PREREG.md` on every boundary | ⏭ not run | |
| T-6.2 | AC-6.2 | unit | Compute HHI and top-3 on the fixture buckets | Both equal the hand-worked values | ⏭ not run | |
| T-6.3 | AC-6.3 | e2e golden | Open the Headline page at 1440px | V* band, five readings and verdict are visible with no scrolling | ⏭ not run | |

## U7: Verify

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-7.1 | AC-7.1 | cli golden | Fresh clone, no `.env`, `npm run verify` | Every number prints `OK`, ends in `ALL OK`, under 10 minutes | ⏭ not run | |
| T-7.2 | AC-7.2 | cli | Edit one published number, run `npm run verify` | That number's diff is printed and exit code is non-zero | ⏭ not run | |
| T-7.3 | FR-14, NFR-2 | cli | `npm run verify -- --full` with only the free Explorer JWT | Re-pulls 3 snapshot days, DefiLlama and the model inputs and compares them | ⏭ not run | |
| INV-6 (proposed) | INV-6 | cli | Scan the site's numbers against `data/published/` | Every number exists there with a query id | ⏭ not run | |

## U8: Daily job and alarm (Should)

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-8.1 | AC-8.1 | unit | Run the job with a reading that changes side | One entry added to `alarm/history.json`; one Telegram message sent (stubbed) | ⏭ not run | |
| T-8.2 | AC-8.2 | unit | Run the job with no change | Nothing added, nothing sent | ⏭ not run | |

## U9: Remaining pages, feeds and reconciliation (Should)

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-9.1 | AC-9.1 | e2e | Open the reconciliation table | Each conflicting figure shows source, value, date and our computed value | ⏭ not run | |
| T-9.2 | AC-9.2 | e2e | Fetch `/api/thesis.json` and open the Headline page | The feed matches the Headline page | ⏭ not run | |

## Added 3 Nov 2026 (finishing U2 to U7)

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-3.4 | FR-05 | unit | Trace a quote with the on-chain protocol fee; sum NEAR's share of app fees per size | App + withdraw + protocol + rest = all-in; NEAR share per bucket over 30 days | ⏭ not run | |
| T-4.5 | FR-10, FR-11 | unit + cli | Revenue-maximizing fee and V* at another fee across the elasticity interval | f* = 5/(−1−e) below −1, none above; `npm run model` prints it | ⏭ not run | |
| T-5.5 | PREREG §3 check | unit | Elasticity with CoW Swap as the control; fee switch descriptive | Recovers a known effect; a missing control day drops the windows around it | ⏭ not run | |
| T-5.6 | FR-08 | unit | Pass-through priced against Binance on the event windows | Slope and resampled interval; the Explorer slope on the same swaps beside it | ⏭ not run | |
| T-6.4 | FR-09, E3 | unit | Solver of a swap from intents.near logs; HHI and top 3 per size and all sizes | token_diff counterparty or transfer counterparty; pooled shares weighted by USD | ⏭ not run | |
| T-21.1 | FR-21 | unit + cli | Routes per day from the raw pull; board of quoted, same-token and other routes over 30 days | Shares add to 100%; the quoted routes equal the archive's; verify recomputes the board | ⏭ not run | |
| T-21.2 | FR-21, D14 | unit | Elasticity with each extra control venue; fee switch against each | Each venue is its own check; a venue with no history gives no estimate | ⏭ not run | |
| T-7.4 | FR-14 | cli | `verify --full` also compares the NEAR fee files and the CoW file | Within the drift limit | ⏭ not run | |

## T6b Confidential shift (PREREG.md amendment A2)

| ID | Rule | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-A2.1 | A2 1 | unit | Treasury share over a window | Treasury USD ÷ all USD | ✅ pass | analysis/treasury.test.mjs |
| T-A2.2 | A2 2 | unit | E3 and the Q3 spread | Treasury groups left out; no figure with the treasury as one account | ✅ pass | analysis/realised_cost.test.mjs |
| T-A2.3 | A2 3 | unit | Share of exactly 50%, just over, far over, unknown | Not over at 50%; Not Measured above it with the share named | ✅ pass | analysis/readings.test.mjs |
| T-A2.4 | A2 4 | unit | Side figures over the line | Kept on the reading, set nothing, a missing one stays missing | ✅ pass | analysis/readings.test.mjs, analysis/thesis_text.test.mjs |
| T-A2.5 | A2 5 | unit | Verdict with a held reading | Undecided whatever the score, score published, Bearish held too, returns by itself | ✅ pass | analysis/readings.test.mjs |
| T-A2.6 | A2 6 | unit | Cost parts | Public swaps only; confidential line has the all-in cost and no app fee or spread field | ✅ pass | analysis/realised_cost.test.mjs, lib/fee_view.test.mjs |
| T-A2.7 | A2 7 | unit | Treasury pairs | Counted and named paired confidential flows | ✅ pass | analysis/treasury.test.mjs, lib/fee_view.test.mjs |
| T-A2.8 | A2 8 | unit | Treasury file and confidential share | Sums by token and direction, fillers apart, no wallet address, unpriced counted, share by hand, a gap stays a gap | ✅ pass | analysis/treasury.test.mjs, pipeline/treasury_day.test.mjs |
| T-A2.9 | A2 8 | unit | chain_day with a failing treasury file | The chain day still freezes, same bytes | ✅ pass | pipeline/treasury_day.test.mjs |
| T-T2.6 | PLAN T2 | unit | Day read in 2, 4 and 7 block ranges; a missing part; a capped discovery listing | Same bytes as one read; no freeze from some parts; discovery carries on | ✅ pass | pipeline/chain_day.test.mjs |
| T-T2.7 | PLAN T2 | Actions | `chain-day` with 4 read jobs on `test`, 5 Nov re-read, `commit=false` | Same transactions and swaps as the frozen file, `verify` passes, 429s recover | ✅ pass | Run 42262780228: digest and swap counts equal, USD −0.03% from revised prices, 1,279 429s, all recovered |
| T-A2.10 | A2 8 | Actions | `treasury-backfill` from 4 Oct | Files in data/treasury, `verify` passes, frozen chain days unchanged | ⏭ not run | Needs this unit on main |
| T-A2.11 | Rule 11 | Chrome | 8 pages × 4 states plus `?state=few`, `anchored`, `mismatch`, each in a frame 1440 and 375 wide | No sideways scroll, nothing past the edge, no broken text, no crash | ✅ pass | 7 Nov, 70 loads on the `test` working tree (chain days to 4 Nov, published files to 5 Nov). Console: 8 pages reloaded at the pane width, no errors |

## T6e Track brief charts (docs/PLAN.md §6c)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6e.1 | B1, B6 | unit | Chart component with four measures over the stored weeks | One small chart per measure, every week drawn, aria-label gives each first and last value | ✅ pass | 7 Nov, `lib/bar_charts.test.mjs` |
| T-T6e.2 | B5 | unit | Activity with no file, no weeks, one week | Error banner and no chart; no chart; table only. No week drawn as zero | ✅ pass | 7 Nov, `lib/bar_charts.test.mjs`; the missing-file banner is the existing one |
| T-T6e.3 | B3 | cli | `npm run rebuild`, then `npm run verify` | `data/published/` unchanged by this unit; ALL OK | ✅ pass | 7 Nov, `git status data/` empty after `npm run rebuild`; verify ALL OK |
| T-T6e.4 | A1, A2 | unit | Fold a fixture of pages across 3 days, with same-token and unpriced rows and a day with a failed page | One `byDay` entry per finished day, sorted; USD sum equals `swaps.usd`; failed day left out, never zero; same-token and unpriced not counted | ✅ pass | 7 Nov, `pipeline/panel.test.mjs`. A failed page stops the whole run, so no partial day exists to leave out |
| T-T6e.5 | A1 | unit | Keys of every `byDay` entry | Only `day`, `swaps`, `usd`: no referral, frontend, account or swap id | ✅ pass | 7 Nov, `pipeline/panel.test.mjs` |
| T-T6e.6 | A3, A5 | unit | `panelView` with `byDay`, without `byDay`, over 24 hours, off | Live with series; live with text and no series, no error; Not Available, no series; off | ✅ pass | 7 Nov, `pipeline/panel.test.mjs`; a missing day reads null, drawn blank |
| T-T6e.7 | A6 | unit | The existing terms guards in `pipeline/panel.test.mjs` and `verify`'s API-data scan, with any new panel-only file in `API_CODE` | All pass; no build, route, feed, alarm or Telegram file reaches panel code | ✅ pass | 7 Nov, all guards pass; no new panel-only file, so `API_CODE` is unchanged; the shared chart code reaches no panel file |
| T-T6e.8 | C1 to C3 | cli | Read the top of README.md; run the wording scan | Note under the first line, terms link works, Section 4.1(e) named, no API figure; scan passes | ✅ pass | 7 Nov, note under the first line, link opens the terms page, `.private/wording-scan.mjs` clean |
| T-T6e.9 | B1, B2, B4 | Chrome | `/method/` at 1440 and 375 | Four charts above the table, 27 Oct marker, table, sentence and "Open the Query" intact, no sideways scroll | ✅ pass | 7 Nov, production build; 1366 (the widest the screen allows) and a 375 frame: 4 charts, 48 bars, marker and key, table and query link intact, no overflow |
| T-T6e.10 | A4, A5 | Chrome | `/follow-the-fee/` at 1440 and 375 with a fixture panel (with `byDay`, without it, over 24 hours) | Chart and caption; text only; "Not Available" and no chart. Concentration shows no chart | ✅ pass | 7 Nov, synthetic fixture via `PANEL_FILE` outside the repo: with `byDay` full-width chart and caption; without it text only; 30 hours old Not Available; Concentration and the empty state checked too. Real artifact (no `byDay` yet) on localhost:3115: text only, no console errors |
| T-T6e.11 | A5 | Chrome | Production build with `EXPLORER_PANEL=off`, Method and Follow the Fee at 1440 and 375 | No panel and no panel chart; activity chart still there; `npm test` passes with the switch set | ✅ pass | 7 Nov, `EXPLORER_PANEL=off` build: no panel or Explorer mention on Method or Follow the Fee, activity charts kept; `npm test` 254/254 with the switch set |
| T-T6e.12 | A4 | Actions | The first `panel` run after this is on `main` | Artifact kept one day, holds `byDay`, log has no figure; the site's chart shows | ⏭ not run | Can only run after the commit |

## T6f Nothing stuck (docs/PLAN.md §6d)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6f.1 | F1 | unit | The window at 04:41 UTC and at 01:59 UTC | Last 90 finished days; refuses before 02:00 UTC | ✅ pass | 8 Nov, `pipeline/activity_refresh.test.mjs` |
| T-T6f.2 | F1 | unit | Move the range in both stored SQL files | Only the two dates change; a query without exactly one range is refused | ✅ pass | 8 Nov |
| T-T6f.3 | F1 | unit | Newest day missing, at 20% and at 30% of the week before | Missing and 20% refused, nothing stored; 30% stored | ✅ pass | 8 Nov |
| T-T6f.4 | F1 | unit | The whole job with a stand-in BigQuery | Both files updated, only those two run, a day short is refused | ✅ pass | 8 Nov |
| T-T6f.5 | F2 | unit | Read `activity.yml` | Dispatch only, one run at a time, no credentials file, verify before commit, only activity paths staged, no other secret | ✅ pass | 8 Nov |
| T-T6f.6 | F3 | unit | Read `pipeline/refresh.mjs` | Protocol fee read every hour, settled, `readAt` ignored when comparing | ✅ pass | 8 Nov |
| T-T6f.7 | F4 | unit | The protocol fee sentence for 1 pip, 5 pips and no read | Built from the read; no typed "January 2026" left | ✅ pass | 8 Nov |
| T-T6f.8 | F2 | Actions | First `activity` run after the key is set | Commits `data: activity <date>` with the new window; `verify` passes; the Method chart's last week moves | ⏭ not run | Needs the human's key and this unit on main |

## Preview states (proposed)

These are not in the SRS. They check the states the screens should show when data is old, loading, failed, anchored or mismatched (SRS 9.4, NFR-6). Expected text comes from the Figma frames and needs the human's confirmation.

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P-1 (proposed) | NFR-6 | e2e | Open `/?state=stale` at 1440px and 375px | Headline shows its stale state; no invented numbers | ⏭ not run | |
| P-2 (proposed) | NFR-6 | e2e | Open `/?state=loading` at 1440px and 375px | Headline shows its loading state; no layout jump when data arrives | ⏭ not run | |
| P-3 (proposed) | NFR-6 | e2e | Open `/follow-the-fee/?state=error` at 1440px and 375px | Error state shown; no partial or invented data | ⏭ not run | |
| P-4 (proposed) | NFR-6 | e2e | Open `/elasticity/?state=error` at 1440px and 375px | Error state shown; no partial or invented data | ⏭ not run | |
| P-5 (proposed) | NFR-6 | e2e | Open `/reproduce/?state=error` at 1440px and 375px | Error state shown; no partial or invented data | ⏭ not run | |
| P-6 (proposed) | SRS 9.4 | e2e | Open `/reproduce/?state=anchored` at 1440px and 375px | Shows "anchored" | ⏭ not run | |
| P-7 (proposed) | SRS 9.4 | e2e | Open `/reproduce/?state=mismatch` at 1440px and 375px | Shows "mismatch" | ⏭ not run | |

## Non-functional checks (proposed)

The SRS lists NFR-3 and NFR-4 but gives them no test ID.

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N-1 (proposed) | NFR-3 | manual | Load golden-path pages on throttled 4G; view at 375px | Load under 2s; no horizontal scroll | ⏭ not run | |
| N-2 (proposed) | NFR-4 | manual | Check text colour pairs on every screen | Contrast at least 4.5:1 | ⏭ not run | |
| N-3 (proposed) | NFR-7 | cli | Scan the repo for secrets; confirm `.env` is gitignored | None found | ⏭ not run | |

## Visual checks

Dropped 3 Nov 2026: the human stopped using Figma, and the site now follows DESIGN-REFERENCE-3.md (rule 21), not the Figma frames. The pages were checked in Chrome instead (see T-6.3, P-1 to P-7, N-2), and the human reviews the look at G6.

- [ ] S1 against its frame at 1440 and 375
- [ ] S2 against its frame at 1440 and 375
- [ ] S3 against its frame at 1440 and 375
- [ ] S4 against its frame at 1440 and 375
- [ ] S5 against its frame at 1440 and 375
- [ ] S6 against its frame at 1440 and 375
- [ ] S7 against its frame at 1440 and 375
- [ ] S8 against its frame at 1440 and 375
- [ ] Number sheet against its frame at 1440 and 375

## T2: daily chain snapshot (4 Nov 2026)

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T2.1 | PLAN T2 | unit | Fixture day with a token_diff swap, transfer swaps, a double-counted user | Each swap counted once, grouped by kind × solver × referral × fee × bucket, no wallet addresses | ✅ pass | analysis/chain_day.test.mjs |
| T-T2.2 | PLAN T2 | unit | Freeze the same fake day twice, with the input in another order | Same bytes | ✅ pass | analysis/chain_day.test.mjs, pipeline/chain_day.test.mjs |
| T-T2.3 | PLAN T2 | unit | Capped listing, under 99% read, no swaps, day not over | Nothing written; the run fails with the reason | ✅ pass | pipeline/chain_day.test.mjs |
| T-T2.4 | PLAN T2 | cli | Edit a count in a day file, run `npm run verify` | FAIL naming the count; exit non-zero | ✅ pass | pipeline/chain_day.test.mjs |
| T-T2.5 | PLAN T2 | cli, Actions | Run `chain-day` on `test` for 2026-11-03, then `attest:send` and `attest:check` | About 20,900 swaps, anchored hash equals the file's | ✅ pass | chain-day run 41837332718 (20,925 swaps, $34.2M, 1h34m); attest-days run 41857233332; site reads state `anchored`, both hashes `d0c30363…6973` |
