import type { Status } from '@/lib/mock';
import { QUESTIONS } from '@/lib/easy_text';
import type { TermKey } from '@/lib/glossary';
import { Say } from './Say';
import { Term } from './Term';

// The dot's shape carries the side as well as its colour (Figma: Reading cell).
const dot: Record<Status, { src: string; color: string; term: TermKey }> = {
  'Not Measured': { src: '/assets/dot-not-measured.svg', color: 'var(--text-muted)', term: 'notmeasured' },
  Bullish: { src: '/assets/dot-bullish.svg', color: 'var(--bullish)', term: 'bullish' },
  Neutral: { src: '/assets/dot-neutral.svg', color: 'var(--neutral)', term: 'neutral' },
  Bearish: { src: '/assets/dot-bearish.svg', color: 'var(--bearish)', term: 'bearish' },
};

// Easy names each reading by its plain question (docs/PLAN.md §6g E5); the side keeps its name, with a note.
export function ReadingCell({ qid, name, detail, status }: { qid?: string; name: string; detail: string; status: Status }) {
  const d = dot[status];
  return (
    <div className="reading">
      <div>
        <p className="name"><Say pro={name} easy={qid && QUESTIONS[qid] ? QUESTIONS[qid] : name} /></p>
        <p className="detail">{detail}</p>
      </div>
      <div className="status" style={{ color: d.color }}>
        <img src={d.src} alt="" width={9} height={9} />
        <span><Term k={d.term}>{status}</Term></span>
      </div>
    </div>
  );
}
