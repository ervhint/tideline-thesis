'use client';
import { useEffect, useId, useState } from 'react';
import { MODE_KEY } from '@/lib/mode';

type Mode = 'easy' | 'pro';
const SYNC = 'tideline-mode'; // keeps the header switch and the floating one in step

// Easy | Pro (docs/PLAN.md §6g E1, E2). Pro is the default. The choice lives on <html data-mode> and in localStorage;
// if storage fails the switch still works for the visit. The pressed look follows html[data-mode] in CSS, so it is right
// before this script runs; aria-pressed catches up once it has.
export function ModeSwitch() {
  const [mode, setMode] = useState<Mode>('pro');
  const hint = useId();
  useEffect(() => {
    const read = () => setMode(document.documentElement.dataset.mode === 'easy' ? 'easy' : 'pro');
    read();
    window.addEventListener(SYNC, read);
    // A share link (?mode=easy or ?mode=pro) has already set the choice before paint; take it out of the address bar.
    const url = new URL(window.location.href);
    if (url.searchParams.has('mode')) {
      url.searchParams.delete('mode');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return () => window.removeEventListener(SYNC, read);
  }, []);
  const pick = (m: Mode) => {
    document.documentElement.dataset.mode = m;
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {
      // Storage blocked: the choice holds for this visit only.
    }
    window.dispatchEvent(new Event(SYNC));
  };
  return (
    <div className="mode-sw" role="group" aria-label="Reading Mode" aria-describedby={hint} title="Same numbers in both: Easy uses everyday words, Pro has the full detail">
      <button type="button" data-v="easy" aria-pressed={mode === 'easy'} onClick={() => pick('easy')}>Easy</button>
      <button type="button" data-v="pro" aria-pressed={mode === 'pro'} onClick={() => pick('pro')}>Pro</button>
      <span id={hint} hidden>Same pages and numbers in both modes. Easy uses everyday words; Pro has the full detail.</span>
    </div>
  );
}

// The floating copy (docs/PLAN.md §6h J4): bottom right, shown only while the header is out of view, so the reader can
// switch without scrolling back up. Hidden with visibility, so it leaves the tab order and the screen reader while away.
export function ModeFloat() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const head = document.querySelector('.site-head');
    if (!head || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting));
    io.observe(head);
    return () => io.disconnect();
  }, []);
  return (
    <div className="mode-float" data-show={show ? '' : undefined}>
      <ModeSwitch />
    </div>
  );
}
