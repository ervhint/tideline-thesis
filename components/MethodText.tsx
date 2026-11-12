import { Say } from './Say';
import type { Visibility } from '@/lib/data';

// Method's words for two side measures, shared with All Charts (docs/PLAN.md §6j L4), so both pages always say the same.

type Vis = Visibility & { ratio: number; rangeBefore: { low: number; high: number } };
export const hasVisibility = (v: Visibility | null): v is Vis => v?.ratio != null && v.rangeBefore != null;

export function VisibilityText({ vis }: { vis: Vis }) {
  return (
    <Say
      pro={<p className="p-body"><b className="num">{vis.ratio.toFixed(2)}</b>: DefiLlama volume divided by chain-counted USD over 7 days, on {vis.lastDay} (${((vis.llama7dUsd ?? 0) / 1e6).toFixed(0)}M against ${((vis.chain7dUsd ?? 0) / 1e6).toFixed(0)}M). Before 27 Oct it ran from {vis.rangeBefore.low.toFixed(2)} to {vis.rangeBefore.high.toFixed(2)}. A higher ratio means the chain sees less, which is lost sight, not lost demand. It carries no line and no state: chain days reach only {vis.history.chainDaysBefore} of the {vis.history.wantedDays} days before 27 Oct, too few to set one (amendment A3).</p>}
      easy={<p className="p-body">{vis.ratio > vis.rangeBefore.high ? `DefiLlama now counts about ${vis.ratio.toFixed(1)} times the swapping we can see on the public record; before 27 Oct it was ${vis.rangeBefore.low.toFixed(1)} to ${vis.rangeBefore.high.toFixed(1)} times. So more swaps are out of view. It does not mean fewer people are swapping.` : `DefiLlama counts about ${vis.ratio.toFixed(1)} times the swapping we can see on the public record, in the range it had before 27 Oct (${vis.rangeBefore.low.toFixed(1)} to ${vis.rangeBefore.high.toFixed(1)} times).`}</p>}
    />
  );
}

export function ActivityIntro() {
  return <Say block pro={<p className="p-body">Each week of transactions, signing accounts, receipts and NEAR burnt as gas, from the BigQuery public dataset. Treasury traffic is in these counts, so more activity is not more swaps, and signers are mostly relayers and solvers, not users.</p>} easy={<p className="p-body">Weekly counts of activity on NEAR Intents. They include the private system’s traffic, so more activity does not mean more swaps.</p>} />;
}
