import type { ReactNode } from 'react';

// A link that leaves Tideline (docs/PLAN.md §6h J19): it opens in a new tab, says so to screen readers, and carries
// a small ↗ mark. Links inside the site stay in the same tab.
export function ExtLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={['ext', className].filter(Boolean).join(' ')} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
