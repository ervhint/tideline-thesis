# Tideline: build plan

Status: T0 to T6j done (T6j J1 to J26 on main, 8 Nov); P7a test done and G6 passed 8 Nov; next is P7b. Current state is in PROGRESS.md.

## 1. Why the stored record is public chain data only

The 1ClickSwap API Terms (partners.near-intents.org/legal/terms-of-service, updated 7 Oct 2026), which apply to anyone who generates a key or uses the API:
- **§4.1(e):** no caching, storing or archiving of API data beyond 24 hours, except static transaction records needed to show end users their own history;
- **§17.6:** §4 keeps applying after the terms end.

A re-runnable thesis has to keep its inputs. So everything stored here, and every reading and the verdict, comes from public chain data and keyless sources, which anyone can store and re-fetch. The Explorer and 1Click APIs feed only the rolling panel, which is re-pulled daily, kept at most 24 hours and stored nowhere (docs/EXPLORER.md).

## 2. What the chain gives us (checked 4 Nov 2026)

Checks against FastNEAR (`tx.main.fastnear.com`, no key), on `intents.near` transactions signed by `intents.near` itself (the settlement transactions):

| Question | Answer | Evidence |
| --- | --- | --- |
| Is the frontend on chain? | **Yes.** `dip4` `token_diff` events carry `referral`, written as `1click-<partner>` (`1click-swapkit`, `1click-lifi`, `1click-rango`, `1click-aurora-…`, `1click-cow`) plus a few non-1Click ones (`intents.tg`) | 2,000 settlement transactions from 3 Nov: 377 swaps with a referral, 33 distinct referrals |
| Can the frontend be unknown? | **Yes, often.** `1click-unknown` was 100 of 377 swaps (27%). Whether other sources name these frontends is not known | Same sample |
| Amounts in and out? | **Yes,** per account and token, in raw units (`diff`) | `token_diff.data[].diff` |
| Protocol fee? | **Yes,** `fees_collected` per token on every `token_diff` | Same |
| App fee? | **Indirectly.** It shows up as a separate `dip4` `transfer` from the user to a fee account in the same transaction. The rate has to be worked out as transfer ÷ swap amount | Example transfers to `5880ad…` (the account AC-3.3 asks about) |
| Solver? | **Yes,** the other side of the `token_diff` (`solversOfSwap` in `analysis/solvers.mjs`) | SRS E3 |
| USD value? | **Not on chain.** DefiLlama `coins.llama.fi` gives historical prices with no key (wNEAR found; `*.omft.near` tokens need a mapping to their CoinGecko ids) | curl, 4 Nov |
| Full history for free? | **No.** About 90,000 settlement transactions a day now (about 17,500 in Aug 2025), 24.5M in total. Reading a transaction's logs takes one call per 20 transactions. At the pace FastNEAR's free tier allowed (about 1 call a second before 429s), one day takes about 3 hours to read in full. Listing is cheap: 200 hashes per call, about 8 minutes a day | Timed run: 2,000 transactions in 250 s, 113 calls, 3 retries after 429 |
| Other free archives? | BigQuery `crypto_near_mainnet_us` is still live: on 7 Nov 2026 `execution_outcomes` had `intents.near` rows through that day, though NEAR Lake stopped on 24 Mar 2026 (corrects the 4 Nov note here). It needs a Google account, so it is used only if T5b passes, for old history. Dune isn't free. Flipside wasn't reachable (SRS 1.3) | BigQuery console, 7 Nov |

**What this means:** today's flow can be measured from the chain every day. Months of full history can't be, at free-tier speed. So Tideline **samples** each day, using a seeded random draw from the full list of that day's settlement transactions. The other route is to pull only the transactions that name one account. Every number carries a sampling interval.

The chain covers all Intents settlement, not just the 1Click share (the Explorer holds about 38% of DefiLlama's volume, SRS D21). Whether the sample's volume reconciles with DefiLlama is the first thing the spike checks.

## 3. Sources

| Use | Source | Key | Stored in the repo |
| --- | --- | --- | --- |
| Swaps, referral, fees, solvers | FastNEAR transactions API (open source: github.com/fastnear/explorer-api) | None | Daily summaries by referral × fee × size bucket, plus the sampled transaction hashes, so anyone can re-fetch the same sample |
| Spot checks | NEAR archival RPC | None | Hashes and results |
| Volume, fees, revenue, buybacks (V*, Q2, Q5) | DefiLlama | None | Yes |
| USD prices | DefiLlama coins | None | Prices used, per token and hour |
| Token names | `ft_metadata` on chain over RPC | None | Yes |
| Issuance, supply, protocol fee | RPC and the `intents.near` contract | None | Yes |
| Control venues | DefiLlama (CoW, 1inch, 0x, KyberSwap, LI.FI) | None | Yes |

**Not used:** the Explorer API and the 1Click API (their terms, §1). The same goes for Binance minute prices until its API terms are read. Check before building: whether FastNEAR and DefiLlama publish terms that limit storing their data. Neither had terms we could find on 4 Nov.

## 4. Each reading and where it comes from

| Reading | How |
| --- | --- |
| V* and its date path (E5) | DefiLlama + RPC (`lib/model.ts`). Live now |
| Q2 NEAR's share of fees | DefiLlama. Live now |
| Q5 path to deflation | DefiLlama. Live now |
| Model page, sliders | `lib/model.ts`. Live now |
| Q4 largest integrator | 30 sampled days. Share of fees by referral, with a bootstrap interval. `1click-unknown` is shown as its own row, never counted as one integrator |
| Q3 top-3 solvers (E3) | The same sample gives the solver directly |
| Q3 solver spread | Realised cost: what users actually got on chain vs the DefiLlama price at that hour, minus app and protocol fees. It measures real fills, not quotes, but hourly prices are coarser than minute prices, so small spreads read less precisely. Threshold wording goes in PREREG.md |
| Follow the fee (FR-05) | Built from realised swaps, by size bucket. Route detail only where the sample is large enough |
| Q1 pricing power (E1) | **At risk.** See §5 |
| E2 pass-through | The same realised cost, per event window, only if §5 finds the events |
| Coverage board (FR-21) | Tokens seen in the sample, named from `ft_metadata` |
| Attest contract | `tideline-thesis.testnet`. It anchors each day's chain sample file, so the attested data is ours and fully re-fetchable |
| Alarm, refresh, BFF, feeds, verify | The refresh job runs the chain sample each day |

## 5. The hard part: elasticity (Q1)

Q1 needs fee-change events: days when a frontend changed its fee rate. Two routes from chain data, both measured in the spike before we commit:

1. **By fee account (preferred).** FastNEAR indexes accounts named in event logs (`is_event_log`). A frontend's fee account (for example `trustswapkit.near` for SwapKit, with about 350,000 transactions in an earlier check) therefore lists every swap that paid it a fee, and only those need reading. This works for events where the frontend **already charged a fee before** the change. It can't see the "before" side of a 0 → X event, because a 0-fee swap pays no one.
2. **By sampling** the event windows from the full transaction list. It covers every event, but small frontends get too few swaps per window, and the cost (about 15 minutes a day of history at a 10% sample) adds up to days of runs.

**Honesty point:** Tideline can't be pre-registered blind. An earlier private analysis by the same author, on Explorer data, estimated elasticity from fee-change events, and that result has been seen. PREREG.md must say so on its first line. The fee-change events are found from chain data by the event rules written into PREREG.md before any volume is read, with no changes after.

If neither route gives at least 3 usable events, Q1 reads Not Measured (SRS D2), and the verdict rule decides whether the thesis still reads anything. This could be the real result: Tideline may end up with four readings and an honest blank.

## 6. Units

Deadline 14 Nov 23:59 UTC.

| # | Unit | Est. | Done when |
| --- | --- | --- | --- |
| T0 | **Repo.** Site and docs; secrets added; `contract-deploy` to `tideline-thesis.testnet` | 3h | Done 4 Nov: `npm test` passes, site runs locally with DefiLlama readings, contract deployed |
| T1 | **Spike, go or no-go.** One-day chain sampler. Measure time per day, 429 rate, settled volume vs DefiLlama, `1click-unknown` share, app-fee detection, price coverage, and the fee-account route for 3 real events | 4h | Numbers written down. **Go** if a daily sample runs in under 30 minutes in Actions and the sampled volume lands within ±25% of DefiLlama. Otherwise stop and decide with the human |
| T2 | **Daily chain snapshot.** Seeded sample per day, snapshot by referral × fee × size bucket, freeze and attest each finished day, verify recomputes it with no network | 6h | `npm run verify` OK; `attest:check` MATCH on a frozen day. Built 4 Nov (`pipeline/chain_day.mjs`, `analysis/chain_day.mjs`, `chain-day.yml`); first day 2026-11-03 frozen and anchored; schedules on. Also part of T2: a Tideline-only Telegram bot (secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) for failed days and side-change alarms, tested with a real message. Done when the first scheduled day (5 Nov) freezes and anchors by itself |
| T3 | **Backfill 30–60 days** in Actions runs (for Q4, solvers, fee trace) | runtime | Days frozen, gaps shown, never filled in |
| T4 | **Realised cost.** Q3 spread and Follow the fee from realised swaps; PREREG.md with the not-blind statement | 5h | Cost parts sum within 0.5 bps, remainder shown (INV-4). Done 5 Nov: parts gap 0.00 bps; Q3 Bearish (spread 53.7 bps, top 3 77%) |
| T5 | **Elasticity on chain** by the §5 route the spike picks; E2 only if it fits | 8h | Elasticity outputs as SRS E1 defines them, or Q1 Not Measured with the reason |
| T6 | **Wire-up.** Readings, thesis text, method page, every page in Chrome at 1440 and 375 | 6h | V11 unit report rules |
| T6b | **Confidential shift** (§6b). PREREG A2 in code, treasury day files, site wording | 8h | §6b done list |
| T6c | **Thesis and re-run steps.** Public `THESIS.md` (claim, evidence for, evidence against, what would change my mind); README re-run steps; each chart's query and plain sentence checked | 4h | The track page's asks met; Chrome tests pass |
| T5b | **Elasticity history, if there is time.** One-day BigQuery test, PREREG amendment, one saved read of `intents.near` logs to 1 Sep 2025, E1 and E2 re-run. Stops if the one-day test fails | 8h | Elasticity page reads from the longer history, or the reason it can't |
| T5b | **Elasticity history.** Done 7 Nov: one-day test, PREREG A4, one saved read of 818 GB, 21 usable fee changes, Q1 Neutral | | Done |
| T6d | **Rolling panel.** Done 7 Nov: docs/EXPLORER.md, PREREG A3 | | Local tests pass; a real run needs the repo |
| T6e | **Track brief charts** (§6c). Activity chart on Method, a per-day chart in the rolling panel, the README note on the terms | 4h | §6c done list |
| T6f | **Nothing stuck** (§6d). Weekly BigQuery activity job; protocol fee re-read hourly | 2h | §6d done list |
| T6g | **Words follow the numbers** (§6e). Five sentences built from data, and a guard test against typed figures on every page | 3h | §6e done list |
| T6h | **THESIS.md follows the data** (§6f). Its figures from `thesis.json`, never typed | 3h | §6f done list |
| T6i | **Easy and Pro** (§6g). An Easy / Pro switch on every page, Pro by default; Easy words built from the same data; tap-to-explain notes on hard words | 7h | §6g done list |
| T6j | **Beautification and adjustment** (§6h). Wording, look and speed fixes the human found while clicking through, J1 to J26 | done 8 Nov | §6h done list |
| T6k | **Telegram for users** (§6i). One bot, two chats: job failures and raw changes to the human only; Easy-worded changes after a 3-day hold and a Monday note to a public channel. Before Vercel | 5h | §6i done list |
| T6l | **All Charts page** (§6j). Every chart on one page, each with its takeaway, one plain sentence and its query, in Easy and Pro. Reuses each page's own chart and words | 5h | §6j done list |
| T7 | **P7.** Vercel, README, video | per workflow | G6 and G7 |

About 32 hours of work plus Actions runtime, which is tight but fits if T1 passes by 6 Nov.

## 6a. T1 results (4 Nov 2026, day 2026-11-03)

Three one-off measuring runs in Actions: 41781760546 (sample of 4,000), 41783958481 (sample of 2,000 plus solver census), 41790799455 (fee-account route, 52 weeks). Keyless FastNEAR and DefiLlama only.

| Measure | Result |
| --- | --- |
| Settlement transactions (signed by `intents.near`) | 90,684 on the day; listing takes 8 to 10 min (454 calls) |
| Free-tier pace | 1 call a second: 429 on 2% to 5% of calls (15 of 825, 115 of 2,972, 25 of 518), all recovered, no errors |
| Sample run (list + read 4,000) | **12 min.** Only 8% of settlement transactions hold a swap, so 4,000 give about 350 swaps |
| Sampled volume | $20M with a 95% interval of $1M to $39M (run 1), $20M with -$6M to $47M (run 2). One $300k swap in the sample carries most of it. **A sample can't pin daily volume down** |
| Solver census | Every transaction whose dip4 logs name one of the 17 solvers seen in the sample: 38,223 transactions, **7,722 token_diff swaps, $9.30M in** (97% of swaps priced). It holds 98.8% of the sample's token_diff swap transactions. Solvers picked from half the sample fill 94% of the other half's swaps (100% of their USD). **Not complete:** both checks only see swaps written as a token_diff with a referral. Swaps filled by plain dip4 transfers carry no referral and aren't counted; they likely sit in the census's other ~30,000 transactions. A private cross-check (not stored here) says the count is well short. Under check in a fourth run |
| Census run time | **45 min** without the full listing (5 min listing solvers, 38 min reading), 56 min with it. The solvers' accounts also appear in about 30,000 settlement transactions that are not swaps |
| Volume vs DefiLlama ($137.9M) | **Census ×0.067.** All token_diff ÷ 2 gives the same ($9.06M). DefiLlama's number is one value from NEAR's Dune dataset `dataset_near_intents_metrics.volume_amount_usd`, whose definition is not public. Transactions not signed by `intents.near` (35% of those sent to it in the first hour; signers `escrow.ai.near`, `bridge-mng.near`, `omni-relayer.bridge.near`) held no token_diff swaps (0 of 200). DefiLlama covers all Intents, not just 1Click, so it isn't the right yardstick for the 1Click count either |
| Prices | 97% of swaps priced (HOT tokens mapped from base58 addresses). Both sides of a swap agree within 5% on 99.9% of 3,396 checked swaps, median 0.9998, so ids and decimals are right. Unpriced: HOT TON tokens (`1117_`), `tron-` and `sol-` omft tokens |
| `1click-unknown` | 36% of swaps, 17% of USD (census) |
| App fee | A dip4 `transfer` from the swapping account on 81% of swaps; its rate is readable on 76%. `5880ad…` (AC-3.3) receives on 43% of swaps, at about 5 bps, across many referrals |
| Protocol fee | `fees_collected` on 99% of swaps, median 0.01 bps |
| Solvers | Found for 100% of census swaps. Top: `blockzen-1-main.near`, `solver-priv-liq.near`, `solver-multichain-asset.near`, `kipseli.near` |
| Referral mix (census USD) | LI.FI $2.85M, SwapKit $2.25M, unknown $1.57M, Rango $1.00M, Zodl $0.32M; 90 referrals |
| Fee-account route | Works and is cheap: 2 calls a week, a year of one account in about 2 min, history back to Nov 2025. **No clean fee-change event found.** SwapKit `trustswapkit.near` 70 bps every week for a year; LI.FI `fae85d…` 5 bps since Mar 2026; `2f09a4…` 70 bps with two one-week dips (noise). `dde5bb…`, `c4d748…`, `2da316…` are shared by several apps at different rates, so their weekly mode flips. One candidate: `dde5bb…` (SwapKit apps) mostly 20 → 10 bps around 17 to 24 Mar 2026, not clean |

**Run 4** (41797905924, `pipeline/chain_gap.mjs`): the missing swaps are transfer fills, almost all through one hub.

| Measure | Result |
| --- | --- |
| Hub | `51e8f94d…7cbe` sends transfers to and gets them from hundreds of accounts in the sample; it is in no token_diff. Census over the 17 solvers plus the hub: 66,999 transactions |
| Transfer swaps | **13,208 swaps, $24.96M** (an account sends tokens to a filler and gets a different token back, always across two transactions). 13,080 of them ($24.10M) through the hub |
| All swaps | token_diff 7,669 ($8.78M) + transfer 13,208 ($24.96M) = **20,877 swaps, $33.7M**. By size: $0–1k 17,821; $1k–10k 1,918; $10k–100k 509; $100k+ 52. A private cross-check (not stored here) agrees closely on count and size mix; USD is somewhat short in the largest swaps, where 577 unpriced swaps also sit |
| Referral | **Transfer swaps carry no referral**: 13,128 of them have no fee transfer in the census transactions, so no frontend can be named for about 63% of swaps and 74% of USD. Whether their fees show up elsewhere (fee accounts' own listings) isn't checked yet |
| Run time | 94 min (13 min listing fillers, 68 min reading). A daily job without the full settlement listing: about 80 min |

**Run 5** (41825809719, `pipeline/chain_attrib.mjs`): can transfer swaps be named? No. 300 accounts that swapped through the hub, each followed through all its transactions that day (most have 2 to 4): 79% pay no fee to anyone; 19% pay only `609214…`, a fee account shared by SwapKit, LI.FI and unknown swaps, so it names no one; 1% carry a referral (`1click-unknown`); none pay a single-referral fee account. The hub itself pays no fee accounts either. So on chain, **transfer swaps (about 63% of swaps, 74% of USD) can't be named to a frontend.** Any app fee on them, if there is one, isn't a visible transfer.

**Gate as written: not met.** But the count question is mostly answered: chain data finds about the right number of swaps and most of the USD. The open problem is naming the frontend for transfer swaps (Q4, Follow the fee). Decision in §7.

## 6b. T6b plan: the Confidential shift (7 Nov 2026)

PREREG.md amendment A2 is the definition; code that differs is the bug. Why and what was measured: PROGRESS.md, T6b.

**Rules in code (A2 rules 1 to 6).**
- `analysis/treasury.mjs` (new): the treasury account, the treasury share (rule 1), the treasury day file and the confidential share (rule 8).
- `analysis/readings.mjs`: Q3 and Q4 take the treasury share of their own window (7 and 30 frozen days) and read Not Measured over 50%, with the side figures kept on the reading (rules 3, 4). `verdict` takes the readings held and answers Undecided, with the score unchanged (rule 5).
- `analysis/realised_cost.mjs`: treasury groups leave section 5 and section 8 (rule 2). `feeTrace` splits public swaps only and gives treasury groups a `confidential` line with the all-in cost and no app fee or spread field (rule 6).
- `analysis/thesis_text.mjs`, `lib/thesis_view.ts`, `lib/fee_view.ts`: the hold reason, the side figures, the confidential path. A held score of +3 must not read as "does not reach either line".

**Treasury day files (rule 8).** `data/treasury/<day>.jsonl`, a folder of their own, so nothing that walks `data/chain` (attest, recompute) sees them. Rows are direction × listed filler or other × token, with raw amount, USD, and counts of priced and unpriced transfers. No account but the treasury is named.
- Daily: `chain_day.mjs` already reads every treasury transaction for its census, so it writes the treasury file from that same read, with no extra FastNEAR calls. The census is near its time cap (PROGRESS, Watch), so a second read of the same transactions is not affordable. A failure here logs and leaves a treasury gap; it never stops the chain day freezing.
- Backfill: `pipeline/treasury_day.mjs <day>` lists and reads the treasury's transactions only, with the filler list from that day's `data/chain` header. `treasury-backfill.yml` runs one day per job, 4 Oct on, by hand.
- `pipeline/build_confidential.mjs` writes `data/published/confidential.json`, in `npm run rebuild`, `refresh` and `verify`. Treasury share per day needs only frozen chain days, so it is live before the backfill; confidential share reads Not Measured until a day's file exists.

**Census split (added 7 Nov, the human's ask).** One runner stops at 300k transactions an account (listing cap) and about 325k read (time cap), and the census was 204k on 5 Nov. `chain-day.yml` now runs a start job, 4 read jobs by block range and a freeze job. Rows are sorted by hash before freezing, so the file does not depend on the split, and a missing part stops the freeze.

**Are the treasury files anchored?** From the first day recorded after 7 Nov 2026, yes: the contract keeps one write-once record a day, so the day's treasury file hash rides in that record's `readings` string, and `attest:check` compares it. No contract change. Days already recorded carry no such hash and never can.

**Site.** Text in existing slots only, no new layout, so nothing here needs a rule 21 question: the home lead and body lines, an existing `s-row` on Follow the Fee for the confidential path, notes on Concentration, What Would Move and Method. A chart of the shift would be a design change and is asked first.

**Done when:** A2 rules 1 to 8 have tests; `npm test`, `verify`, gitleaks and Chrome at 1440 and 375 for every state pass; code review is clean. The backfill can only run once this is on main, which needs the human's command.

## 6c. T6e plan: Track brief charts (written 7 Nov 2026)

**Why.** Checked against the track brief (`nearai/near-hackathon-prompt-examples`, `tracks/02-thesis.md`) on 7 Nov: all five asks are met. Two are weak:
1. The brief asks for a pull from the Explorer API for swap volume. The pull exists, but the site shows it only as one sentence, and a judge can't tell why it is not in the thesis.
2. The brief asks for "each chart, the query behind it, and one plain sentence". The BigQuery activity numbers (active accounts, transactions, contract usage, which the brief names) are a table on Method, with no chart.

The site has very few charts: the gauge on the home page and the interval plot on Elasticity. The rest are tables and text, each with its query link. This unit adds charts only where the brief names the data. It does not turn other tables into charts.

**One unit, one chat** (workflow rule 14). Opus 5.5 · medium (§9, a normal unit; go to high only if stuck). Build order: B, then A, then C. B sets the chart's look, and A reuses it.

**Before any code: show the user the design** (AGENTS.md: design references are exact; rule 21). One sketch per chart at 1440 and 375, in the gauge and interval plot's language (thin track, the site's tokens in `app/globals.css`, Overpass ticks; docs/DESIGN.md). Build only after the user's yes.

### B. Activity chart on Method

- **B1.** In "Public Activity on intents.near", a chart sits above the table: one small chart per measure (Transactions, Signers a Day, Receipts, NEAR Burnt) over every week in `data/published/activity.json` (12 weeks now, while the table keeps the last 8). Each chart has its name, its latest value, and the first and last week. One chart with four lines would flatten the small measures, so it is four small charts. At 375 px they stack or sit 2 × 2, with no sideways scroll.
- **B2.** A thin marker at the week holding 27 Oct 2026, labelled "Confidential settlement begins". The counts rise after it because of Treasury traffic, which the sentence above already says. Nothing calls a change here a change in demand or in swaps.
- **B3.** The data is `getActivity()` only. No new query, no new file, no change to `analysis/activity.mjs` or the published file. `npm run rebuild` and `verify` give the same results as before.
- **B4.** The sentence, the table and "Open the Query" stay as they are. The Reproduce entry `activity` (`lib/reproduce_entries.ts`) says "chart and table" in its sentence.
- **B5.** States: file missing or no weeks → the existing "Could Not Load Public Activity" banner and no chart. One week only → no chart, table only. A week is never drawn as zero to fill a gap.
- **B6.** A plain SVG component in `components/` with no new npm package (ponytail), `role="img"` and an `aria-label` that gives each measure's first and last value. It is pure and data-agnostic, so A can use it.

### A. Per-day chart in the rolling panel (Explorer API)

Terms first (AGENTS.md, "Terms rules"; docs/EXPLORER.md). A per-day total is still a total. It lives in the same artifact (`retention-days: 1`), is rebuilt each day, and sets no reading. Nothing in this part may weaken a guard in `pipeline/panel.test.mjs` or `verify`'s API-data scan.

- **A1.** `foldRows` in `analysis/panel.mjs` also keeps a per-day total (`swaps`, `usd`) for each finished UTC day, in memory, from the same rows. Same-token and unpriced rows stay out, as now. No referral, frontend, account or per-swap field goes in the per-day total.
- **A2.** `panelDoc` adds `byDay: [{ day, swaps, usd }]`, one entry per day pulled in the window and sorted by day. A day the pull did not finish is left out, never written as zero (check how `pipeline/panel.mjs` handles a failed page first). The sum of `byDay` USD equals `swaps.usd`.
- **A3.** `PanelDoc` and `panelView` in `lib/panel_view.ts` carry the series. A doc without `byDay` (the artifact made before this ships) shows the panel's text with no chart, never an error.
- **A4.** `PanelNote` shows the chart where the page picks `swapsText` (Follow the Fee), drawn with B's component: daily USD over the window, with a marker at 27 Oct and the caption "From the Intents Explorer API, re-pulled daily, kept 24 hours, stored nowhere. It sets no reading." Concentration (`frontendText` only) gets no chart.
- **A5.** States, as now: `EXPLORER_PANEL=off` → no panel and no chart; over 24 hours old or unreadable → "Rolling Panel: Not Available" with no chart; live → chart and text.
- **A6.** Guards: any new file that only the panel uses goes in `API_CODE` in `pipeline/panel.test.mjs`. B's component is shared and imports nothing from the panel, so it stays out of `API_CODE`. `panel.yml` is not changed. The job log prints no figure.
- **A7.** `docs/EXPLORER.md` "What is in it" adds the per-day totals. No figure from the API goes in any doc, the README, THESIS.md, the pitch or the demo video.
- **Testing:** with a fixture panel file (`PANEL_FILE`, outside the repo; the PROGRESS "Watch out" note applies). The real panel pull runs only in Actions (AGENTS.md: nothing else runs locally), so the first real chart appears after this is on `main` and the 09:07 WIB `panel` run. That run is the one later check the unit report may name.

### C. README note on the terms

- **C1.** At the top of README.md, under the first line, a short note: why the Explorer data is only in the rolling panel, with a link to the [1ClickSwap API Terms of Use](https://partners.near-intents.org/legal/terms-of-service) and Section 4.1(e) named. The terms page has no section anchors, so the link goes to the page. The same terms are mirrored at docs.near-intents.org (`/near-intents/integration/distribution-channels/1click-terms-of-service`). Both read "Last Updated: October 7, 2026" on 7 Nov.
- **C2.** Draft: "**Why the Explorer data is only in the rolling panel.** The track asks for swap volume from the NEAR Intents Explorer API. Its terms (Section 4.1(e)) do not allow storing API data for more than 24 hours, so Tideline shows it only in a panel that is rebuilt each day and kept for one day. The thesis and the verdict use stored public data (BigQuery, chain reads, DefiLlama) that anyone can re-run."
- **C3.** No API figure in the note. Intents Technology is named only as a technology provider, if at all (terms 3.5).

**Done when:** the user approved the design; T-T6e.1 to T-T6e.12 pass (docs/TESTS.md); `npm test`, `verify`, `npm run build`, the API-data scan and gitleaks pass; Chrome at 1440 and 375 for Method and Follow the Fee in every state (normal, error, panel live, panel without `byDay`, Not Available, `EXPLORER_PANEL=off` on a production build); unit report (§11b); the user's review and their yes on the commit.

## 6d. T6f plan: nothing stuck (written 8 Nov 2026)

**Why.** A check of every page on 8 Nov found two inputs no job updates: the BigQuery activity (Method charts and table, stuck at the week to 6 Nov) and the protocol fee (Follow the Fee, read once on 3 Nov, with "not moved since January 2026" typed into the text). The human asked for both to update on their own. The elasticity history before 3 Oct and the pre-registered lines stay fixed on purpose.

- **F1.** `pipeline/activity_refresh.mjs` moves the `block_date` range in the two activity queries to the last 90 finished UTC days, runs only those two (`rerun({ only })`), and checks the newest day: it must be the window's last day and not under a quarter of the week before. Otherwise it stores nothing and the run fails.
- **F2.** `.github/workflows/activity.yml`, started weekly by cron-job.org (Saturday 11:41 WIB). Google login: repo secret `GOOGLE_SA_KEY`; gcloud mints a one-hour token from it and the log masks it (the first run, 8 Nov, failed on the `token_format` path, which needs the IAM Credentials API). Verify before commit; only the two SQL files, their two results and `activity.json` are staged. About 20 GB a run.
- **F3.** The refresh job runs `pipeline/protocol_fee.mjs` every hour. The copy is kept while fee() and the collector are unchanged (`readAt` is ignored when comparing), so it commits only when the fee changes.
- **F4.** Follow the Fee's protocol fee sentence comes from the read: pips, bps and the earliest reading in the unbroken run of equal readings (`fee_trace.json` `protocolFee.pips`, `sameSince`).
- **F5.** Docs: README "What updates on its own", queries/README.md, docs/CRON.md 2b (the Google key and the fifth cronjob), the Reproduce entry and the Method sources line no longer give a fixed date.
- **The human's part:** the service account and its key as `GOOGLE_SA_KEY`, and the fifth cronjob (docs/CRON.md 2b). Neither can be done by the agent.

**Done when:** T-T6f.1 to T-T6f.8 pass; `npm test`, `verify`, `npm run build`, gitleaks and the wording scan pass; the first `activity` run commits after the key is in place.

## 6e. T6g plan: words follow the numbers (written 8 Nov 2026)

**Why.** A check of every page's code on 8 Nov: the figures are all read from data, and most sentences are picked by code from the data. Five are not, and one of those is wrong today. The human asked that the wording never disagree with the numbers, now or later, on every page. One unit, one chat, Opus 5.5 · high (the human's choice). No layout change.

**G1. Cumulative Volume (Method, "Where Public Figures Disagree"). Wrong today.** "Ours" says "Not available" while "Why They Differ" says "Our figure matches the public part". Cause: `pipeline/build_reconciliation.mjs` passes `volume: []` (line 18, "saved from T1 on"), though `data/snapshot/defillama_daily.json` holds daily volume from 10 May 2025. Fix: pass that volume; "Ours" sums 1 Sep 2025 to 21 Sep 2026 (the source's date); the sentence is picked by how far ours is from the source's public part ($29.5B): within 5% says it matches; otherwise it says how far apart they are; no total says nothing about matching. A day with no volume inside the range means no total, never a sum with a hole. `lib/reconcile_view.ts` lines 52 to 64.

**G2. Buyback (Follow the Fee).** "All of NEAR's captured Intents revenue has bought NEAR on the open market since 23 Feb 2026 … not burned" is typed (`lib/fee_view.ts` line 79), but `model_inputs.json` `buyback.shareOfRevenue` is pulled from DefiLlama every hour. Fix: `build_fee_trace.mjs` carries `buyback` (share, burned) into `fee_trace.json` beside `nearRevenue`; the sentence says "all" only at 100% (to one decimal), else the share; "not burned" only when `burned` is false; no figure, no claim. The Buyback value follows the share too (revenue × share), not a copy of the revenue.

**G3. "So few days" (Model, "Volume Needed Before and Since 27 Oct").** `components/ModelView.tsx` line 62 always says "So few days cannot show whether the rate has really changed". Fix: say it only while the days since 27 Oct are under 30 (the length of the window before it); from 30 days on, the sentence states both rates and their days, with no claim either way.

**G4. The NEAR Intents email (Method, Sources).** "says this becomes the main path on 9 Nov" (`app/method/page.tsx` line 13) reads wrong after 9 Nov. Fix: "said it would become the main path on 9 Nov 2026", true on any date.

**G5. Year on Follow the Fee's cost card.** "Chain days to 6 Nov 2026" types "2026" (`lib/fee_view.ts`, `card.source`). Fix: the year from `trace.to`.

**G6. Guard test, every page.** `lib/typed_text.test.mjs` scans the string literals and JSX text of `app/**/*.tsx`, `components/*.tsx`, `lib/*.ts` (not tests) and `analysis/thesis_text.mjs`, with comments stripped, for typed figures: `$` amounts, percentages, bps, multiples (× or x), day-month dates and month-year dates. Anything found must be on an allow-list in the same file, each entry with its reason. A new typed figure fails `npm test`. It also fails on any frontend or solver name from `data/labels/` typed into page code (names must come from data).
- Allowed, from the 8 Nov check: the pre-registered lines (What Would Move, `thesis_text` Q2 and Q4 phrases, the 60% and 80% Solver Competition lines, the 50% treasury line); the issuance presets 1.6% and 2.5% and the vote status; fixed scales and ticks (gauge, model sliders, cost bar, the share bar's 0/50/100%); size bucket names and the $10,000 title; quotes from other sources with their dates (Concentration's 77% Reported; Method's Other Source column, and the then-prices $4.97 and $1.35 it names); dated history (A2 6 Nov, A3 and A4 7 Nov, the move to the treasury 28 to 30 Oct, the 27 Oct marker, BigQuery logs to 3 Oct 2026 and from 1 Oct 2025, DefiLlama from 1 Sep 2025, buyback start 23 Feb 2026, the 0.03% re-freeze note); `lib/mock.ts` examples marked "Example only".
- The allow-list must not hold a figure that a published file also holds (a typed copy of live data). The test checks the allowed numbers against `thesis.json`, `model_inputs.json` and `fee_trace.json` values.

**G7. Each fixed sentence gets a unit test with altered data:** volume within 5%, 20% off and missing; buyback share 1, 0.8 and missing, burned true; days since 11 and 40; a `trace.to` in 2027.

**Done when:** T-T6g.1 to T-T6g.9 pass; `npm test` (also with `EXPLORER_PANEL=off`), `verify`, `npm run build`, gitleaks and the wording scan pass; Chrome at 1440 and 375 on all eight pages reads right, with Method, Follow the Fee and Model checked line by line against their published files; unit report; the human's yes on the commit.

## 6f. T6h plan: THESIS.md follows the data (written 8 Nov 2026)

**Why.** THESIS.md is a snapshot "as of 7 Nov 2026" with about 30 figures typed by hand, and it already differs from the live site (NEAR's share 34% there, 33% on the site; $12.6B there, $12.5B on the site). Nothing checks it. Judges read it on GitHub. The README holds rules only, no figures, and stays as it is.

**Decide first (human), at the start of the T6h chat:**
- **A (recommended).** `pipeline/build_thesis_md.mjs` writes THESIS.md from `thesis.json` and the other published files, with every figure filled in and every judgement ("well over the 50% line", "just under the 80% line", "looks lower lately") picked by condition, the way `analysis/thesis_text.mjs` does for the home page. The refresh and chain-day jobs run it, `verify` checks it, and it is committed only when it changes. THESIS.md then always matches the site.
- **B.** Keep a dated snapshot, freeze its inputs as `data/published/thesis_snapshot_<date>.json`, and have `verify` check every figure in THESIS.md against that file. The page says plainly that the site is newer.
- **C.** Take the figures out of THESIS.md and link to the live pages; keep only the argument.

**Rules either way:** no Explorer or 1Click figure (AGENTS.md 4.1(e)); "a fall in public numbers is not a fall in demand" stays; nothing reads as advice; every sentence written in advance, filled from data.

**Done when (A):** THESIS.md made by the script equals the committed file; `verify` fails on a hand edit; T-T6h.1 to T-T6h.5 pass; the refresh run after the commit leaves THESIS.md consistent with the site.

## 6g. T6i plan: Easy and Pro (written 8 Nov 2026)

**Why.** The human, new to crypto, could not read the site and so could not explain it. Decided with the human on 8 Nov: one site, two ways to read it. **Pro** is today's text and the default. **Easy** says the same thing in everyday words for someone who knows nothing about crypto or statistics. Same pages, same charts, same numbers; only the words change. The aim is a plus for judges and newcomers, and a public good for NEAR: people can understand NEAR's fee model honestly. Easy is never promotion. One unit, one chat, Opus 5.5 · high (the human's choice).

**Decide first (human), at the start of the T6i chat.** Show each as a small mockup or screenshot before building; the layout rule in AGENTS.md applies.
1. **Where the switch sits and how it looks**, at 1440 and at 375 (in the nav pill, beside it, or in the burger menu on phones). Recommended: a small two-part pill `Easy | Pro` in the site header, inside the burger menu on phones, in the existing glass style.
2. **A hint under or beside it**, such as "Same numbers, more detail", so Pro does not read as a paid tier. Recommended: yes, as the switch's tooltip and accessible description, not a visible line.
3. **A share link** `?mode=easy` that opens a page in Easy (handy for the pitch and the demo). Recommended: yes; it sets the choice and is then removed from the address bar.
4. **Term notes in both modes or Easy only.** Recommended: both, since V\* and Treasury are Tideline's own words.
5. **`BEGINNER.md`**, the uncommitted draft guide from 8 Nov in the repo root. Recommended: use it as the source for Easy wording, then delete it; don't commit it (its figures are typed by hand and dated).

**Answers (human, 8 Nov, after mockups on the live site):** 1. Inside the nav pill after a divider on desktop; first row of the burger menu on phones. 2. Hint as tooltip and accessible description only. 3. Yes: `?mode=easy` or `?mode=pro` sets the choice, then leaves the address bar. 4. Term notes in both modes. 5. Use `BEGINNER.md` as the wording source, then delete it, never committed.

**E1. The switch.** Two options, Easy and Pro, Pro selected on a first visit. Built as a real control: two buttons with `aria-pressed`, or a radio group, reachable by keyboard, visible focus, labels in Title Case (DESIGN.md copy rule). It is on every page, including the error and stale states.

**E2. Remembering the choice.** `localStorage` key `tideline-mode`, every read and write in try/catch; if storage fails the site is Pro and works. A small pre-paint script (beside `PRE_SCRIPT` in `components/Entrance.tsx`) sets `data-mode` on `<html>` before first paint, so no page flashes the other mode. No cookie, no server state, nothing sent anywhere.

**E3. How the words swap.** A server-safe component, for example `<Say pro={…} easy={…} />`, renders both texts; CSS on `html[data-mode]` hides the other with `display: none`, so screen readers read only the active one and there is no hydration mismatch. Numbers, charts, cards and links are not wrapped: they are the same in both modes.

**E4. Easy text follows the data.** Easy sentences are built by code from the published files, like `analysis/thesis_text.mjs`, never typed with a figure. New pure module, for example `analysis/easy_text.mjs`, with every judgement picked by condition. Easy may round ("about 3 times", "about 8 of every 10 dollars"), but the rounding is computed from the live value. `lib/typed_text.test.mjs` (T6g) scans the new files too, with no new allow-list entry for a live figure.

**E5. What Easy changes on each page.** Headings stay in Title Case; each page gains a one-line "What this page answers" in Easy.
- **Home:** the claim as the tug of war (new coins in, buybacks out), the verdict and why it is held, the five readings as plain questions: Q1 "If NEAR raises its fee, do people stop swapping?", Q2 "Does NEAR keep a fair share of the fees?", Q3 "Do the traders really compete?", Q4 "Does one app bring most of the business?", Q5 "Is NEAR's fee income growing?". Sides keep their names (Bullish, Bearish, Neutral, Not Measured) with a term note.
- **Model, Follow the Fee, Concentration, Elasticity, What Would Move:** every explanatory sentence gets an Easy twin. What Would Move's pre-registered lines keep their exact figures; only the words around them change.
- **Method and Reproduce:** a short Easy intro on top; commands, hashes, SQL and tables stay as they are.
- **The rolling panel:** its numbers stay as they are. Any Easy words around it are fixed text with no figure, so no Explorer value reaches git or a sentence (AGENTS.md 4.1(e)).

**E6. Tap-to-explain notes.** `components/Term.tsx`: a dotted underline on a hard word; a small glass note opens on tap, hover or keyboard focus and closes on Escape, a tap outside or leaving. Built as a button with `aria-expanded` and `aria-describedby`; it fits at 375 without horizontal scroll. Definitions live in `lib/glossary.ts`, fixed text with no figures. First list: V\*, issuance, buyback, deflation, NEAR Intents, solver, frontend (integrator), Treasury, confidential swaps, volume, bps, elasticity, pass-through, Bullish, Bearish, Neutral, Not Measured, DefiLlama, BigQuery, frozen day, hash, attest, testnet. Each word gets a note once per section, not on every repeat.

**E7. The honesty rules hold in Easy too.** These are tested, not just reviewed:
- A fall in public numbers is never called a fall in demand. Easy says the swaps moved out of view.
- The Treasury is never called a solver or trader; Easy calls it the doorway into the private system.
- Q3 Not Measured and the A2 hold are said plainly, with what cannot be seen.
- "Research, not financial advice" is visible in both modes. No promotion: no "buy", "great investment", "guaranteed", "moon" or the like.
- Intents Technology only as a technology provider; no implied endorsement (3.5).
- Easy never adds a reading, a side or a number that Pro does not have.

**E8. Unchanged.** `/api/*`, THESIS.md, the README, every figure in `data/` and the verdict rule. E9 and E11 change only how Home shows the verdict; E10 changes the five What This Means sentences that `thesis.json` stores, and no number. `EXPLORER_PANEL=off` still passes every test.

**E9. The readings lead while the verdict is on hold** (the human's yes on the sketch, 8 Nov). Under A2 rule 5 the verdict stays Undecided, but Home stops leading with it. Only while a reading is held:
- The Hero card's title is "N of 5 Answered" (readings not Not Measured). Under the bar, one dot per reading in its side's shape, then "On hold: X% went private", X the largest treasury share among the held readings' windows. The dots sit on that line because beside the title they meet the ring. Not held, the card shows the verdict as before.
- Under the hero, the lead is the count per side: Pro "2 Bullish, 2 Neutral, 1 Not Measured.", Easy "Two signs look good, two are unclear, and one cannot be answered right now." The reason follows in smaller grey text: Pro "Verdict on hold (PREREG A2): the treasury carried X% of counted USD over the last N days, so … reads Not Measured. Score …; lost data may not move the verdict."; Easy "Overall answer on hold: about N of every 10 dollars now trade in private …".
- Easy's What This Means opens "the overall answer is on hold (Undecided)". Pro's opening comes from `thesis.json` text and already says "held at Undecided because flow went private", so it is unchanged.
- Every count, dot and share comes from `thesis.json`. When the shares fall to 50% or less, all of it goes back to the verdict by itself.

**E10. What This Means, one point each** (the human's request, 8 Nov). Pro (`analysis/thesis_text.mjs`) and Easy (`easyHome`) say each point once: the verdict, what the readings say, what went private with its side figures, not less demand and what stays hidden, and the distance. Easy names each answer in plain words instead of quoting each question. Every number stays, so both modes still carry the same figures. The page builds Pro's text with the pipeline's own function from the published file (`thesisView` calls `thesisText`), so localhost, which reads GitHub, shows a wording change at once; the stored `text` is the fallback.

**E11. What This Means at a glance** (the human's yes on the sketch, 8 Nov). Three cards, the same in both modes, with captions in each mode's words (`components/Glance.tsx`, `thesisView(...).glance`, `easyHome(...).glance`):
- **Why It Is on Hold:** the largest held treasury share as a bar against the file's A2 line. Not held, the card shows the verdict and, once a share is read, says it is under the line.
- **Score:** the score on a −7 to +7 scale. While held the fill is grey, so it does not read as a side.
- **What Nobody Can See:** fees on private swaps, who filled them, money that stays private, and "fewer public swaps is not less demand". Shown once a treasury share is read.
The full text sits under "Read the Full Explanation". The research-not-advice lines stay outside the fold.

**E12. The hero in plain words** (the human's yes, 8 Nov). Easy swaps the hero's words, never its numbers or layout: "Swaps Must Grow / to 3.3× Today", "so fees can buy back the new NEAR coins.", "Swapped Last 30 Days" and "still missing each month" (`EASY.hero`). "to" sits on the second line so the first fits at 375. When volume already covers issuance: "Fees Already Buy Back / The New Coins". Pro is unchanged.

**Done when:** the human's answers to the five questions above are recorded here; T-T6i.1 to T-T6i.19 pass; `npm test` (also with `EXPLORER_PANEL=off`), `verify` ALL OK with `data/` unchanged, `npm run build`, gitleaks and `.private/wording-scan.mjs` (extended to Easy text) pass; Chrome at 1440 and 375 on all eight pages in both modes; unit report; the human's yes on the commit.

## 6h. T6j plan: beautification and adjustment (opened 8 Nov 2026)

**Why.** The human clicks through the site and asks for small fixes to wording and look. One open unit collects them, each item recorded here with the human's yes. Layout changes still need the human's yes first (AGENTS.md). Pro text changes only when an item says so.

**J1. Easy words on Follow the Fee's last two notes** (the human's yes, 8 Nov: "update only for easy"). Pro is unchanged.
- **Unexplained note:** the three left-out groups in plain words, counts still built from the same data: no dollar price for one of the two coins; an app fee that could not be read; got back far more or far less than put in, so the price looked wrong.
- **Rolling panel:** Easy shows the fixed Easy sentence, the chart and one source line. The swaps and quote sentences (bps, all-in, dry quotes) are Pro only, so the source line no longer shows twice. Easy may show fewer panel figures, never more (4.1(e)). The frontend list on Concentration stays in both modes.
- **Easy labels:** heading "Outside Count" instead of "Rolling Panel"; chart marker "Private swaps begin (27 Oct 2026)"; source line in plain words. Fixed text, no figure.

**J2. Easy in a human voice on the same two notes** (the human's yes, 8 Nov). Easy says why before what, in short sentences with "we". Pro is unchanged. The rest of the site moves to this voice later, starting from Home, when the human comes back to it.
- **Unexplained:** title "What We Couldn’t Explain"; one total, then each group that has swaps (a group at zero is not named); private swaps left out "because nobody can see their fees". Built from the same counts.
- **Rolling panel:** title "Another Tracker’s Count"; "These figures come from another site that tracks these swaps. Its rules don’t let us keep its data, so we show today’s copy and delete it tomorrow. It’s here for context only and doesn’t change any answer on this site."; source line "Source: Intents Explorer. Refreshed daily, deleted after a day." Fixed text, no figure. Replaces J1's "Outside Count" and source line.

**J3. Easy in a human voice on the top of Follow the Fee** (the human's yes, 8 Nov). Same voice as J2; every number the same as Pro; Pro unchanged.
- Lead: "Swap $10,000 and you get about $X less back (N bps). We worked that out from N real public swaps…".
- Bar: "Where the $X Goes", "Total $X", "N bps less than the market price", "$X Not From the App" with "NEAR Intents’ own fee $X, and $X to the solver or price moves".
- Rows get Easy names (The App’s Fee, Withdraw Fee Not Here, NEAR Intents’ Own Fee, What’s Left, Private Swaps Counted Apart, NEAR’s Cut; Buyback keeps its name) and plain text: no "plain transfer", "all-in" or "price noise". What’s Left adds "A minus means people got back slightly more than the market price" only when a shown part is negative.
- Card: "Total Cost, … Swaps" and plain text; the number sheet's Easy text in the same voice.

**J4. Easy | Pro follows the reader** (the human's pick, 8 Nov, from three sketches). A small glass Easy | Pro pill at the bottom right fades in once the header scrolls out of view and hides again at the top. The header stays exactly as it is. Both switches stay in step through one event; the floating one is hidden with visibility while away, so it leaves the tab order. Each copy keeps the hint as its accessible description, with its own id. No motion when the reader asks for reduced motion; not printed.

**J5. Elasticity in a human voice, with the checks folded in Easy** (the human's yes, 8 Nov, fold included). Pro unchanged; every number as Pro.
- Head: "Not Enough Data Yet" while underpowered, else "People Swap Less When Fees Rise" or "People Keep Swapping When Fees Rise".
- Text (`easyElasticity`): the count of fee changes, the best guess in words picked from the number, "the data is thin" while the range crosses −1, the range with "people leave fast" or "people swap even more" only when the ends say so, the −1 line, and pass-through as a share in words with its range.
- Plot: "Our Best Guess and Its Range", a plain key and plain notes on 0 and −1.
- Checks: one summary built from the runs (how many, what the random dates showed, the spread of guesses, how many ranges cross −1); the rows sit in a "See Each Check" fold in Easy only. The near-miss state keeps its rows open.
- Timeline: "N Fee Changes We Studied", a plain caption and a plain line for the smallest effect it could see.

**J6. The five Home rows match their pages in Easy** (the human's yes, 8 Nov; found because Home and Elasticity read as two different answers). Pro unchanged; sides keep their names.
- Q1's question becomes "When fees go up, do people stop swapping?": what was measured is apps changing their own fees, not NEAR changing its fee. The new wording shows wherever the question shows.
- The line under each question is the answer in plain words (`easyReadingLine`), from the same files: Q1 from elasticity.json ("Barely, as far as we can tell, but the data is too thin to be sure (−0.06)" while the range crosses −1), Q2 from the capture share, Q3 and Q4 from the private share or their figures, Q4 from the largest app, Q5 from its side.

**J7. One Easy word per thing, on every page** (the human's yes, 8 Nov; found because Elasticity's title said "volume" while Home asked about "swapping"). Pro, the nav labels, the numbers and the layout are unchanged.
- Words: swapping (not volume, except beside a dollar figure or its note); traders, with the solver note (not solvers); app (not integrator or frontend); the private system and private swaps, with the Treasury as "the doorway into the private system"; NEAR's fee income (not revenue); answers (not readings or signs); overall answer (not verdict); still missing each month (not short).
- Easy titles and links: "Do People Stop Swapping When Fees Go Up?", "Who Brings the Swaps?", "What Would Change Each Answer", "Open the Query for Each Answer" (`EASY.titles`). Reproduce names the five readings by their questions.
- Concentration: Easy table heads and notes; the panel's app list stays in Pro, and Easy says in fixed words what it is (no panel figure in an Easy sentence, §6g E5).
- Model: Easy labels and plain twins of the three lower boxes (`easySplitSentence` and the fee and date lines).
- Method: titles, links and the chart marker only; its body is the technical detail and stays in Pro wording, as its Easy intro says.
- Guard: T-T6j.13 fails if an old word comes back in Easy text. Tap-notes are shared by both modes and may use them.

**J8. Pro wording a domain reader can follow** (the human's go-ahead, 8 Nov, all pages). Our own internal names are explained or replaced; Easy, numbers, layout, thesis.json and THESIS.md are unchanged.
- The two swap kinds are named once: "fee-tagged swaps (logged as token_diff, which name the frontend and its fee)" and "plain transfer swaps"; every other Pro line says fee-tagged. Home and What Would Move show thesis.json's reading line with a real minus and "fee-tagged (token_diff)", at display time only.
- Follow the Fee: "round trips" matched into and out of the treasury instead of "paired confidential flows from the two public edges"; a negative spread is explained when one shows; the left-out note says "a third token that could not be valued" and what the price check is; real minus signs.
- Rolling panel (runtime text, never stored): the four pairs named, each quote split into app fee, withdraw fee and the rest, and the app fee named as the one 1Click attached to our own test request, not what real swaps paid.
- Elasticity: "Pass-through" named; the dropped fee changes and why ("6 had under $50,000 in the 7 days before", from the file); "Minimum detectable effect … 2.8 × the placebo spread, for 80% power at p = 0.05".
- Concentration: "SwapKit accounts for" (not "pays"), "no frontend named", "solver account", "$… of volume". Home: the confidential share is defined beside the treasury share. Model: V* named, and today's 14.8 bps is called a fee rate (DefiLlama fees over volume) so it is not mixed up with Follow the Fee's realised cost.
- Not changed: the 77% card on Concentration does not name its source, and the code does not say which source it is. Flagged for the human.

**J9. Tap-to-explain notes always come to the front** (the human's report, 8 Nov: a note opened on Home's readings row sat under the What This Means panel). Cause: each glass panel's blur makes its own layer, so a note could not rise above the next panel. Fix in `components/Term.tsx`: the open note is drawn on <body> with a fixed position, placed under the word or above it when there is no room below, and it follows the word on scroll. Hover may move from the word onto the note. Same words, same look; `react-dom.d.ts` types the one function used, since no package is added.

**J10. Follow the Fee's number card and sheet** (the human's yes, 8 Nov). Easy: under "75.7 bps" the dollar figure ("$75.72 on a $10,000 swap") on the card and in the sheet, and the file-name query line becomes "We worked this out from the public swap records we save each day. Open the Query to see the exact steps." Pro: the query line names only what makes this number (feeTrace over data/chain), not every function in fee_trace.json's own query (q3Spread and the solver count belong to other figures); the file is unchanged.

**J11. Model page spacing matches Elasticity** (the human's report, 8 Nov, with Elasticity as the reference). Panel to Open the Query 32px, link to Check It Yourself 24px; before, the button carried an extra 32px top margin (56px in all). The left panel still ends above the right one; stretching it was offered and not asked for.

**J12. Model: intro to the gauge panel 48px** (the human's report, 8 Nov). The gauge's glass starts 44px into its box and the 8px rule for a gauge right under the title stopped matching once T6i put hidden Easy lines between them, so Model showed 104px in both modes. Now 48px in Easy and Pro, as on Follow the Fee, Concentration, What Would Move and Method. Home's gauge is unchanged. Elasticity uses 60px; left as it is unless the human asks.

**J13. Model: the gauge panel lines up with the panels below** (the human's report, 8 Nov). The gauge's glass reaches 28px past its box on each side and 14px below, Home's wider style, so on Model it stuck out past the column and sat 14px above the next panels. Model now uses an inset gauge: glass on the column (72 to 1279px at 1366) and 32px above the panels; numbers and marks unchanged. Home keeps its gauge as designed.

**J14. Reproduce: proof first, then the commands** (the human's pick, 8 Nov, from three sketches; changes Figma S5). The Daily Hash card comes first at full width, so the reader sees what is proven before how to check it. The five commands follow two to a row, each with its Copy button inside its dark box, in a solid light style so it reads on the dark. On phones each box stacks the command, its note, then Copy. The error state keeps its banner and Try Again first. Words and commands unchanged.

**J15. Reproduce as a three-step recipe** (the human's pick, 8 Nov, after J14 looked worse; replaces J14's tile grid). The proof card stays first. Then one dark panel, "Check It Yourself in Three Steps": 1 get the code (git clone, npm ci, Node 24), 2 npm run verify (ends in ALL OK), 3 npm run attest:check with the newest anchored day filled in. Each step has its title, the command, what you should see, and a Copy. Then a light "Going Further" list: `npm run rebuild` (no key), `npm run rebuild -- --bigquery` (your own Google project), `npm run panel` (your own Explorer key; gone with EXPLORER_PANEL=off). The page lead says the three steps need no key. Changes Figma S5.

**J16. Reproduce in the install-guide pattern, and fast** (the human's yes, 8 Nov, after looking at how install guides such as Tailwind's show steps; replaces J14 and J15). Each step has a number, a title, one sentence, what you should see, and the command in a small light terminal frame with a copy icon in its header; Going Further uses the same form and says what each extra needs. Speed: the proof card checks every saved day (36 files, about 29 MB from GitHub, and 37 testnet calls), which held the whole page for about 5 seconds on an uncached visit. It now sits in its own Suspense boundary: the page arrives in under 0.1 seconds with "Checking every saved day against NEAR testnet…", and the card fills in when the check is done; the check itself is unchanged. Step 3 names the newest frozen day from chain_days.json (no testnet call). Changes Figma S5.

**J17. Reproduce: Try Again re-checks only the card; Going Further gets bullets** (the human's report, 8 Nov). The card fired 37 testnet calls at once and one refused call failed it, so the human saw "NEAR Testnet Did Not Answer". Now the days are checked six at a time, each call is tried once more after 0.6s, and a failure is logged with its reason. Try Again refreshes the server parts in place (the card shows "Checking…", then its result) instead of reloading the page. Going Further rows carry a dot in the same small box as the step numbers; every badge is a fixed 30 by 24px box, so numbers and dots match.

**J18. Reproduce: Every Reading and Chart, grouped, with Easy words** (the human's yes, 8 Nov). Grouped under The Five Readings, Charts and Pages, and Side Measures (Set No Reading). Easy: the title "Where Each Number Comes From", each entry by its Easy name and one plain sentence in the J7 words, with Query and Source in a "Show the Files" fold. Pro: unchanged text, now grouped; "dip4" is explained as the event standard intents.near logs. The J7 guard (T-T6j.13) now also reads these Easy sentences and names; before, the shared Pro sentences showed in Easy with "frontend", "solvers", "revenue" and "interval", which the guard did not cover.

**J19. Links that leave the site open in a new tab** (the human's request, 8 Nov, starting from Reproduce's file links). components/ExtLink.tsx: new tab, rel noopener, "(opens in a new tab)" for screen readers, a small ↗ mark. Used for the GitHub file links on Reproduce, Open the Contract on NEAR Testnet, Report It on GitHub, and Method's outside sources. Links within Tideline stay in the same tab.

**J20. Open in GitHub Codespaces** (the human's yes, 8 Nov). A ready terminal in the reader's own codespace: `.devcontainer/devcontainer.json` (Ubuntu base, the Node feature at version 24, `npm ci` after creation, no keys) and a row at the top of Reproduce's steps with an "Open in Codespaces" button (codespaces.new, new tab). It runs under the reader's GitHub account and billing, never on Tideline's server, so the proof stays theirs. **Open:** the settings file works only once it is on GitHub's main branch; then the human opens one codespace and runs verify and attest:check to confirm.

**J21. Method: plain summaries in Easy, three Pro tidy-ups** (the human's yes, 8 Nov; replaces J7's "Method body stays Pro"). Easy: each section opens with one or two plain sentences, built from the same files where they hold figures (chain checks, swap coverage, the comparison count, the visibility ratio against its range before 27 Oct), and the full Pro detail sits under "See the Detail". Pro: the Confidential Intents note as five short points; "How Much the Public Chain Still Sees" as its own block led by the ratio; the weekly activity table in a fold under its charts (both modes). The repeated weeks in the human's screenshot were the full-page capture; the table shows 8 rows.

**J22. A banner inside a panel fills the panel** (the human's report, 8 Nov: empty space beside the rolling panel on Concentration). Banners keep their 560px cap when they stand alone; inside a glass panel they now use its full width, as on Follow the Fee. Also widens Method's load-error banners inside their panels.

**J23. The rolling panel no longer holds the page** (the human's report, 8 Nov: Concentration slow). Each load lists the GitHub artifacts and downloads the newest panel, about 1.2 to 3 seconds, and Concentration and Follow the Fee waited for it. Pages now use `PanelSlot`: nothing when EXPLORER_PANEL=off, otherwise the panel in a Suspense boundary with a fixed-words loading box. The main content arrives in about 0.05 to 0.15 seconds. The panel is still fetched per request and kept nowhere; a memory cache would change that rule, so it was not added.

**J24. Reproduce's proof card never caches a failure** (the human's request, 8 Nov, before the Vercel deploy). The page is now fully static and the card asks our own `/api/anchor`: a good check is cached for 5 minutes (in memory and at the CDN), a failed one is never cached, so a testnet hiccup cannot stick in a built page and Try Again really asks again. The build no longer calls testnet for this page.

**J25. The "77% Reported" card is removed from Concentration** (the human's choice, 8 Nov). Its source could not be named and the figure was typed into the code, so it could not be checked. Our own figure stays in the table and notes; the panel now uses the full width. Changes Figma S6.

**J26. The rolling panel survives a slow GitHub download** (the human's report, 8 Nov: "Not Available" on Follow the Fee while a valid panel existed). The artifact zip comes from GitHub storage that is sometimes slow (seen 8.5s against a usual 0.7s), and one slow or failed call made the box say Not Available, with no reason logged. Each GitHub call now gets 6s and up to three tries; a failure logs only a status code or an error type, never a message or body (API data stays out of logs). **Found later the same day:** on this machine the dev server's first GitHub connections after about three idle minutes stall for 15 to 20 seconds, longer than all three tries, so the first page view after a pause can still say Not Available; the next view works (Chrome, 8 Nov: 18s Not Available, then 9s, then 1.5s each). Not yet known whether Vercel shows the same stall; a short in-memory copy of the last good panel would hide it but changes the "one request" rule, so it waits for the human.

**Done when (each item):** its tests pass; `npm test` (also with `EXPLORER_PANEL=off`), `verify` ALL OK with `data/` unchanged, gitleaks and the wording scan pass; Chrome in both modes; the human's yes on the commit.

## 6i. T6k plan: Telegram for users (written 9 Nov 2026)

**Why.** The human wants Telegram to bring people to NEAR the way Easy mode does (9 Nov). Today one chat, the human's own, gets raw side changes and a failed `chain-day`. The 3 and 4 Nov messages showed two limits for a public audience: the verdict went Bullish → Undecided → Bullish within about 28 hours, and the words (bps, top 3 share, score) are Pro words. Not a hackathon requirement (SRS §1.6 lists the alarm as a Should); built before Vercel at the human's call. Decided 9 Nov: 3-day hold, Monday 08:00 WIB note, all three public kinds in Easy words.

**One bot, two chats.** The same bot token sends to `TELEGRAM_CHAT_ID` (the human, private, already set) and to a new secret `TELEGRAM_CHANNEL_ID` (the public channel `@tideline_thesis`, created by the human on 9 Nov with the bot, Tideline Alerts, as admin). The bot only sends: it reads nothing and answers nobody, so only the two stored IDs ever get a message.

- **K1. Private chat (the human only).** As now: every side change at once with its Pro figures, and a failed `chain-day`. New: a failed `attest-days`, `refresh` or `panel` run, with the job name and run link only, no figures (the panel's failure text is fixed, so no API value reaches it, 4.1(e)). Also a note when a change is dropped from public because it flipped back.
- **K2. The 3-day hold.** A change goes public only once the new side has held for 72 hours in a row, checked at each hourly refresh. One that flips back first never goes public. The sides last told to the public, pending changes and the public log live in `alarm/public.json` (stored public data only). The first run only records the current sides.
- **K3. Public messages, Easy words.** Three kinds: (a) the verdict changed; (b) a reading changed side, as its Easy question plus one plain sentence; (c) a blind spot opened or closed (a reading moved to or from Not Measured, such as Q3 under the A2 hold). A pure module builds them from `thesis.json` with the Easy rules of `lib/easy_text.ts`: no typed live figure, a fall in public numbers is never a fall in demand, the Treasury is never a solver, Intents Technology only as a technology provider, no buy or sell wording. Each ends with the site link and "Research, not financial advice."
- **K4. Weekly note.** Monday 08:00 WIB (Monday 01:00 UTC), started by cron-job.org. The verdict and each reading in Easy words, what changed this week or "Quiet week: no reading changed side", what can't be seen, the link and the advice line. Stored public data only.
- **K5. Never public:** job failures, Pro figures and score lines, anything from the Explorer or 1Click APIs or the rolling panel. The panel guard (`API_CODE`) covers the new files.
- **K6. Switch.** The workflows pass `TELEGRAM_CHANNEL_ID` only while the repo variable `TELEGRAM_PUBLIC` is `on` (set by the human after the yes). Otherwise public messages print to the log and nothing is posted; every test passes either way. The site link is the repo variable `TIDELINE_URL`, the GitHub repo until Vercel.
- **K7. Site link** ("Follow on Telegram", `t.me/tideline_thesis`, in `lib/links.ts`). Placed by the human on 9 Nov: a labeled row at the end of Home's What This Means (fixed words in Pro and Easy, no figure), a link after "Tideline is research, not financial advice." on every page, and a row above GitHub Repo in the phone menu. Not in the wide top bar: measured on 9 Nov, a button there pushed Open Model over the Easy/Pro switch on Home. Label "Follow Us on Telegram" (the human, 9 Nov). Two older top-bar overlaps found while measuring, fixed the same day (the human's yes): Open Model covered the Easy/Pro switch on Home from 16:9 to about 1.9:1 (1920×1080, 1280×720, 1440×780), so it moves into the bar only from 39:20 and keeps its hero spot below that; and at boxy shapes up to 137:100 (1024×768) GitHub Repo ran under the nav pill by about 22px, so the pill sits about 50 units left of centre there. Measured clear at 23 sizes from 820×600 to 2560×1440 on Home and Method. Also fixed: on phones the floating Easy/Pro switch covered the end of the footer line (space added under it).
- **The human's part:** create the channel, add the bot as admin, add `TELEGRAM_CHANNEL_ID` (all done 9 Nov); add the Monday cronjob (docs/CRON.md 2c); give an explicit yes before the first public post, then set `TELEGRAM_PUBLIC` to `on`.
- **Built 9 Nov:** `analysis/public_alarm.mjs` (hold, public text, Monday note, failure text), `pipeline/refresh.mjs` writes `alarm/public.json` and the public file, `pipeline/weekly_note.mjs`, `pipeline/telegram.mjs --channel` and `--failed <job>`, `weekly-note.yml`, and a `tell` job in refresh, attest-days, panel and weekly-note.

**Done when:** T-T6k.1 to T-T6k.9 pass; `npm test` (also with `EXPLORER_PANEL=off`), `verify` ALL OK, gitleaks and the wording scan pass; one real private failure message, and one real channel post after the human's yes.

## 6j. T6l plan: All Charts page (written 12 Nov 2026)

**Why.** The track brief asks for "a static dashboard page" with each chart, the query behind it and one plain sentence. Tideline has all three, but spread over six pages (Home, Follow the Fee, Elasticity, Model, Concentration, Method), with the queries on Reproduce. Other entries show their charts on one screen, and a judge who expects a dashboard may not click through. On 12 Nov the human looked at another thesis entry (a one-page research note: a bold takeaway over each figure, then a short paragraph and its source) and at a local sketch of this page (`app/charts/`, uncommitted, built the same day), and asked for this unit: written on Opus · high, built on medium.

**Rule for the whole unit: populate, don't write.** The page adds no new number and no new sentence with a figure. Every chart is the component its own page draws, fed by the same view function; every sentence is one the site already builds or stores. Where a page builds its chart or text inline in its JSX, that piece moves into a shared component or function, and both pages use it. So when the data changes, the page and the All Charts card change together, and they can never say different things. The T6g guard (`lib/typed_text.test.mjs`) covers `app/charts/` with no new allow-list entry.

- **L1. Route and title.** `/charts/`, `revalidate = 300` like the other pages. Title "Every Chart in One Place" in both modes. Pro lead (fixed, no figure): "Each chart on this site with what it says today, one plain sentence on what it shows, and the query behind it. The same files feed every page." Easy gets an `ask` line and lead in `lib/easy_text.ts` (`EASY.ask.charts`, `EASY.chartsLead`), fixed words in the J7 vocabulary.
- **L2. Order and groups.** The page walks `GROUPS` and `ENTRIES` from `lib/reproduce_entries.ts`, the list Reproduce uses: The Five Readings, Charts and Pages, Side Measures (Set No Reading), each entry once and in that order. A unit test fails if an entry has no card or a card has no entry, so a chart added to Reproduce later cannot be missing here.
- **L3. One card, five parts,** the same on every card:
  1. **Title:** the entry's `name` (Pro) or `easyName` (Easy).
  2. **Takeaway:** what the chart says today, in large type. It's the line its own page leads with, Pro and Easy (table in L4). This is the sentence that changes with the data.
  3. **The chart:** the component its page draws (L4).
  4. **What it shows:** the entry's `sentence` (Pro) or `easy` (Easy). This is the brief's "one plain sentence".
  5. **Links:** "Open the Query" to `/reproduce/#<id>`, and "See It on Its Page" (Easy: "See the Full Page"). Pro shows the entry's `source` as a small line; Easy puts it in a "Show the Files" fold, as Reproduce does (J18).
- **L4. What each card reuses.**

| Card (entry id) | Chart | Takeaway, Pro / Easy | Move into a shared piece |
| --- | --- | --- | --- |
| The Five Readings (q1 to q5, one card) | Home's five `ReadingCell`s | `headline.countLine ?? headline.verdictText` / `easy.home.lead` | none. Under the cells, one line per reading: its name, the entry sentence, a Query link. Link to What Would Move |
| gauge | `Gauge` with Home's props, inset (J13) | Hero's words: "Volume Must Reach {multiple} Today" / `EASY.hero` line 1 and 2 | the hero line pair as a small function in `components/Hero.tsx`, used by Hero and the card |
| fee-trace | the cost bar and its rows from Follow the Fee | `fee.lead` / `fee.easyLead` | `components/FeeSplit.tsx`: the bar, scale, callout and rows, taken from `app/follow-the-fee/page.tsx` unchanged. The card shows the bar and rows; the number sheet stays on its page |
| elasticity | `IntervalPlot`, then the date axis of fee changes | `elasticity.head` / `elasticity.easy.head` | `components/FeeChangeAxis.tsx`: the date-axis figure from `app/elasticity/page.tsx` unchanged. The Checks panel stays on its page |
| model | none: the model is a tool, and a still copy would repeat the gauge | none in either mode (the Model page has no Pro lead); an "Open the Model" button takes its place | none |
| concentration | the same `Table`, same rows and heads | the page's lead / `EASY.concentrationLead` | `concentrationLead(c)` in `lib/data.ts` or a view file, so the lead built inline today is one function |
| confidential | none on the site today, and this unit adds none | `headline.privateLine` (already data-built) | none |
| visibility | the ratio as a large figure | Method's visibility sentence, Pro and Easy | `components/VisibilityBlock.tsx`: the block from `app/method/page.tsx` (J21) |
| activity | `BarCharts` from `activityCharts(activity)` | Method's activity intro, Pro and Easy | none. The table fold stays on Method |

- **L5. States.** One file failing breaks only its card. A card whose data did not load shows its own page's error banner title and words, with no chart and no takeaway, never a blank card or an old figure. Follow the Fee's empty-bucket state shows its banner as on the page. The page never shows sample text.
- **L6. Layout.** Two columns at 900px and wider, one column below. Full width: The Five Readings, gauge, concentration, activity. Half width: fee-trace beside elasticity, model beside confidential, and visibility. No glass inside glass: when a chart draws its own panel (the gauge, the interval plot), the card turns that inner panel's background, border and shadow off. Gaps follow the site: 48px between groups, 24px between cards, 16px inside a card. Every link and button keeps a 44px hit area on phones. No horizontal scroll at 375.
- **L7. Easy and Pro.** Only the words switch (E3); numbers, charts and order are the same. The J7 word guard (T-T6j.13) reads the new Easy strings. The floating switch (J4) works here as on other pages.
- **L8. Terms and honesty.** No `PanelSlot` and nothing from the rolling panel on this page: the panel stays only beside Follow the Fee and Concentration (4.1(e)). The page sets no side and no verdict. The confidential rules carry over, because the takeaways are the pages' own. With `EXPLORER_PANEL=off` the page is unchanged and every test passes.
- **L9. Ways in: the human's call.** (a) A sixth link "All Charts" in the nav pill. The pill gets wider, so the K7 overlap check (23 sizes, Home and Method) runs again, and the phone menu gets a row. (b) No nav change: a link in Home's links row, at the top of Reproduce ("See Every Chart in One Place"), in the phone menu, and in the README's try-it steps. Recommended: (b), and (a) only if the K7 check stays clear. **Decided 12 Nov: (a), the nav link too** (the human). So: "All Charts" in the nav pill and a row in the phone menu, plus the (b) links. The K7 overlap check runs again at all 23 sizes on Home and Method. If the wider pill overlaps anything, stop and show the human before changing any other layout. The README step needs the human's yes, like any README change.
  **Measured 12 Nov (Chrome, same-origin frames, Home):** with "All Charts" in the pill, it overlaps the logo or GitHub Repo at 8 of 12 boxy sizes (820×600, 900×700, 1024×768, 1100×800, 1180×820, 1200×1000, 1280×1024; by up to 40px); with "Charts", at 7. Without the link, all are clear except 1100×800, where the pill already overlaps GitHub Repo by 5px today (not in the 9 Nov list of sizes; reported to the human, not fixed). Moving Open Model would not help: it sits in the bar only at very wide shapes (2560×1080), with about 480px to spare. **Decided 12 Nov (the human): "All Charts" as text in the nav, it is there for a purpose.** Built: up to 3:2 the pill's spacing tightens (gap 20 to 13 units, ends 36 to 24, `app/reference.css`), and between 137:100 and 3:2 it sits 36 units left of centre (52 below 137:100, as before). Text size unchanged; wider shapes unchanged. Re-measured the same day on Home, Method and All Charts at all 23 sizes: no overlap anywhere, every gap at least 10px (tightest 900×700 on Home: logo 11px, GitHub Repo 18px). The old 5px overlap at 1100×800 is gone too. The phone menu shows "All Charts" as its own row. Also linked from Home's links row and Reproduce's "Every Reading and Chart" panel.
- **Built 12 Nov, changes from the plan above:** Model is a full-width card (half width left a hole beside it). The five readings are one column each (cell, sentence, query), on a subgrid so the status tags line up, instead of a strip plus a separate list. In the fee card each row shows swatch, value and name; each row's long note stays on Follow the Fee. Long takeaways (Confidential, Visibility, Activity) are set at 17px, the rest at 20px. Narrow cards (under 620px) draw the cost bar and the date axis with the phone rules, through a container query. In a card, the dashed "smallest effect" box grows with its text. On the Elasticity page itself at 375 in Easy, that box is 42px tall for 62px of text; reported, not changed (L11).
- **Fixed 12 Nov, after T6l went live (the human's report):** on Elasticity in Pro, the date-axis caption ran out of its card and gave the page a sideways scroll. The caption is built from data, and the morning's freeze made it list more dropped reasons; the chart drew every line at a fixed position with no wrap. Now the title and caption flow and wrap, and the axis and dashed box follow them (`app/globals.css`), so the chart grows with its caption, with the same gaps as before. This also fixes the dashed box overflow above. Checked at 1440, 1024, 768 and 375 in Pro and Easy on Elasticity and All Charts: nothing outside the chart, no sideways scroll. Not changed: the caption's wording ("1 had a window has under 4 days, …") reads awkwardly, because each reason comes from `elasticity.json` and is joined with "had".
- **L10. Speed.** One server render reading `getNumbers`, `getConcentration`, `getVisibility` and `getActivity` in parallel. No testnet call and no panel download. Target: under 0.65s on Vercel, like the 9 Nov sweep.
- **L11. Unchanged.** Every other page looks and reads exactly as before. The extractions in L4 move code without changing its output, checked by comparing each page's HTML before and after. Also unchanged: `data/`, `/api/*`, THESIS.md, the verdict rule and Figma (the site's look has been code-first since 2 Nov).

**Done when:** T-T6l.1 to T-T6l.10 pass; `npm test` (also with `EXPLORER_PANEL=off`), `verify` ALL OK, `tsc`, `next build`, gitleaks on changed files and the wording scan pass; the human has seen `/charts/` in Chrome at 1440 and 375, in Easy and Pro, and said yes; L9 decided.

## 7. Decisions for the human

0. **T1 go/no-go (§6a).** Decided 4 Nov: go on the census of 17 solvers plus the hub (about 80 min a day in Actions). Run 5 shows transfer swaps can't be named to a frontend, so Q4 and Follow the fee by frontend read on the token_diff swaps only (about 37% of swaps, 26% of USD), and the site says so. Totals, size mix and solvers use all swaps.
1. **A paid FastNEAR key** would speed up backfill (and maybe allow full days instead of samples). The price is unknown. Judges wouldn't need it: the snapshot and the sampled hashes let them re-run at free speed. Recommended: no key unless T1 fails on speed alone.

## 8. Not sure yet

- Whether `1click-unknown` hides frontends other sources name. If so, Q4 and Q1 lose detail.
- Whether all fills appear as `token_diff`. Transfer-based fills also exist, which `solversOfSwap` handles.
- Whether FastNEAR's free limit is per IP, and how GitHub Actions fares against it.
- How well DefiLlama prices cover the long tail of `omft` and HOT tokens. Swaps with no price are counted and shown, never guessed.
