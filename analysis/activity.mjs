// Weekly public activity on intents.near. Pure: the two stored BigQuery results in, seven-day totals out. No network, no clock.
const rowsOf = (doc) => doc.rows.map((r) => Object.fromEntries(doc.columns.map((c, i) => [c, r[i]])));

// Whole weeks counted back from the last day. A part week at the start is left out, so no bar reads low.
export function weeklyActivity(transactions, usage) {
  const use = new Map(rowsOf(usage).map((r) => [r.day, r]));
  const days = rowsOf(transactions).filter((r) => use.has(r.day)).sort((a, b) => (a.day < b.day ? -1 : 1));
  const weeks = [];
  for (let end = days.length; end >= 7; end -= 7) {
    const w = days.slice(end - 7, end), u = w.map((d) => use.get(d.day));
    const sum = (xs, k) => xs.reduce((t, x) => t + x[k], 0);
    weeks.unshift({ from: w[0].day, to: w[6].day, transactions: sum(w, 'transactions'), signersPerDay: Math.round(sum(w, 'activeAccounts') / 7), receipts: sum(u, 'receipts'), nearBurnt: Math.round(sum(u, 'nearBurnt')) });
  }
  return { from: weeks[0]?.from ?? null, to: weeks.at(-1)?.to ?? null, weeks };
}
