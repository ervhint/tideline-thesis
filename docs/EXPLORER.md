# The rolling panel

The Intents Explorer API and the 1Click API show things public chain data no longer can: swaps that settle on `intents.far`, the frontends behind them, and what a quote costs right now. Their terms (1ClickSwap API Terms, updated 7 Oct 2026) forbid keeping that data. So Tideline shows it beside the readings and keeps none of it.

Intents Technology is the technology provider of these APIs. Nothing here is endorsed by it.

## How it works

1. `panel.yml` runs once a day. `pipeline/panel.mjs` re-pulls the last 30 finished UTC days, one request every 5.2 seconds, about 45 minutes.
2. Each page of rows is folded into totals in memory (`analysis/panel.mjs`) and dropped. No row touches a disk.
3. It takes 16 dry quotes from 1Click, 5.2 seconds apart, and reduces them to one line per size (`analysis/fee_trace.mjs`). No JWT here, because a JWT removes the default fee and this measures what a default user pays. Dry quotes sign nothing and move no funds.
4. The totals are saved as a GitHub Actions artifact with `retention-days: 1`, and the job deletes any older copy.
5. The BFF reads the newest artifact on each request (`lib/panel_source.ts`). Over 24 hours old, or unreadable, the page says "Not Available". Nothing replaces it.

No history of the panel exists anywhere. The job's log carries no figure, because logs on a public repo are public.

## What is in it

Totals only: swaps, USD, app fee rate, the same since 27 Oct, the five largest frontends by share, and the quote line per size. No wallet addresses, deposit addresses or per-swap rows. A referral that looks like an account is shown as "Other".

The panel sets no reading and no side. The readings and the verdict use stored public data only, so nothing from these APIs reaches git, `data/`, `thesis.json`, a log or a Telegram message.

## Which rows count as swaps

Checked on one recent day in memory on 7 Nov 2026, with nothing stored. Only the rule is written down here; figures from the API may not be kept.

- **Masking transactions.** The API docs say a swap-specific filter excludes masking transactions. `minUsdPrice` is such a filter. A very small positive value removed no rows on the day checked, so no masking row was in the plain list that day. The panel sets it anyway (`minUsdPrice=0.000001`), because this can change once the private relay opens to all solvers on 9 Nov.
- **`minUsdPrice=0` proves nothing on its own.** Use a positive value to test this.
- **The filter reads the input side only.** The docs say it applies to both amounts, but rows under the line on the output side still come back. So do not rely on it for the output amount.
- **Same token in and out.** Such rows exist, pass every filter, and carry app fees and referrals, so a plain count includes them. The docs call shield and unshield "liquidity movements, not swaps". The panel leaves them out of every total and counts them on their own line.

The rule in code: `isRealSwap` in `analysis/panel.mjs`, and `SWAPS_ONLY` in `pipeline/panel.mjs`.

## The switch

`EXPLORER_PANEL=off` removes the panel from every page, skips the job, and leaves a site that passes every test. Set it as a repo variable for the job and an environment variable for the site.

## Run it yourself

With your own key from partners.near-intents.org in `.env`:

```bash
npm run panel
```

It prints the panel and writes nothing to the repo. With `--out <file>` it writes to a path outside the repo and prints no figure.

Only one job may pull at a time (terms 2.8). If you share a key with another job, run them apart.
