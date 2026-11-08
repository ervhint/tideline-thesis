'use client';
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, type TermKey } from '@/lib/glossary';

const GAP = 8; // space between the word and its note
const EDGE = 16; // the note never comes closer than this to the screen edge

// A hard word with a dotted underline (docs/PLAN.md §6g E6). The note opens on tap, mouse hover or keyboard focus,
// and closes on Escape, a tap outside, or leaving. It is placed so it never runs off a 375 px screen.
// J9 (docs/PLAN.md §6h): the open note is drawn at the top of the page (a portal on <body>, fixed position), so a
// glass panel lower down can never paint over it; it sits under the word, or above it when there is no room below.
export function Term({ k, children }: { k: TermKey; children?: ReactNode }) {
  const g = GLOSSARY[k];
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLSpanElement>(null);
  const byHover = useRef(false);
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Place the note against the word, inside the screen; again on scroll, so it follows the word.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btn.current, n = note.current;
      if (!b || !n) return;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const width = Math.min(320, vw - 2 * EDGE);
      const r = b.getBoundingClientRect();
      n.style.width = `${width}px`;
      n.style.left = `${Math.max(EDGE, Math.min(r.left, vw - EDGE - width))}px`;
      const below = r.bottom + GAP, h = n.offsetHeight;
      n.style.top = `${below + h > vh - EDGE && r.top - GAP - h >= EDGE ? r.top - GAP - h : below}px`;
    };
    place();
    window.addEventListener('scroll', place, true);
    return () => window.removeEventListener('scroll', place, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) => !!t && (wrap.current?.contains(t as Node) || note.current?.contains(t as Node));
    const outside = (e: PointerEvent) => { if (!inside(e.target)) setOpen(false); };
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

  // Hover: leaving the word for the note keeps it open; leaving both closes it.
  const stay = () => { if (leaving.current) { clearTimeout(leaving.current); leaving.current = null; } };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !byHover.current) return;
    stay();
    leaving.current = setTimeout(() => { byHover.current = false; setOpen(false); }, 120);
  };
  useEffect(() => stay, []);

  const box = (
    <span ref={note} id={id} role="tooltip" className="term-note" hidden={!open} onPointerEnter={stay} onPointerLeave={leave}>
      <b>{g.term}</b>
      {g.text}
    </span>
  );
  return (
    <span
      className="term"
      ref={wrap}
      onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; stay(); if (!open) { byHover.current = true; setOpen(true); } }}
      onPointerLeave={leave}
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
      {open && createPortal(box, document.body)}
    </span>
  );
}
