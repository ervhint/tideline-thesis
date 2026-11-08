import { connection } from 'next/server';
import { Banner } from './Banner';
import { BarCharts } from './BarCharts';
import { readPanel } from '@/lib/panel_source';
import { panelView } from '@/lib/panel_view';
import { CONFIDENTIAL_DAY, shortDay } from '@/lib/bar_charts';
import { EASY } from '@/lib/easy_text';
import { EasyOnly } from './Say';

const NOT_AVAILABLE = 'The rolling panel is over 24 hours old or could not be read, so it is not shown. Nothing replaces it: no history of the panel is kept anywhere.';
const CAPTION = 'From the Intents Explorer API, re-pulled daily, kept 24 hours, stored nowhere. It sets no reading.';
const musd = (n: number) => `$${(n / 1e6).toFixed(1)}M`;

// The rolling panel beside the readings. `pick` chooses which of its lines this page shows; the page that shows
// swapsText (Follow the Fee) also gets the per-day chart when the panel has per-day totals.
// Rendered per request, so a cached page can never show the panel past its 24 hours. It sets no reading and reaches no published file.
export async function PanelNote({ pick }: { pick: ('swapsText' | 'frontendText' | 'quoteText')[] }) {
  await connection();
  const p = panelView(await readPanel(), { off: process.env.EXPLORER_PANEL === 'off' });
  if (p.state === 'off') return null;
  const days = p.state === 'live' && pick.includes('swapsText') ? p.days : null;
  const i = days?.findIndex((d) => d.day === CONFIDENTIAL_DAY) ?? -1;
  const chart = days && (
    <>
      <BarCharts
        label="Swap volume a day from the Intents Explorer"
        periods={days.map((d) => shortDay(d.day))}
        latestLabel={`${shortDay(days[days.length - 1].day)}, Daily USD`}
        {...(i >= 0 ? { marker: { index: i, label: 'Confidential settlement begins (27 Oct 2026)' } } : {})}
        series={[{ title: 'Swap Volume a Day', values: days.map((d) => d.usd), fmt: musd }]}
      />
      <p className="bars-cap">{CAPTION}</p>
    </>
  );
  return (
    <Banner tone="neutral" title={p.state === 'live' ? `Rolling Panel, ${p.age}` : 'Rolling Panel: Not Available'} extra={chart || undefined}>
      {p.state === 'live' ? <>
        {/* Easy adds fixed words only: no panel figure reaches a sentence (AGENTS.md 4.1(e)). */}
        <EasyOnly as="span">{`${EASY.panel} `}</EasyOnly>
        {`${pick.map((k) => p[k]).join(' ')} From the Intents Explorer and 1Click APIs, re-pulled daily, kept 24 hours and stored nowhere. It sets no reading.`}
      </> : NOT_AVAILABLE}
    </Banner>
  );
}
