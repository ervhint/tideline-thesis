import { Page } from '@/components/Page';
import { ExtLink } from '@/components/ExtLink';
import { Table } from '@/components/Table';
import { getActivity, getChainChecks, getReconciliation, getTokenBoard, getVisibility } from '@/lib/data';
import { reconcileRows, type Row } from '@/lib/reconcile_view';
import { Banner } from '@/components/Banner';
import { BarCharts } from '@/components/BarCharts';
import { activityCharts } from '@/lib/bar_charts';
import { ActivityIntro, hasVisibility, VisibilityText } from '@/components/MethodText';
import { Term } from '@/components/Term';
import { EASY } from '@/lib/easy_text';
import { Rich, Say } from '@/components/Say';
import type { ReactNode } from 'react';
import type { TermKey } from '@/lib/glossary';

// Sources with a term note, in both modes.
const SOURCE_TERM: Record<string, TermKey> = { DefiLlama: 'defillama', BigQuery: 'bigquery', 'Confidential Intents': 'confidential' };

const sources: [string, string | string[]][] = [
  ['DefiLlama', 'Volume, fees and revenue for the last 30 days, and hourly token prices. No key.'],
  ['BigQuery', 'The public NEAR dataset: a year of intents.near logs for fee changes, and 90 days of transactions and contract use, re-run each week. Stored here, so a re-run needs no account.'],
  ['FastNEAR', 'intents.near settlement logs: every transaction that names a known solver or the Confidential Intents treasury, read in full for each day, not sampled. Swaps, frontend, fees and solver come from these. No key.'],
  ['Confidential Intents', [
    'docs.near-intents.org names account 51e8f94d…7cbe as the treasury of Confidential Intents: funds sent to it move to a private chain, the swap settles there, and funds come back.',
    'So it is a bridge, not a solver, and only the transfers in and out are public.',
    'Treasury day files sum those transfers by token and direction, keep no wallet addresses and set no reading.',
    'Anchors written from 8 Nov 2026 on carry the hash of the day’s treasury file; anchors written before that cannot, because a record is written once.',
    'An email from NEAR Intents (6 Nov 2026) said this would become the main path on 9 Nov 2026 and that public intents would wind down later, with no date; the email is the only source for those two points.',
  ]],
  ...(process.env.EXPLORER_PANEL === 'off' ? [] : [['Intents Explorer and 1Click', 'The rolling panel only: totals re-pulled once a day, kept 24 hours and stored nowhere. Their terms bar keeping this data, so it sets no reading and none of it is in this repo. Intents Technology is the technology provider of these APIs.'] as [string, string]]),
  ['NEAR RPC', 'Token supply, token decimals and names, and the testnet contract that anchors each frozen day. No key.'],
];
// Each row: our figure, then every other source with its value and the date it gave, then why they differ.
const others = (os: Row['others']) =>
  os.map((o) => (
    <span key={o.name} style={{ display: 'block' }}>
      {o.url ? <ExtLink href={o.url}>{o.name}</ExtLink> : o.name}: {o.value}
      <span style={{ display: 'block' }}>{o.date}</span>
    </span>
  ));

// Easy (J21): the plain line first, the full detail in a fold. Pro shows the detail as it is.
function Fold({ easy, children }: { easy: ReactNode; children: ReactNode }) {
  return (
    <Say
      block
      pro={children}
      easy={<>{easy}<details className="means-more m-fold"><summary>{EASY.method.detail}</summary><div className="m-fold-body">{children}</div></details></>}
    />
  );
}

export const revalidate = 300; // re-read the published data every 5 minutes

// `?state=error` previews the page with the published file unreadable: the same path a real failed read takes.
export default async function Method({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const preview = (await searchParams).state === 'error';
  const rows = preview ? reconcileRows({ vstar: null, buybackShare: null, fees: [], volume: [] }) : await getReconciliation();
  const failed = rows.every((r) => r.ours === 'Not available');
  const differ = rows.map((r) => [r.figure, r.ours, others(r.others), r.why]);
  const checks = await getChainChecks();
  const board = await getTokenBoard();
  const vis = await getVisibility();
  const activity = await getActivity();
  const charts = activityCharts(activity);
  const int = (n: number) => n.toLocaleString('en-US');
  return (
    <Page title="How the Numbers Are Made" ask={EASY.ask.method} easyLead={EASY.methodLead} lead="Where each number comes from, what was decided before looking, and where public figures disagree.">
      <div className="panel-row two">
        <div className="glass stack">
          <p className="s-title">Where the Numbers Come From</p>
          <Fold easy={<>
            <p className="p-body">{EASY.method.sources}</p>
            {sources.map(([n]) => EASY.method.sourceLines[n] && (
              <div key={n}><p className="src-name">{n}</p><p className="src-text"><Rich text={EASY.method.sourceLines[n]} /></p></div>
            ))}
          </>}>
            {sources.map(([n, t]) => (
              <div key={n}>
                <p className="src-name">{SOURCE_TERM[n] ? <Term k={SOURCE_TERM[n]}>{n}</Term> : n}</p>
                {Array.isArray(t)
                  ? <ul className="src-list">{t.map((x) => <li key={x} className="src-text">{x}</li>)}</ul>
                  : <p className="src-text">{t}</p>}
              </div>
            ))}
          </Fold>
        </div>
        <div className="glass stack">
          <p className="s-title">Decided Before Looking</p>
          <Fold easy={<p className="p-body">{EASY.method.decided}</p>}>
          <p className="p-body">The list of fee changes and the level for each reading are written down in the pre-registration before volume is looked at. If the list changes later, the change is shown on the page.</p>
          <p className="p-body">It is not blind: an earlier private estimate by the same author was seen first, and the pre-registration says so on its first line.</p>
          <p className="p-body">Amendment A2 was added on 6 Nov 2026, after the shift to the treasury was seen and with the published readings known, and it says so. It stops a loss of data from moving the verdict: without it, Solver Competition going Not Measured would have lifted the verdict to Bullish.</p>
          <p className="p-body">Amendment A3 sets out {process.env.EXPLORER_PANEL === 'off' ? '' : 'the rolling panel and '}the visibility check, and A4 the year of chain history for fee changes. Each was added on 7 Nov 2026 before the data it governs was read, and each says what was already known.</p>
          </Fold>
          {/* Pro (J21): the visibility check as its own small block, not mid-paragraph. Easy says it plainly. */}
          {hasVisibility(vis) && (
            <div className="vis-block">
              <p className="src-name"><Say pro="How Much the Public Chain Still Sees" easy="How Much Is Still in Public View" /></p>
              <VisibilityText vis={vis} />
            </div>
          )}
          <Say block pro={<p className="p-body">Every number worked out from our saved data re-runs with npm run verify. Source data such as price and supply is used as given.</p>} easy={null} />
        </div>
      </div>
      <div className="glass stack stack-top">
        <p className="s-title">Where Public Figures Disagree</p>
        {failed && (
          <Banner tone="error" title="Could Not Load Our Figures">
            The published file with our side of these figures could not be read, so every Ours cell says Not available. The other sources are still shown.
          </Banner>
        )}
        <Fold easy={<p className="p-body">{`We compared ${rows.length} of our figures with other public sources. Where they differ, the detail says why.`}</p>}>
          <Table head={['Figure', 'Ours', 'Other Source', 'Why They Differ']} widths={[260, 200, 300, 420]} rows={differ} />
        </Fold>
      </div>
      <div className="glass stack stack-top">
        <p className="s-title">Checked Against the Chain</p>
        {checks ? (
          <>
            <Fold easy={<p className="p-body"><Rich text={checks.easy} /></p>}>
            <p className="p-body">{checks.summary}</p>
            <Table
              head={['Day', 'Transactions Listed', 'Read', 'Swaps', 'Unpriced Swaps', 'What Differs']}
              widths={[160, 170, 140, 140, 150, 400]}
              rows={checks.rows}
            />
            <p className="s-text">Each frozen day lists every intents.near transaction that names a known solver or the Confidential Intents treasury, then reads each one. A day freezes only when at least 99% of the list was read; otherwise it stays a gap. Its file hash is anchored on NEAR testnet (Reproduce). A re-run from scratch reads the same transactions and swaps, but not always the same hash: DefiLlama can later give slightly different hourly prices for small tokens, which moved USD by at most 0.03% when four days were frozen twice.</p>
            </Fold>
          </>
        ) : (
          <Banner tone="error" title="Could Not Load the Chain Checks">The file with the frozen days could not be read, so this table is not shown.</Banner>
        )}
      </div>
      <div className="glass stack stack-top">
        <p className="s-title">Which Swaps the Costs Cover</p>
        {board ? (
          <>
            <Fold easy={<p className="p-body">{board.easy}</p>}>
            <p className="p-body">{board.summary}</p>
            <Table head={['Largest Routes', 'Volume', 'Share', 'Priced']} widths={[420, 200, 160, 300]} rows={board.rows} />
            <p className="s-text">The biggest routes priced on one side only: {board.missing}. The fee figures on Follow the Fee hold for routes priced on both sides; other routes can cost more or less. Volume is the priced side, so routes with no price at all show none.</p>
            </Fold>
          </>
        ) : (
          <Banner tone="error" title="Could Not Load the Coverage Board">The coverage board file could not be read, so this table is not shown.</Banner>
        )}
      </div>
      <div className="glass stack stack-top">
        <p className="s-title">Public Activity on intents.near</p>
        {activity?.weeks.length ? (
          <>
            <ActivityIntro />
            {charts && <BarCharts {...charts} />}
            {/* J21: the charts above carry the same weeks, so the table sits in a fold in both modes. */}
            <details className="means-more m-fold">
              <summary><Say pro="Show the Table" easy="Show the Numbers" /></summary>
              <div className="m-fold-body">
                <Table
                  head={['Week To', 'Transactions', 'Signers a Day', 'Receipts', 'NEAR Burnt']}
                  widths={[200, 200, 180, 200, 180]}
                  rows={activity.weeks.slice(-8).map((w) => [w.to, int(w.transactions), int(w.signersPerDay), int(w.receipts), int(w.nearBurnt)])}
                />
              </div>
            </details>
            <a className="s-query" href="/reproduce/#activity">Open the Query</a>
          </>
        ) : (
          <Banner tone="error" title="Could Not Load Public Activity">The activity file could not be read, so this table is not shown.</Banner>
        )}
      </div>
      <div className="glass stack stack-top">
        <p className="s-title">More on This Site</p>
        <div className="more-row">
          <a href="/concentration/"><Say pro="Who Brings the Volume?" easy={EASY.titles.concentration} /></a>
          <a href="/what-would-move/"><Say pro="What Would Move Each Reading" easy={EASY.titles.move} /></a>
        </div>
      </div>
    </Page>
  );
}
