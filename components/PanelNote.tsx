import { connection } from 'next/server';
import { Suspense } from 'react';
import { Banner } from './Banner';
import { BarCharts } from './BarCharts';
import { readPanel } from '@/lib/panel_source';
import { panelView } from '@/lib/panel_view';
import { CONFIDENTIAL_DAY, shortDay } from '@/lib/bar_charts';
import { EASY } from '@/lib/easy_text';
import { Say } from './Say';

const NOT_AVAILABLE = 'The rolling panel is over 24 hours old or could not be read, so it is not shown. Nothing replaces it: no history of the panel is kept anywhere.';
const CAPTION = 'From the Intents Explorer API, re-pulled daily, kept 24 hours, stored nowhere. It sets no reading.';
const musd = (n: number) => `$${(n / 1e6).toFixed(1)}M`;

// J23 (docs/PLAN.md §6h): pages wrap PanelNote in Suspense, so the GitHub artifact fetch (about 1.5s) no longer holds
// the whole page; this shows in its place until the panel arrives. Fixed words, no figure.
export function PanelLoading() {
  const t = (pro: string, easy: string) => <Say pro={pro} easy={easy} />;
  return (
    <Banner tone="neutral" title={t('Rolling Panel', EASY.panelTitle)}>
      {t('Loading today’s panel…', 'Loading today’s count…')}
    </Banner>
  );
}

// The slot pages use: nothing at all when the panel is switched off (not even the loading box), otherwise the panel
// streamed in on its own.
export function PanelSlot({ pick }: { pick: ('swapsText' | 'frontendText' | 'quoteText')[] }) {
  if (process.env.EXPLORER_PANEL === 'off') return null;
  return <Suspense fallback={<PanelLoading />}><PanelNote pick={pick} /></Suspense>;
}

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
        {...(i >= 0 ? { marker: { index: i, label: <Say pro="Confidential settlement begins (27 Oct 2026)" easy={`${EASY.panelMarker} (27 Oct 2026)`} /> } } : {})}
        series={[{ title: 'Swap Volume a Day', easyTitle: 'Dollars Swapped a Day', values: days.map((d) => d.usd), fmt: musd }]}
      />
      <p className="bars-cap"><Say pro={CAPTION} easy={EASY.panelSource} /></p>
    </>
  );
  // Easy (docs/PLAN.md §6h J1): fixed words, the chart and one source line. The swaps and quote sentences are Pro only;
  // Easy may show fewer panel figures, never more, and no panel figure reaches an Easy sentence (AGENTS.md 4.1(e)).
  // J7: the app list is Pro wording, so Easy says what it is in fixed words and keeps the figures in Pro.
  const appsOnly = !pick.includes('swapsText') && pick.includes('frontendText');
  const title = (pro: string, easy: string) => <Say pro={pro} easy={easy} />;
  return (
    <Banner tone="neutral" title={p.state === 'live' ? title(`Rolling Panel, ${p.age}`, `${EASY.panelTitle}, ${p.age}`) : title('Rolling Panel: Not Available', `${EASY.panelTitle}: Not Available`)} extra={chart || undefined}>
      {p.state === 'live' ? <Say
        pro={`${pick.map((k) => p[k]).join(' ')} From the Intents Explorer and 1Click APIs, re-pulled daily, kept 24 hours and stored nowhere. It sets no reading.`}
        easy={appsOnly ? `${EASY.panelNoFigures} ${EASY.panelSource}` : [EASY.panel, ...(chart ? [] : [EASY.panelSource])].join(' ')}
      /> : <Say pro={NOT_AVAILABLE} easy={EASY.panelGone} />}
    </Banner>
  );
}
