// Tap-to-explain notes (docs/PLAN.md §6g E6). Fixed text in everyday words, with no figure: a note explains a word, never a result.
// Pure and type-annotations only, so Node runs it in tests and the site imports it.
export const GLOSSARY = {
  vstar: { term: 'V* (V-star)', text: 'The monthly swap volume at which buybacks would cancel out the new NEAR created each year. Tideline’s own name for the number this site is about.' },
  issuance: { term: 'Issuance', text: 'New NEAR coins the network creates each year, mostly as rewards for the computers that run it. More coins means each one is a smaller slice.' },
  buyback: { term: 'Buyback', text: 'Using fee income to buy NEAR coins back from the open market. It takes coins out of circulation, pulling against issuance.' },
  deflation: { term: 'Deflation', text: 'When coins leave circulation faster than new ones are created, so the total number of coins goes down instead of up.' },
  intents: { term: 'NEAR Intents', text: 'A swap service on NEAR. You say what you want to swap, and professional traders compete to fill it. Each swap pays small fees.' },
  solver: { term: 'Solver', text: 'A professional trader that fills swaps on NEAR Intents. Solvers compete on price: the more of them, the better the deal for users.' },
  frontend: { term: 'Frontend (Integrator)', text: 'An app or wallet that sends its users’ swaps to NEAR Intents, often charging its own fee on top.' },
  treasury: { term: 'Treasury', text: 'The account of Confidential Intents: the doorway into NEAR’s private swap system. Money goes in, the swap happens out of public view, and money comes back. It is a bridge into the private system.' },
  confidential: { term: 'Confidential Swaps', text: 'Swaps that settle in a private system, out of public view, since late October. Only the money going in and out can be seen, not the fees or who filled them.' },
  volume: { term: 'Volume', text: 'The total dollar value of all swaps in a period, such as a month.' },
  bps: { term: 'bps (Basis Points)', text: 'One hundredth of a percent. Fees are often counted this way because they are small.' },
  elasticity: { term: 'Elasticity', text: 'How much people change their swapping when a fee changes. At minus one, a higher fee leaves income flat; above it, a higher fee brings in more; below it, less.' },
  passthrough: { term: 'Pass-Through', text: 'How much of a fee change the user ends up paying. All of it means users carry the whole change.' },
  hhi: { term: 'HHI', text: 'One number for how concentrated a market is: the sum of each player’s share, squared. Higher means fewer players hold more.' },
  bullish: { term: 'Bullish', text: 'A good sign for the thesis: the evidence passed a line written down in advance. It is not a claim that the price will rise.' },
  bearish: { term: 'Bearish', text: 'A bad sign for the thesis: the evidence passed the opposite line written down in advance. It is not a claim that the price will fall.' },
  neutral: { term: 'Neutral', text: 'The evidence sits between the two lines, so it points neither way.' },
  notmeasured: { term: 'Not Measured', text: 'There is not enough data to answer, or the data is out of view. Tideline says so instead of guessing.' },
  undecided: { term: 'Undecided', text: 'The verdict does not lean either way, or it is held because data went missing. Missing data is never allowed to move the verdict.' },
  defillama: { term: 'DefiLlama', text: 'A free public website that tracks volume, fees and income for crypto services. Tideline reads it with no account.' },
  bigquery: { term: 'BigQuery', text: 'Google’s data warehouse, which holds a public copy of the NEAR blockchain. Tideline stores what it read, so you can check without an account.' },
  frozenday: { term: 'Frozen Day', text: 'A day of blockchain data read in full and then saved, never changed again, so every later number can be re-run from it.' },
  hash: { term: 'Hash', text: 'A short digital fingerprint of a file. Change one letter in the file and the fingerprint changes completely.' },
  attest: { term: 'Attest', text: 'Storing a day’s fingerprint on the blockchain, where it cannot be edited, so anyone can later check that the saved data was not changed.' },
  testnet: { term: 'Testnet', text: 'NEAR’s practice blockchain. It works like the real one but holds no real money, so storing fingerprints there costs nothing.' },
} as const;

export type TermKey = keyof typeof GLOSSARY;
export const isTermKey = (k: string): k is TermKey => Object.hasOwn(GLOSSARY, k);

// Easy text marks a hard word as [[word]] or [[shown words|key]]. These split such a string into plain text and terms.
const MARK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
export type Piece = { text: string } | { label: string; key: TermKey };
export function pieces(s: string): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const m of s.matchAll(MARK)) {
    if (m.index > at) out.push({ text: s.slice(at, m.index) });
    const key = (m[2] ?? m[1]).toLowerCase();
    out.push(isTermKey(key) ? { label: m[1], key } : { text: m[1] });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ text: s.slice(at) });
  return out;
}
// Every marked key, known or not (the tests check each one is in GLOSSARY), and the text as read.
export const marks = (s: string) => [...s.matchAll(MARK)].map((m) => (m[2] ?? m[1]).toLowerCase());
export const plain = (s: string) => s.replace(MARK, (_, label) => label);
