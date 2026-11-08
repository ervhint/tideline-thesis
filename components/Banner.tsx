import type { ReactNode } from 'react';
// Stale data, sampler gap, load error. Always says the date and what is not shown (Figma: Banner).
// Default gold frame is for warnings; "neutral" is the quiet note (grey); "error" is a failed load (red).
// `extra` goes under the text (the rolling panel's chart).
export function Banner({ title, children, tone = 'warning', extra }: { title: ReactNode; children: ReactNode; tone?: 'warning' | 'neutral' | 'error'; extra?: ReactNode }) {
  return (
    <div className={`banner${tone === 'warning' ? '' : ` ${tone}`}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="bar" />
      <div>
        <p className="b-title">{title}</p>
        <p className="b-body">{children}</p>
        {extra}
      </div>
    </div>
  );
}
