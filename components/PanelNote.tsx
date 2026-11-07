import { connection } from 'next/server';
import { Banner } from './Banner';
import { readPanel } from '@/lib/panel_source';
import { panelView } from '@/lib/panel_view';

const NOT_AVAILABLE = 'The rolling panel is over 24 hours old or could not be read, so it is not shown. Nothing replaces it: no history of the panel is kept anywhere.';

// The rolling panel beside the readings. `pick` chooses which of its lines this page shows.
// Rendered per request, so a cached page can never show the panel past its 24 hours. It sets no reading and reaches no published file.
export async function PanelNote({ pick }: { pick: ('swapsText' | 'frontendText' | 'quoteText')[] }) {
  await connection();
  const p = panelView(await readPanel(), { off: process.env.EXPLORER_PANEL === 'off' });
  if (p.state === 'off') return null;
  return (
    <Banner tone="neutral" title={p.state === 'live' ? `Rolling Panel, ${p.age}` : 'Rolling Panel: Not Available'}>
      {p.state === 'live' ? `${pick.map((k) => p[k]).join(' ')} From the Intents Explorer and 1Click APIs, re-pulled daily, kept 24 hours and stored nowhere. It sets no reading.` : NOT_AVAILABLE}
    </Banner>
  );
}
