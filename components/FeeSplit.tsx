import { Rich, Say } from './Say';
import type { feeView } from '@/lib/fee_view';

// The cost bar and its rows, drawn on Follow the Fee and on All Charts (docs/PLAN.md §6j L4): one drawing, so both always match.
// Swatches: App Fee dark, Withdraw Fee blue, Unexplained muted (Figma, version B).
const swatch: Record<string, string> = { app: 'var(--action)', spread: 'var(--accent)', withdraw: 'var(--accent)', protocol: 'var(--text-muted)', unexplained: 'var(--text-muted)' };

export type FeeSplitView = Extract<ReturnType<typeof feeView>, { state: 'split' }>;

export function FeeSplit({ fee }: { fee: FeeSplitView }) {
  const bar = fee.parts.filter((p) => p.share);
  return (
    <>
      <div className="cbar" role="img" aria-label={bar.map((p) => `${p.value} ${p.name}`).join(', ')}>
        <p className="abs strong" style={{ left: 0, top: 0 }}><Say pro={`All-In ${fee.total}`} easy={`Total ${fee.total}`} /></p>
        <p className="abs small" style={{ left: 0, top: 26 }}><Say pro={`${fee.card.value} below the outside price`} easy={fee.easyBelow} /></p>
        <div className="callout">
          <p className="strong"><Say pro={fee.spreadNote} easy={fee.easySpreadNote} /></p>
          <p className="small"><Say pro={fee.spreadSub} easy={fee.easySpreadSub} /></p>
          <span className="ctick" />
        </div>
        <div className="ctrack">
          {bar.map((p) => (
            <span key={p.key} style={{ flexGrow: p.share, minWidth: p.minPx, background: swatch[p.key] }} />
          ))}
        </div>
        <div className="cscale">{['0%', '25%', '50%', '75%', '100%'].map((t) => <span key={t}>{t}</span>)}</div>
      </div>
      {fee.parts.map((p) => (
        <div className="s-row" key={p.key}>
          {p.share ? <span className="sw" style={{ background: swatch[p.key] }} /> : <img src="/assets/ring.svg" alt="" width={14} height={14} />}
          <p className={`s-val${p.share ? '' : ' dim'}`}>{p.value}</p>
          <div>
            <p className="s-name"><Say pro={p.name} easy={p.easyName ?? p.name} /></p>
            <p className="s-text"><Say pro={p.text} easy={<Rich text={p.easy} />} /></p>
          </div>
        </div>
      ))}
    </>
  );
}
