import { Gauge } from '@/components/Gauge';
import { Glance } from '@/components/Glance';
import { Hero } from '@/components/Hero';
import { Banner } from '@/components/Banner';
import { Footnote } from '@/components/Page';
import { ReadingCell } from '@/components/ReadingCell';
import { EasyOnly, Rich, Say } from '@/components/Say';
import { getNumbers } from '@/lib/data';
import { EASY } from '@/lib/easy_text';

export const revalidate = 300; // re-read the published data every 5 minutes

export default async function Headline() {
  const { readings, figures, headline, easy } = await getNumbers();
  const e = easy.home;
  if (!figures) {
    return (
      <main className="wrap page-lift">
        <h1 className="title">How Much Fee Volume Does NEAR Need?</h1>
        <Banner tone="error" title="Numbers Did Not Load">{headline.verdictText}</Banner>
        <Footnote />
      </main>
    );
  }
  return (
    <main className="home">
      <Hero asOf={figures.asOf} multiple={figures.multiple} covered={figures.covered} today={figures.today} gapTo={figures.thresholds[0].at} gapCaption={figures.gapCaption} verdict={figures.verdict} sides={figures.sides} hold={figures.hold} />
      <div className="wrap below" id="gauge">
        <EasyOnly className="ask">{EASY.ask.home}</EasyOnly>
        <p className="lead"><Say pro={headline.countLine ?? headline.verdictText} easy={e ? <Rich text={e.lead} /> : headline.verdictText} /></p>
        {headline.countLine && <p className="hold-note"><Say pro={headline.verdictText} easy={e?.hold ? <Rich text={e.hold} /> : headline.verdictText} /></p>}
        <p className="body">
          <Say pro={<>At {figures.price} a NEAR, with all revenue spent on buybacks. {headline.privateLine}</>} easy={e ? <Rich text={e.body} /> : null} />
        </p>
        <Gauge
          today={figures.today}
          max={figures.max}
          thresholds={figures.thresholds}
          todayNote="last 30 days"
          gapCaption={figures.gapCaption}
        />
        <div className="links-row"><a className="link" href="/reproduce/#gauge">Open the Query</a></div>

        <div className="readings">
          {readings.map((r) => <ReadingCell key={r.name} {...r} />)}
        </div>
        <div className="links-row links-3">
          <a className="link" href="/reproduce/#q1">Open the Query for Each Reading</a>
          <a className="link" href="/what-would-move/">What Would Move Each Reading</a>
          <a className="link" href="/concentration/">Who Brings the Volume?</a>
        </div>
        {headline.text && (
          <section className="means" aria-labelledby="means-h">
            <h2 id="means-h" className="s-title">What This Means</h2>
            {headline.glance && (
              <Glance {...headline.glance} pro={{ flowCap: headline.glance.flowCap, scoreCap: headline.glance.scoreCap }} easy={e ? e.glance : null} />
            )}
            <details className="means-more">
              <summary>Read the Full Explanation</summary>
              <Say
                block
                pro={<>{headline.text.live.map((t) => <p key={t} className="p-body">{t}</p>)}</>}
                easy={e ? <>{e.means.map((t) => <p key={t} className="p-body"><Rich text={t} /></p>)}</> : null}
              />
            </details>
            {/* Research, not advice: outside the fold, so it shows in both modes without a click (§6g E7). */}
            <Say
              block
              pro={<>{headline.text.fixed.map((t) => <p key={t} className="p-body means-fixed">{t}</p>)}</>}
              easy={e ? <>{e.fixed.map((t) => <p key={t} className="p-body means-fixed"><Rich text={t} /></p>)}</> : null}
            />
          </section>
        )}
        <Footnote />
      </div>
    </main>
  );
}
