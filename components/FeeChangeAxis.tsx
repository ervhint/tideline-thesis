import { Say } from './Say';
import type { elasticityView } from '@/lib/elasticity_view';

// The fee changes on a date axis, drawn on Elasticity and on All Charts (docs/PLAN.md §6j L4): one drawing, so both always match.
type View = ReturnType<typeof elasticityView>;

export function FeeChangeAxis({ elasticity }: { elasticity: View }) {
  if (!elasticity.axis) return null;
  const days = elasticity.days ?? [];
  const ax = elasticity.axis; // from the first day read to the last
  const start = Date.parse(ax.start), end = Date.parse(ax.end);
  const pos = (d: string) => ((Date.parse(d) - start) / (end - start)) * 100;
  const labels = ax.labels;
  return (
    <figure className="chart" aria-label={`${days.length} fee changes on a date axis`}>
      <p className="abs strong" style={{ left: 40, top: 24 }}><Say pro={`${days.length} Frozen Fee Changes`} easy={elasticity.easy?.title ?? `${days.length} Frozen Fee Changes`} /></p>
      <p className="abs small" style={{ left: 40, top: 52 }}>
        <Say pro={elasticity.caption} easy={elasticity.easy?.caption ?? elasticity.caption} />
      </p>
      <div className="axis">
        <span className="atrack" />
        {days.map((d, i) => <span key={i} className="atick" style={{ left: `${pos(d)}%` }} />)}
        {labels.map(([t, d], i) => (
          <span key={t} className={i % 2 ? 'lab-skip' : undefined}>
            <span className="amark" style={{ left: `${pos(d)}%` }} />
            <span className={i === 0 ? 'alabel first' : 'alabel'} style={{ left: `${pos(d)}%` }}>{t}</span>
          </span>
        ))}
      </div>
      <div className="mde"><Say pro={elasticity.mde} easy={elasticity.easy?.mde ?? elasticity.mde} /></div>
    </figure>
  );
}
