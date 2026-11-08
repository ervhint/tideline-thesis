import { Rich, Say } from './Say';

// What This Means at a glance (docs/PLAN.md §6g E11). Three cards, the same in both modes; only the captions change.
// Every bar and number comes from thesisView(...).glance; nothing here is typed in.
type Flow = { share: number; days: number; line: number };
type Props = {
  held: boolean; verdict: string; score: number; flow: Flow | null; hidden: boolean;
  pro: { flowCap: string | null; scoreCap: string };
  easy: { flowCap: string | null; scoreCap: string } | null;
};

const SCORE_MAX = 7; // Pricing Power and Path to Deflation count double: 2 + 1 + 1 + 1 + 2 (PREREG.md section 6)
const SIDE_COLOR: Record<string, string> = { Bullish: 'var(--bullish)', Bearish: 'var(--bearish)' };
const HIDDEN: [string, string, string][] = [
  ['Fees on confidential swaps', 'Fees on private swaps', 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c4.5 0 8 3.6 9.5 7a13 13 0 0 1-2.6 3.8M6.6 6.6A13 13 0 0 0 2.5 12c1.5 3.4 5 7 9.5 7a9.6 9.6 0 0 0 5.4-1.6'],
  ['Which solver filled them', 'Who filled them', 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h3.5M19 22v.01M19 19a2 2 0 0 0 .9-3.8 2 2 0 0 0-2.4.4'],
  ['Flow that stays shielded', 'Money that stays private', 'M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM11 16a1 1 0 1 0 2 0 1 1 0 0 0-2 0M8 11V7a4 4 0 1 1 8 0v4'],
];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Glance({ held, verdict, score, flow, hidden, pro, easy }: Props) {
  const cells = Array.from({ length: SCORE_MAX * 2 + 1 }, (_, i) => i - SCORE_MAX);
  const fill = held ? 'var(--neutral)' : SIDE_COLOR[verdict] ?? 'var(--neutral)';
  const on = (i: number) => (score > 0 ? i > 0 && i <= score : score < 0 ? i < 0 && i >= score : false);
  return (
    <div className="glance">
      <div className="g-card">
        <p className="g-k">{held ? 'Why It Is on Hold' : 'Verdict'}</p>
        {held && flow ? (
          <>
            <p className="g-big num">{pct(flow.share)} Private</p>
            <div className="g-bar" role="img" aria-label={`${pct(flow.share)} private, line at ${pct(flow.line)}`}>
              <div className="g-track"><i style={{ width: `${Math.min(100, flow.share * 100)}%` }} /></div>
              <span className="g-line" style={{ left: `${flow.line * 100}%` }} />
            </div>
            <div className="g-ticks num"><span style={{ left: `${flow.line * 100}%` }}>{`${pct(flow.line)} line`}</span></div>
          </>
        ) : (
          <p className="g-big">{verdict}</p>
        )}
        {pro.flowCap && <p className="g-cap"><Say pro={pro.flowCap} easy={easy?.flowCap ? <Rich text={easy.flowCap} /> : pro.flowCap} /></p>}
      </div>

      <div className="g-card">
        <p className="g-k">{held ? 'Score, on Hold' : 'Score'}</p>
        <p className="g-big num">{`${score > 0 ? '+' : score < 0 ? '−' : ''}${Math.abs(score)} of ${SCORE_MAX}`}</p>
        <div className="g-score" role="img" aria-label={`Score ${score} on a scale from −${SCORE_MAX} to +${SCORE_MAX}`}>
          {cells.map((i) => <span key={i} className={i === 0 ? 'zero' : undefined} style={on(i) ? { background: fill } : undefined} />)}
        </div>
        <div className="g-ticks g-ends num"><span>{`−${SCORE_MAX}`}</span><span>0</span><span>{`+${SCORE_MAX}`}</span></div>
        <p className="g-cap"><Say pro={pro.scoreCap} easy={easy ? <Rich text={easy.scoreCap} /> : pro.scoreCap} /></p>
      </div>

      {hidden && (
        <div className="g-card">
          <p className="g-k">What Nobody Can See</p>
          <ul className="g-list">
            {HIDDEN.map(([p, e, d]) => (
              <li key={p}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
                <Say pro={p} easy={e} />
              </li>
            ))}
          </ul>
          <p className="g-cap"><Say pro="Fewer public swaps is not less demand." easy="Fewer public swaps does not mean fewer people swapping." /></p>
        </div>
      )}
    </div>
  );
}
