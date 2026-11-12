import { Page } from '@/components/Page';
import { AnchorCard, Steps } from '@/components/ReproduceView';
import { anchorStates, commandsFor, reproduceLead } from '@/lib/mock';
import { EASY, QUESTIONS } from '@/lib/easy_text';
import { Say } from '@/components/Say';
import { ExtLink } from '@/components/ExtLink';
import { ENTRIES, GROUPS, fileUrl } from '@/lib/reproduce_entries';
import { getLatestChainDay } from '@/lib/data';

export const revalidate = 300;

// J7: Easy names the five readings by their questions, like every other page.
const EASY_NAMES: Record<string, string> = { q1: QUESTIONS.Q1, q2: QUESTIONS.Q2, q3: QUESTIONS.Q3, q4: QUESTIONS.Q4, q5: QUESTIONS.Q5, concentration: `${EASY.titles.concentration} (Concentration)`, ...Object.fromEntries(ENTRIES.filter((e) => e.easyName).map((e) => [e.id, e.easyName!])) };

export default async function Reproduce() {
  const off = process.env.EXPLORER_PANEL === 'off';
  const day = await getLatestChainDay();
  return (
    <Page title="Check It Yourself" ask={EASY.ask.reproduce} easyLead={EASY.reproduceLead} lead={reproduceLead(off)}>
      <div className="repro">
        <AnchorCard anchorStates={anchorStates} />
        <Steps commands={commandsFor(off)} day={day} />
      </div>
      <div className="glass stack stack-top">
        <p className="s-title"><Say pro="Every Reading and Chart" easy="Where Each Number Comes From" /></p>
        {/* T6l (docs/PLAN.md §6j L9): the same list, drawn as charts. */}
        <a className="s-query" href="/charts/">See Every Chart in One Place</a>
        {/* J18: grouped; Easy gives each a plain sentence and keeps the files in a fold; Pro shows them all. */}
        {GROUPS.map((g) => (
          <section key={g.id} className="q-group">
            <p className="q-group-name"><Say pro={g.name} easy={g.easy} /></p>
            {ENTRIES.filter((e) => e.group === g.id).map((e) => {
              const files = (
                <>
                  <p className="src-text">Query: {e.files.map((f, i) => <span key={f}>{i ? ', ' : ''}<ExtLink className="q-file" href={fileUrl(f)}>{f}</ExtLink></span>)}</p>
                  <p className="src-text">Source: {e.source}.</p>
                </>
              );
              return (
                <div key={e.id} id={e.id} className="q-entry">
                  <p className="src-name">{EASY_NAMES[e.id] ? <Say pro={e.name} easy={EASY_NAMES[e.id]} /> : e.name}</p>
                  <p className="src-text"><Say pro={e.sentence} easy={e.easy} /></p>
                  <Say block pro={files} easy={<details className="means-more q-fold"><summary>Show the Files</summary>{files}</details>} />
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </Page>
  );
}
