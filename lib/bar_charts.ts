// Pure helpers for components/BarCharts.tsx and Method's activity charts. Shared, so it imports nothing from the panel.
export type BarSeries = { title: string; values: (number | null)[]; fmt: (n: number) => string };
export type BarProps = { series: BarSeries[]; periods: string[]; latestLabel: string; marker?: { index: number; label: string }; label: string };
type Activity = { weeks: { from: string; to: string; transactions: number; signersPerDay: number; receipts: number; nearBurnt: number }[] } | null;

export const CONFIDENTIAL_DAY = '2026-10-27';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const show = (s: BarSeries, v: number | null) => (v == null ? 'no total' : s.fmt(v));

export function barAria({ label, series, periods }: Pick<BarProps, 'label' | 'series' | 'periods'>) {
  const n = periods.length;
  return `${label}. ` + series.map((s) => `${s.title}: ${show(s, s.values[0])} for ${periods[0]}, ${show(s, s.values[n - 1])} for ${periods[n - 1]}`).join('; ');
}

// B: one small chart per measure over every stored week. Fewer than two weeks: no chart (the table still shows).
export function activityCharts(a: Activity): BarProps | null {
  const w = a?.weeks ?? [];
  if (w.length < 2) return null;
  const i = w.findIndex((x) => x.from <= CONFIDENTIAL_DAY && x.to >= CONFIDENTIAL_DAY);
  return {
    label: 'Weekly public activity on intents.near',
    periods: w.map((x) => shortDay(x.to)),
    latestLabel: `Week to ${shortDay(w[w.length - 1].to)}`,
    ...(i >= 0 ? { marker: { index: i, label: 'Confidential settlement begins (the week holding 27 Oct 2026)' } } : {}),
    series: [
      { title: 'Transactions', values: w.map((x) => x.transactions), fmt: int },
      { title: 'Signers a Day', values: w.map((x) => x.signersPerDay), fmt: int },
      { title: 'Receipts', values: w.map((x) => x.receipts), fmt: int },
      { title: 'NEAR Burnt', values: w.map((x) => x.nearBurnt), fmt: int },
    ],
  };
}
