import type { ReactNode } from 'react';
import { Banner } from '@/components/Banner';
import { BarCharts } from '@/components/BarCharts';
import { FeeChangeAxis } from '@/components/FeeChangeAxis';
import { FeeSplit } from '@/components/FeeSplit';
import { Gauge } from '@/components/Gauge';
import { heroLines } from '@/components/Hero';
import { IntervalPlot } from '@/components/IntervalPlot';
import { ActivityIntro, hasVisibility, VisibilityText } from '@/components/MethodText';
import { Page } from '@/components/Page';
import { ReadingCell } from '@/components/ReadingCell';
import { Rich, Say } from '@/components/Say';
import { Table } from '@/components/Table';
import { activityCharts } from '@/lib/bar_charts';
import { concentrationLead, getActivity, getConcentration, getNumbers, getVisibility } from '@/lib/data';
import { EASY } from '@/lib/easy_text';
import { PAGE_OF, WIDE } from '@/lib/charts_page';
import { ENTRIES, GROUPS, type Entry } from '@/lib/reproduce_entries';
import './charts.css';

// All Charts (docs/PLAN.md §6j): every chart on the site, populated from the same components and words its own page uses.
// Nothing here is new: no number and no sentence with a figure. No rolling panel (terms 4.1(e)).
export const revalidate = 300; // re-read the published data every 5 minutes

// long: a takeaway of a paragraph or more, set a size smaller so it reads as text, not a headline.
type Body = { take?: ReactNode; vis?: ReactNode; extra?: ReactNode; long?: boolean };

function Card({ e, body }: { e: Entry; body: Body }) {
  const source = <p className="ac-source">Source: {e.source}.</p>;
  return (
    <article className={`glass ac-card${WIDE.has(e.id) ? ' ac-wide' : ''}`} id={e.id} aria-labelledby={`${e.id}-h`}>
      <h3 className="ac-name" id={`${e.id}-h`}><Say pro={e.name} easy={e.easyName ?? e.name} /></h3>
      {body.take && <div className={body.long ? 'ac-take ac-long' : 'ac-take'}>{body.take}</div>}
      {body.vis && <div className="ac-vis">{body.vis}</div>}
      <p className="ac-sentence"><Say pro={e.sentence} easy={e.easy} /></p>
      <Say block pro={source} easy={<details className="means-more q-fold"><summary>Show the Files</summary>{source}</details>} />
      <div className="ac-links">
        {body.extra}
        <a className="s-query" href={`/reproduce/#${e.id}`}>Open the Query</a>
        <a className="s-query" href={PAGE_OF[e.id]}><Say pro="See It on Its Page" easy="See the Full Page" /></a>
      </div>
    </article>
  );
}

export default async function AllCharts() {
  const [{ figures, readings, headline, fee, elasticity, easy }, conc, vis, activity] = await Promise.all([getNumbers(), getConcentration(), getVisibility(), getActivity()]);
  const bars = activity ? activityCharts(activity) : null;
  const hero = figures ? heroLines(figures.multiple, figures.covered) : null;
  const home = easy.home;

  // L4: each card's takeaway and chart, from the same view its own page reads. L5: a failed file shows its page's banner.
  const body: Record<string, Body> = {
    gauge: figures && hero ? {
      take: <p><Say pro={hero.pro.join(' ')} easy={hero.easy.join(' ')} /></p>,
      vis: <Gauge today={figures.today} max={figures.max} thresholds={figures.thresholds} todayNote="last 30 days" gapCaption={figures.gapCaption} easyGapCaption={figures.gapCaption.replace('short each month', 'still missing each month')} inset />,
    } : { vis: <Banner tone="error" title="Numbers Did Not Load">{headline.verdictText}</Banner> },
    'fee-trace': fee.state === 'split' ? {
      take: <p><Say pro={fee.lead} easy={<Rich text={fee.easyLead} />} /></p>,
      vis: <div className="ac-split num"><FeeSplit fee={fee} /></div>,
    } : fee.state === 'empty' ? {
      vis: <Banner tone="neutral" title="No Public Swaps to Split"><Say pro={fee.body} easy={<Rich text={fee.easyBody} />} /></Banner>,
    } : { vis: <Banner tone="error" title="Swaps Did Not Load">The file of realised swaps did not load. Nothing is shown rather than a guess.</Banner> },
    elasticity: elasticity.live && elasticity.axis ? {
      take: <p><Say pro={elasticity.head} easy={elasticity.easy?.head ?? elasticity.head} /></p>,
      vis: <>{elasticity.plot && <IntervalPlot {...elasticity.plot} />}<FeeChangeAxis elasticity={elasticity} /></>,
    } : { vis: <Banner tone="error" title={elasticity.head}>{elasticity.empty}</Banner> },
    model: {
      extra: <a className="btn ac-btn" href="/model/"><span>Open the Model</span><span className="knob"><img src="/assets/chevron.svg" alt="" width={14} height={14} /></span></a>,
    },
    concentration: {
      take: <p><Say pro={concentrationLead(conc)} easy={<Rich text={EASY.concentrationLead} />} /></p>,
      vis: <Table head={['Swap Size', 'Largest Integrator', 'Top-3 Solver Share', 'HHI']} easyHead={['Swap Size', 'Biggest App', 'Top 3 Traders', 'HHI']} widths={[200, 190, 190, 150]} rows={conc.rows} />,
    },
    confidential: headline.privateLine ? { take: <p>{headline.privateLine}</p>, long: true } : { vis: <Banner tone="error" title="Numbers Did Not Load">{headline.verdictText}</Banner> },
    visibility: hasVisibility(vis) ? {
      take: <><p className="ac-figure num">{vis.ratio.toFixed(2)}</p><VisibilityText vis={vis} /></>,
      long: true,
    } : { vis: <Banner tone="error" title="Could Not Load the Visibility Check">The visibility file could not be read, so this figure is not shown.</Banner> },
    activity: bars ? { take: <ActivityIntro />, long: true, vis: <BarCharts {...bars} /> } : { vis: <Banner tone="error" title="Could Not Load Public Activity">The activity file could not be read, so this chart is not shown.</Banner> },
  };

  return (
    <Page
      title="Every Chart in One Place"
      ask={EASY.ask.charts}
      lead="Each chart on this site with what it says today, one plain sentence on what it shows, and the query behind it. The same files feed every page."
      easyLead={EASY.chartsLead}
    >
      {GROUPS.map((g) => (
        <section key={g.id} className="ac-group" aria-labelledby={`g-${g.id}`}>
          <h2 className="ac-gtitle" id={`g-${g.id}`}><Say pro={g.name} easy={g.easy} /></h2>
          {g.id === 'reading' ? (
            <article className="glass ac-card ac-wide" id="readings">
              <div className="ac-take"><p><Say pro={headline.countLine ?? headline.verdictText} easy={home ? <Rich text={home.lead} /> : headline.verdictText} /></p></div>
              {/* One column per reading: its cell, its plain sentence and its query, so the name shows once and stays with its sentence on phones. */}
              <div className="ac-readings">
                {readings.map((r, i) => {
                  const x = ENTRIES.find((e) => e.id === r.qid?.toLowerCase()) ?? ENTRIES.filter((e) => e.group === 'reading')[i];
                  return (
                    <div key={r.name} className="ac-rcol" id={x.id}>
                      <ReadingCell {...r} />
                      <p className="ac-sentence"><Say pro={x.sentence} easy={x.easy} /></p>
                      <a className="s-query" href={`/reproduce/#${x.id}`}>Open the Query</a>
                    </div>
                  );
                })}
              </div>
              <div className="ac-links">
                <a className="s-query" href="/what-would-move/"><Say pro="What Would Move Each Reading" easy={EASY.titles.move} /></a>
                <a className="s-query" href="/"><Say pro="See It on Its Page" easy="See the Full Page" /></a>
              </div>
            </article>
          ) : (
            <div className="ac-grid">
              {ENTRIES.filter((x) => x.group === g.id).map((x) => <Card key={x.id} e={x} body={body[x.id] ?? {}} />)}
            </div>
          )}
        </section>
      ))}
    </Page>
  );
}
