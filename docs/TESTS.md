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
| T-T6e.12 | A4 | Actions | The first `panel` run after this is on `main` | Artifact kept one day, holds `byDay`, log has no figure; the site's chart shows | ✅ pass | 8 Nov, `panel` run 09:07 WIB: artifact kept until 9 Nov, log shows only progress lines; Follow the Fee on localhost shows 30 daily bars, 9 Oct to 7 Nov, with the 27 Oct marker |

## T6f Nothing stuck (docs/PLAN.md §6d)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6f.1 | F1 | unit | The window at 04:41 UTC and at 01:59 UTC | Last 90 finished days; refuses before 02:00 UTC | ✅ pass | 8 Nov, `pipeline/activity_refresh.test.mjs` |
| T-T6f.2 | F1 | unit | Move the range in both stored SQL files | Only the two dates change; a query without exactly one range is refused | ✅ pass | 8 Nov |
| T-T6f.3 | F1 | unit | Newest day missing, at 20% and at 30% of the week before | Missing and 20% refused, nothing stored; 30% stored | ✅ pass | 8 Nov |
| T-T6f.4 | F1 | unit | The whole job with a stand-in BigQuery | Both files updated, only those two run, a day short is refused | ✅ pass | 8 Nov |
| T-T6f.5 | F2 | unit | Read `activity.yml` | Dispatch only, one run at a time, token from the key via gcloud and masked, verify before commit, only activity paths staged, no other secret | ✅ pass | 8 Nov |
| T-T6f.6 | F3 | unit | Read `pipeline/refresh.mjs` | Protocol fee read every hour, settled, `readAt` ignored when comparing | ✅ pass | 8 Nov |
| T-T6f.7 | F4 | unit | The protocol fee sentence for 1 pip, 5 pips and no read | Built from the read; no typed "January 2026" left | ✅ pass | 8 Nov |
| T-T6f.8 | F2 | Actions | First `activity` run after the key is set | Commits `data: activity <date>` with the new window; `verify` passes; the Method chart's last week moves | ✅ pass (partly) | 8 Nov 01:10 WIB, run 42399907122: signed in, 3.52 + 18.31 GB, 90 rows each to 6 Nov, ALL OK, committed `1abe79f`. Same window as before (still 7 Nov in UTC), so the chart did not move yet; the 14 Nov run shows that |

## T6g Words follow the numbers (docs/PLAN.md §6e)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6g.1 | G1 | unit | Reconciliation with volume within 5%, 20% off, and a day missing | Ours shows the total; "matches" only within 5%; otherwise how far apart; missing day gives Not available and no claim | ✅ pass | 8 Nov, lib/reconcile_view.test.mjs: within 5% matches; 20% below or above says how far; a missing or null day gives Not available and no claim |
| T-T6g.2 | G1 | cli | `npm run rebuild` then `verify` | `reconciliation.json` holds our cumulative volume; ALL OK | ✅ pass | 8 Nov, `npm run rebuild` then `verify` ALL OK; reconciliation.json Ours $29.5B, "matches the public part, within 1%" |
| T-T6g.3 | G2 | unit | Buyback share 1, 0.8, missing; burned true | "All" only at 100%; the share otherwise; "not burned" only when false; no claim without a figure | ✅ pass | 8 Nov, lib/fee_view.test.mjs buybackPart with share 1, 0.8, missing, burned true |
| T-T6g.4 | G3 | unit | Model split with 11 and 40 days since 27 Oct | "So few days" at 11, not at 40 | ✅ pass | 8 Nov, lib/model.test.mjs splitSentence: 11 days says it, 40 days does not |
| T-T6g.5 | G4, G5 | unit | Method sources text; cost card with `trace.to` in 2027 | Past-tense email sentence; card shows 2027 | ✅ pass | 8 Nov, card source "Chain days to 5 Jan 2027."; Method email sentence past tense (lib/typed_text.test.mjs) |
| T-T6g.6 | G6 | unit | Guard test on the current code | Passes with the allow-list; each allowed entry has a reason | ✅ pass | 8 Nov, lib/typed_text.test.mjs: every figure on ALLOW with kind and reason, no unused entry, no label or solver name in page code |
| T-T6g.7 | G6 | unit | Guard test with a planted typed figure and a planted frontend name | Both fail `npm test` | ✅ pass | 8 Nov, planted 74%, $12.6B, 3.1×, 5.0 bps, 4 Nov 2026 and SwapKit all caught; comments and URLs ignored |
| T-T6g.8 | G6 | unit | Allow-list against published values | No allowed figure equals a live value in `thesis.json`, `model_inputs.json` or `fee_trace.json` | ✅ pass | 8 Nov, no claim figure equals a measured (non-whole) value in the three files. Catches exact copies; a rounded copy is not on ALLOW, so T-T6g.6 fails it |
| T-T6g.9 | all | Chrome | All eight pages at 1440 and 375; Method, Follow the Fee and Model line by line against their files | Every sentence agrees with its numbers; no layout change | ⚠ partial | 8 Nov, at 1440: all 8 pages render, Method sources and Model split read right, cost card year from data; after the push (`4796d56`) Cumulative Volume reads $29.5B, "matches the public part, within 1%", and the Buyback line reads from the data. Not done: 375, the resize did not apply in this Chrome window; no layout changed |

## T6h THESIS.md follows the data (docs/PLAN.md §6f, option A)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6h.1 | A | unit | Run the script on the published files | Equals the committed THESIS.md | ✅ pass | 8 Nov, analysis/thesis_md.test.mjs: script output equals the committed THESIS.md |
| T-T6h.2 | A | cli | Edit one figure in THESIS.md by hand, run `verify` | Fails and names the line | ✅ pass | 8 Nov, pipeline/verify.test.mjs: one edited figure gives "DIFF THESIS.md line N" and NOT OK |
| T-T6h.3 | A | unit | Altered thesis docs: treasury 40% and 74%, SwapKit 79% and 85%, held and not held | Judgement words follow the lines; held text only when held | ✅ pass | 8 Nov, treasury 40% "at or under", 74% "well over"; 79% "just under", 85% "over"; hold text only when held |
| T-T6h.4 | rules | unit | Scan the made THESIS.md | No Explorer or 1Click figure; the demand sentence present; no advice wording | ✅ pass | 8 Nov, no Explorer, 1Click or panel wording; demand sentence present; no advice wording; script reads 4 published files only |
| T-T6h.5 | A | Actions | First refresh after the commit | THESIS.md committed only if a figure changed; matches the site | ⏭ not run | |

## T6i Easy and Pro (docs/PLAN.md §6g)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6i.1 | E4 | unit | `easy_text` with altered data: treasury share 79% and 40%; verdict held and not held; needed multiple 3.2 and 0.8; Q3 Not Measured and measured | Each sentence follows its data; rounding computed from the value; no claim without a figure | ✅ pass | lib/easy_text.test.mjs, 8 Nov: treasury 79% and 40%, held and not, multiple 3.2 and 0.8, Q3 both ways |
| T-T6i.2 | E4 | unit | Guard test (`lib/typed_text.test.mjs`) over the new files, then with a planted typed figure in Easy text | Passes on the real code; the planted figure fails `npm test` | ✅ pass | lib/typed_text.test.mjs T-T6i.2: new files scanned; planted 79% and $12.6B fail |
| T-T6i.3 | E7 | unit | Scan every Easy string for banned words: demand fall, solver or trader for the Treasury, buy, guaranteed, great investment, moon | None found; a planted one fails | ✅ pass | lib/easy_text.test.mjs: every Easy string (fixed, built on real and altered data, typed in pages); five planted ones caught |
| T-T6i.4 | E3, E7 | unit | Each Pro reading, side and figure on a page has the same value in Easy | No reading, side or number exists in only one mode | ✅ pass (Home) | Unit on Home over five data sets; other pages keep their numbers outside the swapped words, and their Easy twins reuse the same fields |
| T-T6i.5 | E6 | unit | Every `Term` used on a page exists in `lib/glossary.ts`; no glossary text holds a figure | All present; none has a figure | ✅ pass | All [[term]] marks and Term uses are in lib/glossary.ts; no digit in any note |
| T-T6i.6 | E1, E2 | Chrome | First visit with storage cleared, on Home and on one inner page | Pro is selected; no flash of Easy | ✅ pass | Chrome 8 Nov, storage cleared: Home loads Pro, no Easy element shown; the head script is unit-tested for every page |
| T-T6i.7 | E2 | Chrome | Pick Easy, move through all eight pages, reload | Easy stays on every page and after reload; no flash | ✅ pass | Chrome: Easy kept on all eight pages and after reload; ?mode=easy and ?mode=pro set it and leave the address bar, other parameters kept |
| T-T6i.8 | E2 | Chrome | Storage blocked (private window or `localStorage` throwing) | Site loads in Pro and the switch still works for the visit | ⚠ partial | Storage made to throw after load: the switch works and the choice holds across pages, no error. Blocked storage before load is unit-tested only: a sandboxed frame breaks the whole app, so it is no fair test |
| T-T6i.9 | E1, E6 | Chrome | Keyboard only: reach the switch and a term note; Escape and a tap outside close the note | Focus visible; only the active mode is read by a screen reader | ✅ pass | Tab reaches a term note, focus ring shows, note opens, Escape closes it and keeps focus; mouse leave closes. The hidden mode is display:none |
| T-T6i.10 | E1, E5, E6 | Chrome | All eight pages at 1440 and 375 in both modes, plus the error and stale states | Switch fits; no horizontal scroll; notes stay on screen; numbers match between modes | ⚠ partial | The Chrome window gives a 1366 viewport, not 1440: all eight pages in Easy, no horizontal scroll, error and stale previews. 375 in frames: Home menu, What Would Move with a note open (note inside 24 to 344 px). A full 375 sweep of every page in both modes is left for P7a |
| T-T6i.11 | E8 | cli | `EXPLORER_PANEL=off npm test`, `verify`, `npm run build`; diff `/api/thesis.json`, THESIS.md and `data/` | All pass; API, THESIS.md and `data/` unchanged | ✅ pass | EXPLORER_PANEL=off npm test 283/283, verify ALL OK, next build passes; git shows no change in data/, THESIS.md, app/api or README |
| T-T6i.13 | E9 | unit | Held and not-held docs: Pro count line, Easy answers line, card title, dots and on-hold line | Counts per side match the readings in both modes; on-hold line has the largest held treasury share, or "flow went private" when no share is read; all null when not held | ✅ pass | `lib/thesis_view.test.mjs` A2 rule 5 and `lib/easy_text.test.mjs` T-T6i.1 and the count-line test; the parity test skips labels such as A2 and Q3 |
| T-T6i.14 | E9 | Chrome | Home in Pro and Easy at 1366 and 375 (frames) on today's data | Card reads "4 of 5 Answered" with five dots and "On hold: 79% went private" inside the card; lead and reason lines show; no horizontal scroll | ✅ pass | 8 Nov: as expected in both modes; on-hold line 42 px clear of the card edge at 1366 |
| T-T6i.15 | E11 | unit | Easy glance captions, held and not held | Share in tenths against the line; score caption; picked by the hold | ✅ pass | `lib/easy_text.test.mjs`; the captions also join the T-T6i.4 number parity |
| T-T6i.16 | E11 | unit | Pro glance: largest held share, line from the file, below the line, no private flow, missing file | Flow, captions and hidden flag follow the file; null where there is nothing to show | ✅ pass | `lib/thesis_view.test.mjs` |
| T-T6i.17 | E10 | unit | The page's What This Means against the pipeline's | `thesisView(doc).text` equals `thesisText(doc)`, not the stored text | ✅ pass | `lib/thesis_view.test.mjs`; the Pro wording tests are in `analysis/thesis_text.test.mjs`, Easy's in T-T6i.1 |
| T-T6i.18 | E10, E11 | Chrome | Home on localhost:3112 (GitHub data) in Pro and Easy at 1366 and 375 (frames); open the fold | Three cards, bar and line, grey score fill, icons; fold opens with each mode's text; advice lines visible; no horizontal scroll | ✅ pass | 8 Nov: as expected in both modes; the fold opens on click |
| T-T6i.19 | E12 | unit + Chrome | Easy hero words; Home in Easy and Pro at 1366 and 375 (frames) | No figure typed in the Easy words; Hero shows each one; the heading fits at 375; numbers the same in both modes | ✅ pass | `lib/easy_text.test.mjs`; 8 Nov on localhost:3112, no horizontal scroll |
| T-T6i.12 | E7 | cli | `.private/wording-scan.mjs` extended to Easy text | Clean | ✅ pass | The scan reads every tracked and untracked file, Easy text included: clean. Easy-only banned words are in T-T6i.3 |

## T6j Beautification and adjustment (docs/PLAN.md §6h)

| ID | Covers | Type | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-T6j.1 | J1 | unit | Easy Unexplained note on real and altered left-out counts | Each count follows the data; no jargon ("both sides", "price check", "token"); Pro text unchanged | ✅ pass | lib/fee_view.test.mjs, 8 Nov: real-shaped and altered counts; Pro text unchanged |
| T-T6j.2 | J1 | Chrome | Follow the Fee in Easy and Pro, panel live | Easy: Outside Count heading, plain sentence, chart, one source line, no bps or quote sentence; Pro as before | ✅ pass | Chrome 1366, 8 Nov, live panel 6 hours old: Easy shows Outside Count, the plain sentence, chart, "Private swaps begin (27 Oct 2026)" and one source line; Pro unchanged. Concentration (frontend list kept in Easy) not opened in Chrome |
| T-T6j.3 | J2 | unit | Easy left-out note: real counts, all three groups, one swap, none | One total then each non-zero group; singular for one; the none sentence; no jargon; Pro unchanged | ✅ pass | lib/fee_view.test.mjs T-T6j.1, 8 Nov |
| T-T6j.4 | J2 | Chrome | Follow the Fee in Easy and Pro | Easy titles "What We Couldn’t Explain" and "Another Tracker’s Count", the new sentences, one source line; Pro as before | ✅ pass | Chrome 1366, 8 Nov: Follow the Fee Easy shows both new notes with one source line, Pro unchanged; Concentration Easy shows the new sentence, then the frontend list, then the source line |
| T-T6j.5 | J3 | unit | Fixture and real fee_trace: Easy row names, bar note, title; jargon scan; minus line | Same numbers as Pro in every name shown; no "plain transfer", "price noise", "all-in", "token_diff"; minus line only when a part is negative | ✅ pass | lib/fee_view.test.mjs, 8 Nov |
| T-T6j.6 | J3 | Chrome | Follow the Fee top in Easy and Pro at 1366 | Easy shows the new lead, bar labels, row names and card; numbers match Pro; Pro as before | ✅ pass | Chrome 1366, 8 Nov. 375 not checked: the bar's right label is longer in Easy |
| T-T6j.7 | J4 | Chrome | Follow the Fee at 1366 and 375 (frame): scroll down, pick on the pill, scroll up | Pill shows only with the header out of view; a pick changes the page and the header switch; no horizontal scroll at 375 | ✅ pass | Chrome 8 Nov: pill at bottom right, Pro from the pill switched page and header; at 375 the pill sits 16 px in, no horizontal scroll. Also J3's bar labels at 375: stacked, no overlap |
| T-T6j.8 | J5 | unit | `easyElasticity` on the real result and on ranges above and below −1 | Count, guess words, thin-data line, range ends and −1 line follow the numbers | ✅ pass | lib/easy_text.test.mjs (T-T6i.1 updated), 8 Nov |
| T-T6j.9 | J5 | unit | `elasticityView(...).easy` on the published elasticity.json | Head, checks summary, title and smallest-effect line follow the file; no "interval", "p =", "placebo", "PREREG", "frozen" | ✅ pass | lib/elasticity_view.test.mjs, 8 Nov |
| T-T6j.10 | J5 | Chrome | Elasticity in Easy and Pro at 1366 and 375 (frame); open the fold | Easy words as planned; fold opens to the same rows as Pro; Pro unchanged; no horizontal scroll | ✅ pass | Chrome 8 Nov. The doubled "27 Frozen Fee Changes" in the human's screenshot was a stitching mark: the page has one heading |
| T-T6j.11 | J6 | unit | `easyReadingLine` on the published files and on altered sides, shares and intervals | Each line follows its data; Q1 thin-data part only while the range crosses −1; no "token_diff", "treasury", "of USD", "Elasticity" or hyphen minus; Q1 question no longer says NEAR raises | ✅ pass | lib/easy_text.test.mjs, 8 Nov |
| T-T6j.12 | J6 | Chrome | Home rows in Easy and Pro at 1366 | Easy shows the five plain lines with the same numbers and sides; Pro rows unchanged | ✅ pass | Chrome 8 Nov |
| T-T6j.13 | J7 | unit | Every Easy string (fixed, built on real and altered data, typed in pages) against the old words | No integrator, frontend, revenue, reading, verdict, "confidential settlement", "short each month"; "solver" only inside "traders (solvers)"; tap-notes exempt | ✅ pass | lib/easy_text.test.mjs, 8 Nov. It caught four leftovers on its first run |
| T-T6j.14 | J7 | Chrome | All eight pages in Easy: scan the visible text; Pro spot check | No old word visible outside Method's body; Easy titles show; Pro titles and table heads unchanged | ✅ pass | Chrome 1366, 8 Nov. Method's body keeps Pro words by design |
| T-T6j.15 | J8 | unit | Pro Follow the Fee text on the fixture and the published file | "token_diff" only inside "logged as token_diff"; no "paired confidential flows", "two public edges", "a token the swap did not give"; the negative-spread line only when a part is negative | ✅ pass | lib/fee_view.test.mjs, 8 Nov |
| T-T6j.16 | J8 | unit | Panel quote line on the stand-in panel | Pairs named; the app fee said to be the one on our own test request | ✅ pass | pipeline/panel.test.mjs, 8 Nov |
| T-T6j.17 | J8 | Chrome | Pro on Home, Follow the Fee, Elasticity, Concentration, Model | New wording shows; numbers unchanged; real minus signs | ✅ pass | Chrome 1366, 8 Nov |
| T-T6j.18 | J9 | Chrome | Open a note on Home's readings row, one at the bottom of the screen, and one in Follow the Fee's number sheet; press Escape | Note fully visible over the next panel; flips above the word near the bottom; above the sheet; Escape closes it | ✅ pass | Chrome 1366, 8 Nov |
| T-T6j.19 | J10 | unit + Chrome | Number card and sheet in Easy and Pro | Pro query names only feeTrace; Easy query has no file names; Easy dollar note equals the total | ✅ pass | lib/fee_view.test.mjs; Chrome 1366, 8 Nov |
| T-T6j.20 | J11 | Chrome | Measure panel to link and link to button on Model and Elasticity | Both 32px and 24px | ✅ pass | Chrome 1366, 8 Nov |
| T-T6j.21 | J12 | Chrome | Model in Easy and Pro: intro or title to the gauge panel; Home gauge position | 48px in both modes; Home unchanged | ✅ pass | Chrome 1366, 8 Nov. The gauge is hidden on phones |
| T-T6j.22 | J13 | Chrome | Model at 1366: gauge glass edges against the panels below; gap above and below; Home gauge in both modes | Same left and right edges; 48px above, 32px below; Home unchanged | ✅ pass | Chrome 8 Nov: glass 72 to 1279 = grid 72 to 1279; Home 1031px (Easy) as before |
| T-T6j.23 | J14 | Chrome | Reproduce at 1366 (anchored, mismatch, error) and 375 (frame); click Copy | Proof card first at full width; commands two to a row with Copy inside; phones stack command, note, Copy with no horizontal scroll; the toast shows | ✅ pass | Chrome 8 Nov |
| T-T6j.24 | J15 | Chrome + unit | Reproduce at 1366 and 375 (frame); panel switch off | Proof card, three numbered steps with the anchored day in step 3, Going Further with what each needs; no horizontal scroll; panel command gone when off | ✅ pass | Chrome 8 Nov; pipeline/panel.test.mjs (switch off) |
| T-T6j.25 | J16 | cli + Chrome | Time /reproduce/; view at 1366 and 375 (frame), error state; click a copy icon | First byte under 0.1s with the steps and the Checking card; card fills in; frames line up; no horizontal scroll; toast shows | ✅ pass | 8 Nov: first byte 0.07s (was a 4.8s wait for the whole page); Chrome as expected |
| T-T6j.26 | J17 | Chrome | ?state=error, click Try Again; Going Further rows | Same page (no reload), "Checking…" then the live result; a dot box beside each extra, the same size as the number badges (all 30 by 24px) | ✅ pass | Chrome 8 Nov: same document, Anchored: 7 Nov 2026 after the check |
| T-T6j.27 | J18 | unit + Chrome | Reproduce list in Easy and Pro; the guard over its Easy words | Three groups; Easy shows no old word and folds the files; Pro shows every file and source, dip4 explained; #q1 and the other anchors still land | ✅ pass | lib/easy_text.test.mjs (T-T6j.13 reads ENTRIES); Chrome 8 Nov |
| T-T6j.28 | J19 | Chrome | Outside and inside links on Reproduce and Method | Outside links: new tab, noopener, ↗ mark; Tideline links: same tab | ✅ pass | Chrome 8 Nov: 77 outside links on Reproduce, 2 on Method, all new tab; no inside link opens a new tab |
| T-T6j.29 | J20 | Chrome + manual | Reproduce shows the Codespaces row; after the push, open a codespace and run npm run verify and npm run attest:check on the newest anchored day | Button opens codespaces.new for this repo in a new tab; in the codespace node -v is 24, npm ci ran, verify ends ALL OK, attest:check prints match | ⚠ partial | Chrome 8 Nov: row and link correct; gitleaks clean on .devcontainer. Codespace run waits for the push |
| T-T6j.30 | J21 | unit + Chrome | Method in Easy and Pro at 1366 and 375 (frame); ?state=error; the guard over the new Easy lines | Easy: plain line per section, detail folds open; Pro: five treasury points, the visibility block, table folded; no horizontal scroll; the error banner still shows | ✅ pass | lib/easy_text.test.mjs (chain and coverage Easy lines in the guard); Chrome 8 Nov |
| T-T6j.31 | J22 | Chrome | Concentration rolling panel; Method ?state=error | Banner as wide as the panel's inner width | ✅ pass | Chrome 8 Nov: 685 of 687px on Concentration; Method error banner full width |
| T-T6j.32 | J23 | cli + Chrome | Time when the main content arrives on Concentration and Follow the Fee; panel switch off | Content in well under a second, the panel after; with the switch off no panel box at all | ✅ pass | 8 Nov: content 53 to 143ms, panel done 1.2 to 3.1s; EXPLORER_PANEL=off npm test 295/295 |

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
