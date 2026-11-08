import { ReactNode } from 'react';
import { EasyOnly, Rich, Say } from './Say';
import { Stale } from './Stale';

// `ask` is Easy's one-line "What this page answers" (docs/PLAN.md §6g E5); `easyLead` is the lead in Easy words, marked [[term]].
export function Page({ title, easyTitle, lead, easyLead, ask, children }: { title: string; easyTitle?: string; lead?: ReactNode; easyLead?: string; ask?: string; children?: ReactNode }) {
  return (
    <main className="wrap page-lift">
      <h1 className="title">{easyTitle ? <Say pro={title} easy={easyTitle} /> : title}</h1>
      {ask && <EasyOnly className="ask">{ask}</EasyOnly>}
      {lead
        ? <p className="lead-muted">{easyLead ? <Say pro={lead} easy={<Rich text={easyLead} />} /> : lead}</p>
        : easyLead && <EasyOnly className="lead-muted"><Rich text={easyLead} /></EasyOnly>}
      <Stale />
      {children}
      <Footnote />
    </main>
  );
}

export function Footnote() {
  return (
    <p className="footnote">Tideline is research, not financial advice.</p>
  );
}
