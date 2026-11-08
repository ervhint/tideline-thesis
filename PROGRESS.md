# Tideline progress

Phase: P7 Test + ship (workflow V12). **P7a done on 8 Nov (22:45 WIB), not committed yet:** the review fixes and the ticked TESTS.md wait for the human's yes. Next: G6 (the human clicks through on localhost:3112 and settles the points under "P7a: for the human at G6"), then P7b. Waiting for user: the commit, the Codespaces run (T-T6j.29), the Telegram question, ticket 79934.
Repo: `ervhint/tideline-thesis` (public) · Contract: `tideline-thesis.testnet` · App: localhost:3112 (AGENTS.md) until G6, then Vercel.

## State (8 Nov 2026, 20:40 WIB)

Readings as of the 7 Nov chain day (thesis.json 8 Nov 13:23 UTC): Q1 Neutral, Q2 Bullish, Q3 Not Measured, Q4 Neutral, Q5 Bullish; verdict Undecided on the A2 hold (Q3 held), score +3 of 7. The treasury carried 79% of counted USD over the last 7 frozen days.

Data: 35 frozen chain days, 4 Oct to 7 Nov 2026, no gaps; 7 Nov anchored on testnet (the Reproduce card reads "Anchored: 7 Nov 2026", 35 days all matching). Actions on 8 Nov: `attest-days`, the hourly `refresh` and `test` green.

Checked on 8 Nov before the last push: `npm test` 296/296 (also with `EXPLORER_PANEL=off`), `verify` ALL OK, `tsc`, `next build`, gitleaks on every changed file, wording scan clean, no panel figure in any diff.

**Setup done:**
- Repo secrets: `INTENTS_EXPLORER_JWT`, `NEAR_ATTEST_ACCOUNT`, `NEAR_ATTEST_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- cron-job.org: four jobs start this repo's workflows (docs/CRON.md): chain-day 10:17 and 13:17 WIB, attest-days 12:41 and 15:41, refresh hourly at :23, panel 09:07. The `tideline-cron` token covers this repo.
- This repo is the only one that freezes, anchors and refreshes.
- Localhost: `GITHUB_DATA_TOKEN` (Contents and Actions read) is in `.env`, so pages and the panel read from GitHub.
- `.devcontainer/devcontainer.json` (Node 24, `npm ci`, no keys) is on main, so "Open in Codespaces" on Reproduce works for anyone.

**Watch out:**
- A terminal that ran a local panel test may still hold `PANEL_FILE`. The site then reads only that file and shows "Rolling Panel: Not Available". Start the dev server from a fresh terminal.
- **Panel after idle (J26):** on localhost the dev server's first GitHub connections after a few idle minutes stall 15 to 20s, so the first view of Follow the Fee or Concentration can say "Not Available"; the next view works. The page itself is not held (J23). Check on Vercel; see Next 3.
- **Shell escaping on this machine:** the Bash tool collapses backslashes inside heredocs and `node -e` strings (a CSS `\2197` became a control character once). For regexes and CSS escapes, use the Edit tool or build the backslash with `String.fromCharCode(92)`. Python writes CRLF; edit with Node or the Edit tool.
- **Full-page screenshots** from the human sometimes show doubled rows or headings: stitching marks, not page bugs (seen twice on 8 Nov). Check the live DOM before fixing.
- **OneDrive** can touch `.git` mid-fetch ("cannot lock ref"); the pull still lands. Compare `git rev-parse HEAD origin/main` before committing.
- Gitleaks in Actions fails on a repo's first push (no parent for the root commit); a hand-started `test` run scans the full history.
- Telegram alerts only a failed `chain-day`. refresh messages only when a reading changes side; attest-days and panel send nothing.

## P7a: test (8 Nov, done, not committed)

- **Checks:** `npm test` 296/296 (also `EXPLORER_PANEL=off`), `verify` ALL OK (8863 values), `tsc` clean, `next build` with no warning, gitleaks over all 57 commits clean and on each changed file clean, wording scan clean.
- **Chrome sweep (Claude in Chrome, same-origin frames):** 8 pages + 28 state links × 1440 and 375 × Pro and Easy = 144 dev loads, plus 40 production loads with `EXPLORER_PANEL=off`. All clean: the right mode, no horizontal scroll, no broken text, no text from the other mode, every designed state shows (loading, stale, error, few, empty, anchored, mismatch). With the switch off, no page has any panel box, command or source line. Contrast lowest 4.94:1. Model slider updates V* in 5 to 8 ms.
- **TESTS.md:** 59 rows ticked with evidence. Still open: T-0.1 (Vercel), T-0.2 and T-T6j.29 (the human's Codespaces run), T-T6i.8 (blocked storage before load), N-1 (4G on Vercel), T-3.4 and T-5.6 (partial, said why), T-5.1 (the repo starts at one commit, so git can't show PREREG came first), T-6.3 (see below). Six old rows are marked "↷ replaced" (quote archive and Explorer pulls).
- **Fixed from `/code-review` and spec-review** (T-P7a.1 to .6): Easy's Q3 line and What This Means once Q3 is measured again (would have said "Not enough data yet" and pasted the Pro detail); Easy words in Elasticity's few-changes state (J5); the build traced the whole project into every server function (now only data/ and the deployment file, `next.config.mjs`); Reproduce's anchored/mismatch previews no longer give way to a live testnet failure; Model's Flat-path answer the same in both modes; "−0.0 bps" and a hyphen minus in Easy's Follow the Fee lead; panel fetch no longer retries a 401 or 404. No layout, figure, data/, thesis.json or THESIS.md changed.
- **Left as is (judgement calls):** the standards review found no breach of AGENTS.md, only duplication between Easy and Pro twin strings (ModelView, fee_view, thesis_view, easy_text); not refactored before ship. Two "Reading Mode" groups exist when the floating switch shows.
- **Files changed:** components/ModelView.tsx, components/ReproduceView.tsx, lib/data.ts, lib/easy_text.ts, lib/elasticity_view.ts, lib/fee_view.ts, lib/panel_source.ts, next.config.mjs, the three test files, docs/TESTS.md, this file.

### P7a: for the human at G6

Spec points where the code and docs/PLAN.md disagree. Each touches wording or layout you chose, so nothing was changed:
1. **T-6.3:** at 1440×900 Home shows the hero and the "4 of 5 Answered" card, but the gauge and the five readings need a scroll (gauge ends at 1528 px). The SRS asked for no scrolling; the approved layout scrolls. Keep the layout and close T-6.3 as "design changed"?
2. **E9 vs E10:** E9 says Easy's What This Means opens with "the overall answer is on hold"; E10 (your later request) put the answers first, so the hold comes third. Pro opens with the verdict. Fine as is?
3. **E10:** Easy still quotes questions in three places ("“Do the traders really compete?” cannot be answered").
4. **J7:** Easy says "Two signs look good" and "Good signs (Bullish)" (E9's wording), though J7 says "answers", not "signs". When the verdict is not on hold, the Glance card label "Verdict" is not swapped in Easy.
5. **E6:** term notes repeat on every reading row (Home, What Would Move) instead of once per section.
6. **J20:** "running free on your own GitHub account" is true only within GitHub's free Codespaces hours.
7. **756ba40:** Easy's Concentration panel line ("switch to Pro to see it") has no J item in PLAN.md.

**Watch out (found in P7a):** a stopped `next dev` or `next start` started from the Bash tool keeps running as an orphan node process. An old `next start -p 3113` from 14:42 today is still running; it serves an old build. After a `next build`, check that the HTML's CSS chunk exists in `.next/static/chunks` (once it did not, and the page showed unstyled); `rm -rf .next/static .next/server` and a fresh `next build` fix it.

## Next

1. **G6:** the human clicks through on localhost and gives an explicit yes on the look. Layout changes need their yes (design references are exact; J14, J16 and J25 already changed Figma S5 and S6).
2. **P7b ship (G7):** Vercel Preview, then Production, with `GITHUB_DATA_TOKEN` set on Vercel (and `EXPLORER_PANEL=off` if ticket 79934 says no). **Right after the deploy (the human asked to be reminded):** open Follow the Fee and Concentration after a few idle minutes and see whether the rolling panel's first view says "Not Available" there too (J26). If it does, the human decides whether the server may keep the last good panel in memory for a short time (a change to the "one request" rule). Then README demo link, pitch outline, demo script, demo video, final report.
3. **Waiting on the human:**
   - **Codespaces run (T-T6j.29):** click "Open in Codespaces" on Reproduce, then `npm run verify` (expect ALL OK) and `npm run attest:check 2026-11-07` (expect match). Report what it prints.
   - **Telegram:** add failure alerts to attest-days, refresh and panel (job name and run link only, no figures)?
   - **Ticket 79934:** no answer recorded. If no, set `EXPLORER_PANEL=off` on Vercel and in the panel job's repo variable.

## Unit on main: T6j Beautification and adjustment

Spec: docs/PLAN.md §6h, tests T-T6j.1 to .35 in docs/TESTS.md. Status: **J1 to J26 on main** (`7449bc2` J1 to J23, `ddf9cd8` J24 and J25, `923a5ab` J26, `756ba40` panel tries and the Easy "switch to Pro" line; all 8 Nov, `test` green each time). Open: T-T6j.29, the real Codespaces run.

- **J26 (8 Nov):** the panel's GitHub calls get 6s and up to three tries; a failure logs only a status code or error type (`lib/panel_source.ts`). The idle stall on localhost outlasts the tries (Watch out).
- **J25 (8 Nov):** the "77% Reported" card on Concentration is removed: its source could not be named. The panel now uses the full width. Changes Figma S6.
- **J24 (8 Nov):** Reproduce is fully static; the proof card asks our own `/api/anchor`, which caches a good check for 5 minutes and never caches a failure. Try Again re-asks in place.

- **J1 (8 Nov):** Easy only, Pro unchanged. Unexplained note in plain words (`easyBanner` in `lib/fee_view.ts`). Rolling panel in Easy: heading "Outside Count", the fixed sentence, the chart, marker "Private swaps begin (27 Oct 2026)" and one plain source line; the swaps and quote sentences are Pro only (`components/PanelNote.tsx`, labels in `EASY`). Banner titles and chart markers now take a node so they can swap words. `npm test` 289/289 (also with `EXPLORER_PANEL=off`), verify ALL OK, typecheck clean, wording scan clean, Chrome 1366 both modes (T-T6j.1, .2).
- **J2 (8 Nov):** the same two notes in a human voice in Easy (why before what, short sentences, "we"): "What We Couldn’t Explain" with one total and each non-zero group (`easyLeftOut` in `lib/fee_view.ts`), and "Another Tracker’s Count" with the new sentence and source line (`EASY`). Pro unchanged. The human will come back to Home next to carry this voice across the site.
- **J3 (8 Nov):** the top of Follow the Fee in the same voice in Easy: lead, bar labels, row names (`easyName`), row text, card label (`easyLabel` in NumberSheet) and number sheet. Numbers the same as Pro (T-T6j.5). `npm test` 290/290 (also panel off), verify ALL OK, wording scan clean, Chrome 1366 both modes. 375 checked under J4.
- **J4 (8 Nov):** floating Easy | Pro pill at the bottom right while the header is out of view (`ModeFloat` in `components/ModeSwitch.tsx`, mounted in Nav; CSS `.mode-float`). The human picked it over a sticky header or an always-on pill. Chrome 1366 and 375 (frame) pass; J3's 375 check done too. The Easy buyback line no longer leaves "(" at a line end.
- **J5 (8 Nov):** Elasticity in the same voice in Easy: head, text, plot key, a checks summary built from the runs with the rows in a "See Each Check" fold (Easy only), and the timeline words (`elasticityView(...).easy`, `easyElasticity`, `IntervalPlot`). Pro unchanged. Chrome 1366 and 375 (frame) both modes.
- **J6 (8 Nov):** Home's five rows in Easy: Q1 asks "When fees go up, do people stop swapping?" (apps changed their fees, not NEAR), and each row's line is the answer in plain words from the same files (`easyReadingLine`, wired in `lib/data.ts`, shown by ReadingCell). Pro unchanged. Chrome 1366 both modes.
- **J7 (8 Nov):** one Easy word per thing on every page: swapping, traders, app, the private system, NEAR's fee income, answers, overall answer, still missing each month. Easy titles and links for Elasticity, Concentration and What Would Move; Reproduce names the questions; Concentration and Model labels and lower boxes in plain words. Method's body stays Pro. Guard T-T6j.13. `npm test` 293/293. Chrome scan of all eight pages in Easy.
- **J8 (8 Nov):** Pro wording across pages: the two swap kinds named once (fee-tagged, logged as token_diff; plain transfer), round trips instead of paired flows, the negative spread explained, the panel's pairs and whose app fee named with the rest shown, pass-through named, dropped fee changes and the MDE rule stated, SwapKit "accounts for", the confidential share defined, Model's fee rate told apart from the realised cost. thesis.json and THESIS.md untouched (display-time only). `npm test` 294/294. Open: the 77% card names no source.
- **J9 (8 Nov):** term notes drawn on <body> with a fixed position, so no glass panel covers them; above the word when there is no room below; they follow on scroll. Chrome: Home readings row, bottom of screen, number sheet, Escape.
- **J10 (8 Nov):** Follow the Fee's number card and sheet: Easy shows "$75.72 on a $10,000 swap" under 75.7 bps and a plain query line; Pro's query line names only this number's query.
- **J11 (8 Nov):** Model spacing under the panels matches Elasticity (32px to the link, 24px to the button).
- **J12 (8 Nov):** Model's gap from intro to gauge panel 48px in both modes (was 104px); Home unchanged.
- **J13 (8 Nov):** Model's gauge panel lines up with the column and sits 32px above the panels below (Gauge `inset`); Home unchanged.
- **J23 (8 Nov):** the rolling panel streams in on its own on Concentration and Follow the Fee (`PanelSlot`), so the pages show in about 0.1s instead of waiting 1.2 to 3s for GitHub.
- **J22 (8 Nov):** banners inside glass panels fill the panel width (Concentration's rolling panel, Method's error banners).
- **J21 (8 Nov):** Method: Easy opens each section with a plain line from the data and folds the detail; Pro gets the treasury note as points, the visibility ratio in its own block, and the activity table folded.
- **J20 (8 Nov):** "Open in Codespaces" on Reproduce with `.devcontainer/devcontainer.json` (Node 24, npm ci, no keys). Waiting on the push to main, then one real codespace run by the human.
- **J19 (8 Nov):** links that leave the site (GitHub files, NearBlocks contract, Report It on GitHub, Method sources) open in a new tab with a ↗ mark; Tideline links unchanged.
- **J18 (8 Nov):** Reproduce's Every Reading and Chart grouped into readings, charts and side measures; Easy shows plain sentences with the files folded; dip4 explained in Pro; the J7 guard now covers these words.
- **J17 (8 Nov):** Reproduce's testnet check runs six days at a time with one retry per call and logs why it failed; Try Again re-checks only the card; Going Further rows get dot markers.
- **J16 (8 Nov), replaces J14 and J15:** Reproduce as numbered steps with small terminal frames and copy icons (install-guide pattern), Going Further in the same form; the proof card streams in on its own, so the page shows in under 0.1s instead of waiting about 5s.
- **J15 (8 Nov, replaced by J16):** Reproduce as a recipe: proof card, then three numbered steps (get the code, verify, attest:check with the newest anchored day), then Going Further with what each extra needs.
- **J14 (8 Nov, replaced by J15):** Reproduce reordered at the human's pick: proof card first at full width, then the commands two to a row with Copy inside each; phones stack them. Changes Figma S5.
- **Done by J8 (was noted, not done in J1 because the human said Easy only for now):** the quote line's app fee is the one the API adds to our own test quotes, not what real swaps paid, and the two read as a clash; the quote breakdown leaves the rest unnamed; the Unexplained counts have no denominator. (No panel figure written here: 4.1(e).)

## Unit on main: T6i Easy and Pro

Spec: docs/PLAN.md §6g (the human's five answers are recorded there, 8 Nov: switch inside the nav pill and first in the phone menu; hint as tooltip only; `?mode=easy|pro` share link that leaves the address bar; term notes in both modes; BEGINNER.md used, then deleted). Status: **on main** (`2c025fa`, 8 Nov). At the time: `npm test` 283/283 (also with `EXPLORER_PANEL=off`), `verify` ALL OK, `next build`, gitleaks on lib, components, app and docs, wording scan clean. `data/`, THESIS.md, `/api/*` and README unchanged.

- **How it works:** `lib/mode.ts` sets `html[data-mode]` before first paint (share link, then `localStorage` key `tideline-mode`, then Pro; every storage call in try/catch). `components/Say.tsx` renders both texts and CSS hides the other with display:none. `components/ModeSwitch.tsx` is two buttons with `aria-pressed`; its pressed look follows the html attribute, so nothing flashes. `components/Term.tsx` and `lib/glossary.ts` give the notes (24 words, no figures); Easy strings mark them as `[[word]]` or `[[words|key]]`.
- **Easy words:** `lib/easy_text.ts` (Home, Elasticity, fixed text, the five questions) and `easy` fields beside the Pro ones in `lib/fee_view.ts` and `lib/thesis_view.ts`, each built from the same values. Numbers, charts, tables and headings are not swapped. The rolling panel gains one fixed Easy sentence with no figure.
- **Tests:** `lib/easy_text.test.mjs` (T-T6i.1, .3, .4, .5 and the head script), T-T6i.2 in `lib/typed_text.test.mjs`. The allow-list gains three entries for `lib/easy_text.ts`: the pre-registered lines, the size buckets and $10,000, and the issuance presets. No live figure.
- **Chrome (8 Nov):** the window gives a 1366 viewport. All eight pages in Easy with no horizontal scroll; error and stale previews; 375 checked in frames for the phone menu and a term note. Pro looks as before apart from the switch and dotted notes on side labels and three Method source names.
- **E9, added 8 Nov at the human's request (sketch approved):** while A2 holds the verdict, Home leads with the readings. Card "4 of 5 Answered", five side dots and "On hold: 79% went private" under the bar (the dots sit there because beside the title they meet the ring). Under the hero: Pro "2 Bullish, 2 Neutral, 1 Not Measured." and Easy "Two signs look good, two are unclear, and one cannot be answered right now.", then the reason in smaller grey text. Easy What This Means opens "the overall answer is on hold (Undecided)"; Pro's comes from thesis.json and is unchanged. All from data; back to the verdict when the shares fall to 50% or less. The verdict rule, thesis.json and THESIS.md are unchanged. `npm test` 284/284 (also panel off), verify ALL OK, `next build`, gitleaks per folder clean, wording scan clean, Chrome 1366 and 375 (frames) both modes (T-T6i.13, .14).
- **E10 and E11, added 8 Nov at the human's request:** What This Means says each point once in both modes (Pro in `analysis/thesis_text.mjs`, so the five stored sentences in `thesis.json` change, no number does), and the page builds it live from GitHub's file with the same function. Above it, three cards the same in both modes: private share against the 50% line, the score on −7 to +7 (grey while held), and what nobody can see; the full text sits in a fold, the advice lines stay visible. T-T6i.15 to .18.
- **E12, added 8 Nov at the human's request:** the hero in plain words in Easy ("Swaps Must Grow / to 3.3× Today", "so fees can buy back the new NEAR coins.", "Swapped Last 30 Days", "still missing each month"); numbers and layout unchanged, Pro unchanged. T-T6i.19.
- **Partial:** T-T6i.8 (blocked storage before load is unit-tested only) and T-T6i.10 (no full 375 sweep of every page in both modes). Both go into P7a.
- **Seen, not ours:** the Next dev overlay sometimes reports a head mismatch caused by a Chrome extension injecting `injection-topics.js` into the page.
- **Commit note:** pull main right before committing (the hourly refresh moves the data), then `npm test` and `verify`.

**Old handoff (8 Nov, 13:45 WIB), kept for history; done since:**
1. Let the human click through on localhost:3112 in both modes. Any wording or layout change needs their yes (design references are exact).
2. Optional before the commit: the full 375 sweep of every page in both modes (T-T6i.10), and a real blocked-storage page load (T-T6i.8, for example Chrome site settings blocking site data for localhost, changed only by the human). Otherwise both go into P7a.
3. On the human's yes: `git pull` main, `npm test` (also `EXPLORER_PANEL=off`), `npm run verify`, gitleaks on the changed files, `.private/wording-scan.mjs`, then commit. Files: `lib/easy_text.ts`, `lib/easy_text.test.mjs`, `lib/glossary.ts`, `lib/mode.ts`, `components/Say.tsx`, `components/Term.tsx`, `components/ModeSwitch.tsx`, plus edits in `app/` (all eight pages, layout, globals.css), `components/` (Banner, ModelView, Nav, NumberSheet, Page, PanelNote, ReadingCell), `lib/` (data, elasticity_view, fee_view, thesis_view, typed_text.test), docs/PLAN.md, docs/TESTS.md and this file. BEGINNER.md is deleted on purpose (the human's answer 5).
4. Watch-outs: Python on this machine writes CRLF; edit with Node or the Edit tool. The dev server needs a fresh load after moving code between files, or the overlay shows a stale mismatch.

## Units on main: T6g Words follow the numbers, T6h THESIS.md follows the data

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
