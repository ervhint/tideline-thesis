// Small bar charts, one per measure, sharing one row of periods. Pure and data-agnostic: Method's activity weeks and the
// rolling panel's days both use it. Every bar starts at zero; a period with no value is not drawn, never drawn as zero.
import { barAria, type BarProps } from '@/lib/bar_charts';

export function BarCharts({ series, periods, latestLabel, marker, label }: BarProps) {
  const n = periods.length;
  return (
    <figure className="bars" role="img" aria-label={barAria({ label, series, periods })}>
      <div className="bars-grid">
        {series.map((s) => {
          const max = Math.max(...s.values.map((v) => v ?? 0)) || 1;
          const last = s.values[n - 1];
          return (
            <div key={s.title} className="bars-one" aria-hidden="true">
              <p className="bars-title">{s.title}</p>
              <p className="bars-latest num">{last == null ? '—' : s.fmt(last)}</p>
              <p className="bars-when">{latestLabel}</p>
              <div className="bars-plot">
                {marker && <span className="bars-mark" style={{ left: `${((marker.index + 0.5) / n) * 100}%` }} />}
                {s.values.map((v, i) => v != null && (
                  <span key={periods[i] + i} className={i === n - 1 ? 'bars-bar last' : 'bars-bar'} style={{ left: `calc(${(i / n) * 100}% + 1px)`, width: `calc(${100 / n}% - 2px)`, height: `${(v / max) * 100}%` }} />
                ))}
              </div>
              <div className="bars-ends num"><span>{periods[0]}</span><span>{periods[n - 1]}</span></div>
            </div>
          );
        })}
      </div>
      {marker && <figcaption className="bars-key"><span className="bars-swatch" />{marker.label}</figcaption>}
    </figure>
  );
}
