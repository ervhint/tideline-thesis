import { Say } from './Say';
import { CSSProperties, ReactNode } from 'react';

// Figma "Cost split" table: label header row, rows divided by a track line. widths are the Figma px, used as proportions so the table never overflows its panel.
export function Table({ head, easyHead, widths, rows }: { head: string[]; easyHead?: string[]; widths: number[]; rows: ReactNode[][] }) {
  const cols = widths.map((w) => `minmax(0, ${w}fr)`).join(' ');
  return (
    <div className="tbl" style={{ '--cols': cols } as CSSProperties}>
      <div className="t-head">{head.map((h, i) => <p key={h}>{easyHead && easyHead[i] !== h ? <Say pro={h} easy={easyHead[i]} /> : h}</p>)}</div>
      {rows.map((r, i) => (
        <div className="t-row" key={i}>
          {r.map((c, j) => <div key={j} className={j === 0 ? 't-first' : 't-cell'} data-l={j === 0 ? undefined : head[j]} data-le={j === 0 || !easyHead ? undefined : easyHead[j]}>{c}</div>)}
        </div>
      ))}
    </div>
  );
}
