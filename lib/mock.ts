// Fixed site text and small helpers shared by the pages. No figures live here: every number on the site comes from data/published/.
export type Status = 'Bullish' | 'Neutral' | 'Bearish' | 'Not Measured';

// S5: the commands, and example values for previewing the anchored and mismatch states.
// J15 (docs/PLAN.md §6h): three steps anyone can run with no key, then the extras, each saying what it needs.
export type AnchorState = 'anchored' | 'mismatch';
export type Command = { group: 'step' | 'extra'; title: string; text: string; cmd: string; example: string; need?: string };
export const commands: Command[] = [
  { group: 'step', title: 'Get the code', text: 'Download the project and install what it uses. Needs Node 24; no key and no account.', cmd: 'git clone https://github.com/ervhint/tideline-thesis.git && cd tideline-thesis && npm ci', example: '' },
  { group: 'step', title: 'Check every number', text: 'Works out every published number again from the saved data and compares it with the files. About a minute.', cmd: 'npm run verify', example: 'You should see: every number OK, then ALL OK.' },
  { group: 'step', title: 'Check a saved day against NEAR testnet', text: 'Fingerprints a saved day and compares it with the fingerprint stored on NEAR testnet, so you can see it was not changed later.', cmd: 'npm run attest:check <day>', example: 'You should see: match. The newest day says not yet anchored until its daily anchor runs.' },
  { group: 'extra', title: 'Recompute every chart', text: 'From the stored public data.', cmd: 'npm run rebuild', example: '', need: 'nothing' },
  { group: 'extra', title: 'Re-run the SQL', text: 'Reads the public NEAR dataset on BigQuery again.', cmd: 'npm run rebuild -- --bigquery', example: '', need: 'your own Google project' },
  { group: 'extra', title: 'Print the rolling panel', text: 'Writes nothing to the repo.', cmd: 'npm run panel', example: '', need: 'your own Explorer key' },
];
// With the panel switched off, nothing on the page mentions it.
export const commandsFor = (off: boolean) => commands.filter((c) => !off || c.cmd !== 'npm run panel');
export const reproduceLead = (off: boolean) => `Three steps, no key and no account. Going further, BigQuery needs your own Google project${off ? '' : ', and the panel your own key'}.`;
export const anchorStates: Record<AnchorState, { tag: string; text: string; archive: string; chain: string }> = {
  anchored: {
    tag: 'Anchored: 10 Nov 2026',
    text: 'The archive for 10 Nov 2026 hashes to the value stored on NEAR testnet. Example only.',
    archive: '9f3a…c71e',
    chain: '9f3a…c71e',
  },
  mismatch: {
    tag: 'Mismatch: 10 Nov 2026',
    text: 'The archive file for 10 Nov 2026 hashes to a different value than the one stored on NEAR testnet. Do not trust that day until the cause is found. Example only.',
    archive: '9f3a…c71e',
    chain: '41b0…77d2',
  },
};

export const bn = (n: number, digits = 1) => `$${(n / 1e9).toFixed(digits)}B`;
