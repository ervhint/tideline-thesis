import { Page } from '@/components/Page';
import { PanelSlot } from '@/components/PanelNote';
import { Table } from '@/components/Table';
import { Rich, Say } from '@/components/Say';
import { getConcentration } from '@/lib/data';
import { EASY } from '@/lib/easy_text';

export const revalidate = 300; // re-read the published data every 5 minutes

export default async function Concentration() {
  const c = await getConcentration();
  return (
    <Page title="Who Brings the Volume?" easyTitle={EASY.titles.concentration} ask={EASY.ask.concentration} easyLead={EASY.concentrationLead} lead={`Share from the largest integrator and the largest solvers, by swap size. ${c.solverDays ? "Both are read from our data." : "The integrator column is read from our data; the solver columns are not measured yet."}`}>
      <div className="conc">
        <div className="glass stack">
          <p className="s-title">Concentration by Swap Size</p>
          <Table
            head={['Swap Size', 'Largest Integrator', 'Top-3 Solver Share', 'HHI']}
            easyHead={['Swap Size', 'Biggest App', 'Top 3 Traders', 'HHI']}
            widths={[200, 190, 190, 150]}
            rows={c.rows}
          />
          <p className="s-text"><Say pro={<>Largest Integrator is its share of the app fees paid on fee-tagged (token_diff) swaps, {c.window ?? "window not available"}. {c.solverDays ? `Solver columns: every public swap of the last ${c.solverDays.length} frozen days (${c.solverDays[0]} to ${c.solverDays.at(-1)}), USD per solver account read from each swap's NEAR transaction.` : 'The solver columns appear once solver data is read from the frozen days.'} HHI is the sum of squared shares: 10,000 means one solver has everything.</>} easy={<Rich text={`${EASY.concentrationKey} App fees: ${c.window ?? 'window not available'}.${c.solverDays ? ` Traders: every public swap of the last ${c.solverDays.length} [[frozen days|frozenday]], ${c.solverDays[0]} to ${c.solverDays.at(-1)}.` : ' The trader columns appear once that data is read.'}`} />} /></p>
          {c.integratorNote && <p className="s-text"><Say pro={c.integratorNote} easy={<Rich text={c.easyIntegratorNote ?? c.integratorNote} />} /></p>}
          {c.solverNote && <p className="s-text"><Say pro={c.solverNote} easy={<Rich text={c.easySolverNote ?? c.solverNote} />} /></p>}
          <PanelSlot pick={['frontendText']} />
          <a className="s-query" href="/reproduce/#concentration">Open the Query</a>
        </div>
        <div className="numcard">
          <div className="share" role="img" aria-label="77% reported, not confirmed by our data">
            <p className="abs strong" style={{ top: 0 }}>77% Reported</p>
            <p className="abs small" style={{ top: 26 }}>Not confirmed by our data</p>
            <span className="abs trk" />
            <span className="abs dash" style={{ width: '77%' }} />
            {[[0, '0%'], [50, '50%'], [100, '100%']].map(([at, t]) => (
              <span key={t}>
                <span className="abs st" style={{ left: `calc(${at}% - ${at === 100 ? 1 : 0}px)` }} />
                <span className="abs small sl" style={{ left: `${at}%`, transform: `translateX(-${at}%)` }}>{t}</span>
              </span>
            ))}
          </div>
          <p className="n-text"><Say pro={<>Largest Integrator, All Sizes. A public source reports this figure. {c.ours ? `Our data reads: ${c.ours}. The public figure may measure something else, so the two need not match.` : "Our data is not available."}</>} easy={`Biggest App, All Sizes. ${EASY.reported} ${c.ours ? `Our data reads: ${c.ours}.` : 'Our data is not available.'}`} /></p>
          <a className="n-link" href="/reproduce/#concentration">Open the Query</a>
        </div>
      </div>
    </Page>
  );
}
