// react-dom ships no types here and no package is added for one function (docs/PLAN.md §6h J9).
// Only createPortal is used, by components/Term.tsx.
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment, key?: string | null): ReactPortal;
}
