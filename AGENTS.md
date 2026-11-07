# Tideline: agent rules

A re-runnable investment thesis for NEAR on NEAR Intents fee data. Hackathon track: Investment Thesis.

- **Start here:** PROGRESS.md, then docs/PLAN.md. Docs: docs/SRS.md (requirements), docs/DESIGN.md, docs/TESTS.md, docs/EXPLORER.md (the rolling panel), docs/CRON.md. Where the SRS and the plan differ, the plan wins.
- Repo: `ervhint/tideline-thesis`. The folder lives in OneDrive, so no git worktrees and only one writer at a time.
- Contract: `tideline-thesis.testnet` (`contract/deployment.json`). `contract/` is byte-identical to the deployed code; if it must change, stop and ask, because a change needs a new deployment. Repo secrets `NEAR_ATTEST_ACCOUNT` and `NEAR_ATTEST_PRIVATE_KEY` sign the daily attest. The key never appears in chat or files.
- Dev server: `npx next dev -p 3112`. Besides the website, only `npm test`, `npm run verify` and gitleaks run locally. Claude in Chrome for all browser work, never the built-in browser pane or Playwright.
- Design references are exact: ask before changing a layout. BFF architecture: the browser talks only to our own routes.
- No Claude attribution on commits. Explain results in plain language and flag anything uncertain.

## Data rule

| Piece | Source | Stored in the repo? |
| --- | --- | --- |
| History to about 28 Oct: frontends, fees, solvers, elasticity | BigQuery and chain data | Yes |
| Treasury flow and confidential share | Chain read | Yes, day files. Each new record carries the file's hash; records written before 8 Nov 2026 can't, because a record is written once |
| V*, revenue, volume, prices | DefiLlama | Yes |
| Active accounts, transactions, contract usage | BigQuery | Yes |
| Frontends and fees since 27 Oct | Explorer API with JWT | **No. Rolling panel only** |
| Current quote breakdown | 1Click dry quotes | **No. Rolling panel only** |

## Terms rules (1ClickSwap API Terms, updated 7 Oct 2026)

- **4.1(e):** nothing from the Explorer or 1Click API, raw or summed, goes in git, in `data/`, in `thesis.json`, in logs or in Telegram messages. That includes figures typed into `THESIS.md` or the README. §17.6 keeps this after the terms end.
- **Rolling panel:** one job re-pulls the last 30 days once a day, works out the panel numbers, and saves them as a GitHub Actions artifact with `retention-days: 1`. Raw rows stay in memory and go when the job ends. The BFF reads the newest artifact and shows "Not Available" if it is over 24 hours old. No history of the panel exists anywhere.
- **Panel contents:** totals only. No wallet addresses, deposit addresses or per-swap rows.
- **4.1(a):** no feed or route may pass API responses through. There is no quotes route, and the panel never goes through `getNumbers`, which `/api/numbers` serves.
- **2.1 and 2.8:** the JWT stays in `.env` and GitHub secrets. One request every 5.2 seconds, and only one job pulling at a time.
- **3.5:** describe Intents Technology only as a technology provider. No logos, no implied endorsement.
- **Readings and the verdict use stored public data only.** The panel sits beside them and never sets a side, so no API-derived value reaches git.
- **Switch:** `EXPLORER_PANEL=off` removes the panel and its job cleanly, and the site still passes every test.

## Confidential shift

- The Treasury (`51e8f94d…7cbe`) is never counted as a solver.
- A fall in public numbers is never described as a fall in demand.
- Q3 stays Not Measured while the Treasury holds over 50% of counted USD, and the verdict hold stands (PREREG.md A2).
- Say plainly what cannot be seen: fees on confidential swaps, solver identity, any flow that stays shielded.
- Every page has a real state for empty public buckets. No sample text exists to fall back on.

Never: commit secrets, sign or deploy on mainnet, spend money, post anywhere, or submit without the human's explicit yes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
