# Tideline: the thesis

Research, not financial advice. This file is written by `pipeline/build_thesis_md.mjs` from the published files in `data/published/`, so its figures match the site; `npm run verify` fails if it is edited by hand. Frozen chain days and DefiLlama data run to 12 Nov 2026.

## The claim

NEAR uses its share of NEAR Intents fees to buy NEAR on the open market. The question is whether those buybacks could ever cover the new NEAR being issued.

**At today's revenue rate, Intents volume would have to reach about 3.3 times today's level to cover issuance under the 1.6% plan, or 5.2 times if issuance stays at 2.5%. The evidence does not yet say whether it can get there, and most of the public data needed to answer that has moved out of public view.**

The verdict is **Undecided**. The score is +3 of 7, which would normally read Bullish. It is held at Undecided on purpose: Solver Competition can no longer be measured, and a rule written in advance (PREREG.md, amendment A2) says a loss of data may not move the verdict.

**How much went private.** Over the last 7 frozen days, 6 Nov to 12 Nov 2026, the Confidential Intents Treasury carried 96% of the USD counted on chain, well over the 50% line in A2. Other accounts' funds going into it were 97% of the flow we can see. That share is a side measure and sets no reading. It shows where the public record went, not that demand fell.

## The evidence for

- **NEAR keeps a real share of the fees.** DefiLlama books 32% of Intents fees as NEAR revenue over the last 30 days, above the 30% line for Bullish.
- **Revenue has been growing.** The 90-day revenue total rose at each of the last three month-ends, so Path to Deflation reads Bullish.
- **The threshold is reachable in principle.** Monthly volume is about $3.77B. The level needed under the 1.6% plan is about $12.4B, with an interval of $10.8B to $45.9B from how far revenue per dollar of volume has moved.

## The evidence against

- **The gap is large.** A 3.3 times rise is not a rounding error, and the top of the interval is far higher.
- **Revenue per dollar of volume looks lower lately.** It was 5.3 bps over the 30 days before 27 Oct and 4.4 bps over the 17 days since. So few days cannot show that the rate really changed, and DefiLlama may not see all private volume, so this is a warning and not a finding. If the 30-day capture falls under 30%, NEAR's Share of Fees moves from Bullish to Neutral.
- **One frontend brings much of the visible fees.** SwapKit pays 76% of visible app fees over the last 30 frozen days, just under the 80% line for Bearish. Visible app fees are a shrinking part of the flow: the Treasury carried 96% of counted USD over the last 7 days against 44% over 30.
- **Pricing power is unproven.** The best estimate says volume barely moves when a fee changes, but the data cannot tell that apart from a large effect in either direction (below).

## What the fee changes showed

Across 408 days of chain data, 1 Oct 2025 to 12 Nov 2026, 28 fee changes passed the rules and 21 were usable. Elasticity is −0.06, with a 95% interval of −1.64 to 1.51, and random dates with no fee change gave results this large or larger 91% of the time. The smallest effect this test could see is 2.02, so it is underpowered.

At −1 a higher fee leaves revenue flat. The interval runs from below that to above it, so **Pricing Power reads Neutral: not settled**. It is not evidence that volume ignores fees. Every check gives an estimate near zero: dropping the largest frontend, changing the fee shift, leaving out the days of the move to the Treasury and using five outside venues as the control. 8 of 9 keep −1 inside their interval. CoW Swap on DefiLlama as the control gives −0.95 to 1.08, just above −1. It is a check on the reading, not the reading.

Pass-through, how much of a fee change reaches users, is 0.33 with an interval of −0.43 to 1.09, on 16 fee changes. It is underpowered as well.

## What would change my mind

**Toward Bullish:** the Treasury's share of counted USD falling to 50% or below, so that Solver Competition can be measured again and the hold lifts; an elasticity interval that sits entirely above −1; revenue per dollar of volume staying level through the move to private settlement.

**Toward Bearish:** an elasticity interval entirely below −1; revenue falling at each of three month-ends; NEAR's capture staying under 20% for 14 days in a row; one frontend passing 80% of visible app fees.

**Toward giving up on this method:** public intents winding down so far that the frozen chain days hold almost nothing. Then every chain reading is Not Measured, and only DefiLlama's figures are left, which nobody can re-run for free.

Each line, its level and when it was set are in `PREREG.md` and on the What Would Move page. Some lines were set after the figures were seen, and the file says which.

## What could not be computed

- **Fees on confidential swaps.** Since 27 Oct 2026 swaps settle on `intents.far`, which public indexers cannot see. Funds moving to and from the Treasury on `intents.near` are public; what happens in between is not. Any fee on that path is hidden, so it is reported as an all-in cost and never called an app fee.
- **Which solver filled a confidential swap.** Solver identity is gone with the settlement, so Solver Competition cannot be read on that flow.
- **Any flow that stays shielded.** Funds that go in and do not come back in the same day cannot be paired, so counts of confidential flows read low.
- **A fall in public numbers is not a fall in demand.** Flow leaving the public record looks the same as flow leaving the product. Nothing here reads it as the second.
- **A visibility line.** The ratio of DefiLlama volume to chain-counted USD is shown, but with no line and no state: chain days reach only 23 of the 90 days wanted before 27 Oct.
- **How DefiLlama counts private volume.** This is not known. If it loses sight of the same flow the chain does, the ratio would not move, so a steady ratio does not prove the view is whole.
- **Anything before 1 Oct 2025.** The free BigQuery tier sets the start date, not a choice about the data.

## How much to trust this

It is not blind. An earlier private analysis by the same author was seen before any of this was written, and amendments A2, A3 and A4 were each written with some figures already known. Each amendment says what was known when it was written.

A dated hash of each frozen chain day is on NEAR testnet at `tideline-thesis.testnet`, so a day file cannot be changed later without it showing.
