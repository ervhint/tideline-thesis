'use client';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { GLOSSARY, type TermKey } from '@/lib/glossary';

// A hard word with a dotted underline (docs/PLAN.md §6g E6). The note opens on tap, mouse hover or keyboard focus,
// and closes on Escape, a tap outside, or leaving. It is placed so it never runs off a 375 px screen.
export function Term({ k, children }: { k: TermKey; children?: ReactNode }) {
  const g = GLOSSARY[k];
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLSpanElement>(null);
  const byHover = useRef(false);

  useEffect(() => {
    if (!open) return;
    const w = wrap.current, n = note.current;
    if (w && n) {
      const vw = document.documentElement.clientWidth;
      const width = Math.min(320, vw - 32);
      const r = w.getBoundingClientRect();
      n.style.width = `${width}px`;
      n.style.left = `${Math.max(16, Math.min(r.left, vw - 16 - width)) - r.left}px`;
    }
    const outside = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btn.current?.focus();
    };
    const shut = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', shut);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', shut);
    };
  }, [open]);

  return (
    <span
      className="term"
      ref={wrap}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !open) { byHover.current = true; setOpen(true); } }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse' && byHover.current) { byHover.current = false; setOpen(false); } }}
    >
      <button
        ref={btn}
        type="button"
        className="term-btn"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          // A click after a hover keeps the note open; otherwise it toggles.
          if (byHover.current) byHover.current = false;
          else setOpen((o) => !o);
        }}
        onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setOpen(true); }}
        onBlur={() => { if (!byHover.current) setOpen(false); }}
      >
        {children ?? g.term}
      </button>
      <span ref={note} id={id} role="tooltip" className="term-note" hidden={!open}>
        <b>{g.term}</b>
        {g.text}
      </span>
    </span>
  );
}
