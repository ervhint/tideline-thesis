import { Page } from '@/components/Page';
import { ReproduceView } from '@/components/ReproduceView';
import { reproduceLead } from '@/lib/mock';
import { EASY } from '@/lib/easy_text';
import { ENTRIES, fileUrl } from '@/lib/reproduce_entries';
import { getAnchorPanel } from '@/lib/data';

export const revalidate = 300;

export default async function Reproduce() {
  const panel = await getAnchorPanel();
  return (
    <Page title="Check It Yourself" ask={EASY.ask.reproduce} easyLead={EASY.reproduceLead} lead={reproduceLead(process.env.EXPLORER_PANEL === 'off')}>
      <ReproduceView {...panel} />
      <div className="glass stack stack-top">
        <p className="s-title">Every Reading and Chart</p>
        {ENTRIES.map((e) => (
          <div key={e.id} id={e.id} className="q-entry">
            <p className="src-name">{e.name}</p>
            <p className="src-text">{e.sentence}</p>
            <p className="src-text">Query: {e.files.map((f, i) => <span key={f}>{i ? ', ' : ''}<a className="q-file" href={fileUrl(f)}>{f}</a></span>)}</p>
            <p className="src-text">Source: {e.source}.</p>
          </div>
        ))}
      </div>
    </Page>
  );
}
