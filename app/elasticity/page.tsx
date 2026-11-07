import { Button } from '@/components/Button';
import { Banner } from '@/components/Banner';
import { ErrorSwap, RetryButton } from '@/components/ErrorSwap';
import { IntervalPlot } from '@/components/IntervalPlot';
import { Page } from '@/components/Page';
import { getNumbers } from '@/lib/data';

export const revalidate = 300; // re-read the published data every 5 minutes

// `?state=few` previews the page with under 3 usable fee changes (AC-5.4); `?state=error` is the failed load.
export default async function Elasticity({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { elasticity } = await getNumbers({ few: (await searchParams).state === 'few' });
  if (!elasticity.live || !elasticity.axis) {
    return (
      <Page title="Does Volume Leave When Fees Rise?">
        <div className="err-body">
          <Banner tone="error" title={elasticity.head}>{elasticity.empty}</Banner>
          <div className="err-actions"><RetryButton>Try Again</RetryButton></div>
        </div>
      </Page>
    );
  }
  const days = elasticity.days ?? [];
  const ax = elasticity.axis; // from the first day read to the last
  const start = Date.parse(ax.start), end = Date.parse(ax.end);
  const pos = (d: string) => ((Date.parse(d) - start) / (end - start)) * 100;
  const labels = ax.labels;
  return (
    <Page title="Does Volume Leave When Fees Rise?">
      <ErrorSwap
        error={
          <div className="err-body">
            <Banner tone="error" title="Fee-Change List Did Not Load">
              The fee-change list did not load. No result is shown, and no earlier result is reused.
            </Banner>
            <div className="err-actions"><RetryButton>Try Again</RetryButton></div>
          </div>
        }
        normal={<>
      <div className="e-top">
        <div className="empty">
          <p className="e-head">{elasticity.head}</p>
          {elasticity.empty.split(String.fromCharCode(10)).map((l) => <p key={l} className="e-text" style={{ marginTop: 12 }}>{l.split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))}</p>)}
        </div>
        {elasticity.plot && <IntervalPlot {...elasticity.plot} />}
      </div>
        <div className="e-checks">
          <p className="s-title">Checks</p>
          {elasticity.checks.map((c, i) => (
            <div key={i}>
              <p className="s-name">{c.name}</p>
              <p className="s-text">{c.text}</p>
            </div>
          ))}
        </div>

      <figure className="chart" aria-label={`${days.length} fee changes on a date axis`}>
        <p className="abs strong" style={{ left: 40, top: 24 }}>{`${days.length} Frozen Fee Changes`}</p>
        <p className="abs small" style={{ left: 40, top: 52 }}>
          {elasticity.caption}
        </p>
        <div className="axis">
          <span className="atrack" />
          {days.map((d, i) => <span key={i} className="atick" style={{ left: `${pos(d)}%` }} />)}
          {labels.map(([t, d], i) => (
            <span key={t} className={i % 2 ? 'lab-skip' : undefined}>
              <span className="amark" style={{ left: `${pos(d)}%` }} />
              <span className={i === 0 ? 'alabel first' : 'alabel'} style={{ left: `${pos(d)}%` }}>{t}</span>
            </span>
          ))}
        </div>
        <div className="mde">{elasticity.mde}</div>
      </figure>

      <a className="s-query q-own" href="/reproduce/#elasticity">Open the Query</a>
      <Button href="/model/" variant="secondary">Use the Full Range in the Model</Button>
        </>}
      />
    </Page>
  );
}
