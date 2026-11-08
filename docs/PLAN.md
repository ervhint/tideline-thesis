# Tideline: build plan

Status: T0 to T6b done. Current state is in PROGRESS.md.

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

## 7. Decisions for the human

0. **T1 go/no-go (§6a).** Decided 4 Nov: go on the census of 17 solvers plus the hub (about 80 min a day in Actions). Run 5 shows transfer swaps can't be named to a frontend, so Q4 and Follow the fee by frontend read on the token_diff swaps only (about 37% of swaps, 26% of USD), and the site says so. Totals, size mix and solvers use all swaps.
1. **A paid FastNEAR key** would speed up backfill (and maybe allow full days instead of samples). The price is unknown. Judges wouldn't need it: the snapshot and the sampled hashes let them re-run at free speed. Recommended: no key unless T1 fails on speed alone.

## 8. Not sure yet

- Whether `1click-unknown` hides frontends other sources name. If so, Q4 and Q1 lose detail.
- Whether all fills appear as `token_diff`. Transfer-based fills also exist, which `solversOfSwap` handles.
- Whether FastNEAR's free limit is per IP, and how GitHub Actions fares against it.
- How well DefiLlama prices cover the long tail of `omft` and HOT tokens. Swaps with no price are counted and shown, never guessed.
