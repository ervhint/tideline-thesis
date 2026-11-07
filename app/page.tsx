import { Gauge } from '@/components/Gauge';
import { Hero } from '@/components/Hero';
import { Banner } from '@/components/Banner';
import { Footnote } from '@/components/Page';
import { ReadingCell } from '@/components/ReadingCell';
import { getNumbers } from '@/lib/data';

export const revalidate = 300; // re-read the published data every 5 minutes

export default async function Headline() {
  const { readings, figures, headline } = await getNumbers();
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
      <Hero asOf={figures.asOf} multiple={figures.multiple} covered={figures.covered} today={figures.today} gapTo={figures.thresholds[0].at} gapCaption={figures.gapCaption} verdict={figures.verdict} />
      <div className="wrap below" id="gauge">
        <p className="lead">{headline.verdictText}</p>
        <p className="body">
          At {figures.price} a NEAR, with all revenue spent on buybacks. {headline.privateLine}
        </p>
        <Gauge
          today={figures.today}
          max={figures.max}
          thresholds={figures.thresholds}
          todayNote="last 30 days"
          gapCaption={figures.gapCaption}
        />
        <div className="links-row"><a className="link" href="/follow-the-fee/">Open the Query</a></div>

        <div className="readings">
          {readings.map((r) => <ReadingCell key={r.name} {...r} />)}
        </div>
        <div className="links-row links-3">
          <a className="link" href="/reproduce/">Open the Query for Each Reading</a>
          <a className="link" href="/what-would-move/">What Would Move Each Reading</a>
          <a className="link" href="/concentration/">Who Brings the Volume?</a>
        </div>
        {headline.text && (
          <section className="means" aria-labelledby="means-h">
            <h2 id="means-h" className="s-title">What This Means</h2>
            {headline.text.live.map((t) => <p key={t} className="p-body">{t}</p>)}
            {headline.text.fixed.map((t) => <p key={t} className="p-body means-fixed">{t}</p>)}
          </section>
        )}
        <Footnote />
      </div>
    </main>
  );
}
