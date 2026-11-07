# Daily jobs: started from cron-job.org

GitHub's own `schedule` trigger dropped about 85% of Tideline's scheduled runs and started the rest up to 8 hours late (5 to 6 Nov 2026, our setup checked and correct). So the four daily jobs have no GitHub schedule. cron-job.org (free) starts them through GitHub's "start a workflow" API instead. Decided by the human on 6 Nov 2026.

Nothing else changes: the jobs run in GitHub Actions as before, commit only after `npm run verify` passes, and a re-run is always safe (a frozen day or an anchored day is skipped in seconds; one run per job at a time).

## 1. The GitHub token (the human makes it)

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.

- Name: `tideline-cron`
- Expiration: 31 Dec 2026
- Repository access: **Only select repositories** → `ervhint/tideline-thesis`
- Repository permissions: **Actions: Read and write**. Nothing else (Metadata: read is added by GitHub).

What it can do: start, re-run, cancel and delete workflow runs on this one repo. It cannot read or change code, secrets or settings. The token is pasted only into cron-job.org, never into chat, a file or a commit.

## 2. The jobs on cron-job.org

Four cronjobs (a fifth, for activity, is in 2b), time zone **Asia/Jakarta (WIB)**, each with a custom crontab that holds both of its daily times.

| Title | Crontab (WIB) | Times WIB (UTC) | Workflow file | Body |
| --- | --- | --- | --- | --- |
| tideline chain-day | `17 10,13 * * *` | 10:17 (03:17), retry 13:17 (06:17) | `chain-day.yml` | `{"ref":"main","inputs":{"commit":"true"}}` |
| tideline attest-days | `41 12,15 * * *` | 12:41 (05:41), late 15:41 (08:41) | `attest-days.yml` | `{"ref":"main","inputs":{"dry_run":"false"}}` |
| tideline refresh | `23 * * * *` | every hour at :23 | `refresh.yml` | `{"ref":"main","inputs":{"dry_run":"false"}}` |
| tideline panel | `7 9 * * *` | 09:07 (02:07) | `panel.yml` | `{"ref":"main"}` |

For every job, under **Advanced**:

- URL: `https://api.github.com/repos/ervhint/tideline-thesis/actions/workflows/<workflow file>/dispatches`
- Request method: **POST**
- Headers:
  - `Accept: application/vnd.github+json`
  - `Authorization: Bearer <the token>`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `Content-Type: application/json`
  - `User-Agent: tideline-cron`
- Request body: from the table.
- Notifications: email on failure. GitHub answers **204** when it started the run; anything else counts as a failure.

Why these times: a chain day freezes at least 2 hours after it ends, and the freeze takes 45 to 95 minutes, so attest-days at 05:41 follows the 03:17 freeze. The 06:17 retry only works if the first run failed (otherwise it stops in seconds), and the 08:41 attest catches a day the retry froze.

## 2b. The weekly activity job (T6f)

A fifth cronjob, set up like the four above:

| Title | Crontab (WIB) | Times WIB (UTC) | Workflow file | Body |
| --- | --- | --- | --- | --- |
| tideline activity | `41 11 * * 6` | Saturday 11:41 (04:41) | `activity.yml` | `{"ref":"main"}` |

It needs a Google login, kept as a repo secret. The human makes it; the key never appears in chat, a file or a commit.

1. Google Cloud console, project `tideline-check` → IAM & Admin → Service Accounts → **Create service account**. Name: `tideline-activity`. Role: **BigQuery Job User**. Nothing else: the NEAR dataset is public.
2. Open the new account → Keys → Add key → Create new key → **JSON**. A file downloads.
3. GitHub → `ervhint/tideline-thesis` → Settings → Secrets and variables → Actions → New repository secret. Name: `GOOGLE_SA_KEY`. Value: the whole JSON file. Then delete the downloaded file.
4. Start the job once by hand: Actions → activity → Run workflow. It should commit `data: activity <date>`.

If Google says key creation is disabled for the project, stop and tell the agent: the fallback is GitHub's keyless sign-in to Google (Workload Identity Federation), which takes more steps.

## 3. Check it works

1. Press **Test run** on `tideline refresh`. Within a minute `gh run list --workflow refresh.yml` shows a `workflow_dispatch` run.
2. The first `tideline chain-day` run (or its Test run) freezes the newest finished day. That run is also the first real day for `npm run rebuild`.
3. Telegram still reports a failed freeze (the step runs when `commit` is on). A run that never starts shows as a failed cron-job.org job, which emails the human.
