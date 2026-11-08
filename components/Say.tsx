import type { ReactNode } from 'react';
import { pieces } from '@/lib/glossary';
import { Term } from './Term';

// Both texts are rendered; CSS on html[data-mode] hides the other one with display:none (docs/PLAN.md §6g E3),
// so a screen reader reads only the active mode, the server and the browser render the same thing, and nothing flashes.
// `block` wraps paragraphs in a box that takes no space of its own (display: contents), so the layout is the page's.
// A side left out (null) shows nothing in that mode.
export function Say({ pro, easy, as: Tag = 'span', block = false, className }: { pro: ReactNode; easy: ReactNode; as?: 'span' | 'p' | 'div'; block?: boolean; className?: string }) {
  const T = block ? 'div' : Tag;
  const cls = (m: string) => [m, block ? 'm-wrap' : '', block ? '' : className ?? ''].filter(Boolean).join(' ');
  return (
    <>
      {pro != null && pro !== false && <T className={cls('m-pro')}>{pro}</T>}
      {easy != null && easy !== false && <T className={cls('m-easy')}>{easy}</T>}
    </>
  );
}

// Text with [[word]] or [[words|key]] marks: each mark becomes a term note.
// Punctuation right after a term stays on its line (the term's button is inline-block, so a comma could wrap on its own).
export function Rich({ text }: { text: string }) {
  const ps = pieces(text);
  const out: ReactNode[] = [];
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (!('key' in p)) { out.push(p.text); continue; }
    const next = ps[i + 1];
    const stick = next && !('key' in next) ? next.text.match(/^[,.;:!?)’”]+/)?.[0] : undefined;
    const term = <Term k={p.key}>{p.label}</Term>;
    if (stick && next && !('key' in next)) {
      out.push(<span key={i} className="nowrap">{term}{stick}</span>);
      ps[i + 1] = { text: next.text.slice(stick.length) };
    } else out.push(<span key={i}>{term}</span>);
  }
  return <>{out}</>;
}

// An Easy-only paragraph list or line.
export function EasyOnly({ children, as = 'p', className }: { children: ReactNode; as?: 'span' | 'p' | 'div'; className?: string }) {
  return <Say pro={null} easy={children} as={as} className={className} />;
}
