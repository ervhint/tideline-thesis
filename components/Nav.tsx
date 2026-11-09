'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ModeFloat, ModeSwitch } from './ModeSwitch';
import { REPO, TELEGRAM } from '@/lib/links';

const before = [
  ['/follow-the-fee/', 'Follow the Fee'],
  ['/elasticity/', 'Elasticity'],
  ['/model/', 'Model'],
] as const;
const after = [
  ['/reproduce/', 'Reproduce'],
  ['/method/', 'Method'],
] as const;

// S6 and S7 sit under Method.
const methodPaths = ['/method/', '/concentration/', '/what-would-move/'];


const Plane = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21.2 3.6 2.9 10.7c-.8.3-.8 1.4 0 1.7l4.6 1.6 1.7 5.4c.2.7 1.1.9 1.6.3l2.5-2.7 4.6 3.4c.6.4 1.4.1 1.6-.6l3.1-14.6c.2-.9-.6-1.6-1.4-1.3Z" stroke="#202940" strokeWidth="1.6" strokeLinejoin="round" /><path d="m7.5 14 9.6-6.4-6.8 7.7" stroke="#202940" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const Chevron =() => (
  <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m6.6 3.6 6 5.4-6 5.4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        button.current?.focus();
      }
    };
    const wide = matchMedia('(min-aspect-ratio: 1/1)');
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', close);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', close);
    };
  }, [open]);

  const item = ([href, name]: readonly [string, string]) => (
    <Link key={href} href={href} className="nv-text" aria-current={(href === '/method/' ? methodPaths.includes(path) : path === href) ? 'page' : undefined} onClick={() => setOpen(false)}>{name}</Link>
  );
  return (
    <header className="site-head">
      <Link href="/" className="brand" aria-label="Tideline, home" onClick={() => setOpen(false)}>
        <img className="mark" src="/assets/mark.svg" alt="" width={24} height={24} />
        <b className="sx" style={{ '--sx': 0.894 } as React.CSSProperties}>Tideline</b>
      </Link>
      <button ref={button} className="burger" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
        <i /><i />
      </button>
      <div ref={menu} className="menu" id="site-menu" data-open={open ? '' : undefined}>
        <nav className="nav" aria-label="Main">
          <Link href="/" className="n-icon" aria-label="Headline" aria-current={path === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>
            <svg viewBox="0 0 20 21" fill="none" aria-hidden="true"><path d="M2 8.4 10 2l8 6.4V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="#202940" strokeWidth="1.7" strokeLinejoin="round" /></svg>
          </Link>
          {before.map(item)}
          <hr className="n-div" />
          <svg className="n-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {[[1, 1], [11.6, 1], [1, 11.6], [11.6, 11.6]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="7.4" height="7.4" rx="1.7" stroke="#202940" strokeWidth="1.7" />)}
          </svg>
          {after.map(item)}
          <hr className="n-div mode-div" />
          <ModeSwitch />
        </nav>
        {path === '/' && (
          <a className="meet hd-meet" href="/model/" onClick={() => setOpen(false)}>
            <span className="thumb"><img alt="" style={{ objectPosition: '60% 50%' }} src="/media/sphere-poster.png" /></span>
            <b>Open Model</b>
            <span className="hx-knob"><Chevron /></span>
          </a>
        )}
        {/* Phone menu only: the wide bar has no room (measured 9 Nov 2026); Home and the footer carry the link there. */}
        <a className="tg" href={TELEGRAM} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
          <span className="tg-icon"><Plane /></span>
          <span className="tg-text">Follow Us on Telegram</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a className="cta" href={REPO} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
          <span className="cta-text">GitHub Repo</span>
          <span className="hx-knob"><Chevron /></span>
        </a>
      </div>
      <ModeFloat />
    </header>
  );
}
