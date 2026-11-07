// Fixed site text and small helpers shared by the pages. No figures live here: every number on the site comes from data/published/.
export type Status = 'Bullish' | 'Neutral' | 'Bearish' | 'Not Measured';

// S5: the commands, and example values for previewing the anchored and mismatch states.
export type AnchorState = 'anchored' | 'mismatch';
export const commands = [
  { cmd: 'npm run verify', example: 'Example output: every number prints OK, then ALL OK', width: 520 },
  { cmd: 'npm run attest:check <day>', example: 'Example output: match, mismatch, or not yet anchored', width: 560 },
  { cmd: 'npm run rebuild', example: 'Recomputes every chart from stored public data, with no key', width: 520 },
  { cmd: 'npm run rebuild -- --bigquery', example: 'Re-runs the SQL with your own Google project', width: 520 },
  { cmd: 'npm run panel', example: 'Prints the rolling panel with your own key and writes nothing', width: 520 },
];
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
