'use client';
import { useCallback, useEffect, useState } from 'react';
import { Banner } from './Banner';
import { ExtLink } from './ExtLink';

// J20: a ready terminal in the reader's own GitHub Codespace (settings in .devcontainer/devcontainer.json).
const CODESPACES = 'https://codespaces.new/ervhint/tideline-thesis?quickstart=1';
import type { AnchorPanel } from '@/lib/attest_view';
import type { AnchorState, Command } from '@/lib/mock';

const DOT = { none: '/assets/dot-not-measured.svg', anchored: '/assets/dot-bullish.svg', mismatch: '/assets/dot-bearish.svg' };
const COLOR = { none: 'var(--text-muted)', anchored: 'var(--bullish)', mismatch: 'var(--bearish)' };
type Example = { tag: string; text: string; archive: string; chain: string };

// The proof card (docs/PLAN.md §6h J16, J24). The page is static and fast; the card asks our own /api/anchor, which
// caches a good check for 5 minutes and never caches a failure, so a testnet hiccup cannot stick in a built page.
// `?state=anchored`, `?state=mismatch` and `?state=error` preview the designed states with example values.
const FAILED: AnchorPanel = { state: 'failed', tag: '', text: '' };
export function AnchorCard({ anchorStates }: { anchorStates: Record<AnchorState, Example> }) {
  const [preview, setPreview] = useState<AnchorState | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [current, setCurrent] = useState<AnchorPanel | null>(null);
  const load = useCallback(async () => {
    setCurrent(null);
    try {
      const r = await fetch('/api/anchor/', { cache: 'no-store' });
      setCurrent(r.ok ? ((await r.json()) as AnchorPanel) : FAILED);
    } catch {
      setCurrent(FAILED);
    }
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('state');
    if (q === 'anchored' || q === 'mismatch') setPreview(q);
    if (q === 'error') setPreviewFailed(true);
    load();
  }, [load]);

  if (!current && !previewFailed && !preview) return <AnchorLoading />;
  if (previewFailed || current?.state === 'failed') {
    // Try Again asks /api/anchor again; the rest of the page stays as it is (J17, J24).
    const retry = () => {
      setPreviewFailed(false);
      load();
    };
    return (
      <div className="anchor">
        <Banner tone="error" title="NEAR Testnet Did Not Answer">
          NEAR testnet did not answer, so the anchored status is not shown. The verify command still works without it.
        </Banner>
        <button type="button" className="btn btn-2" onClick={retry}>
          <span>Try Again</span>
          <span className="knob"><img src="/assets/chevron-dark.svg" alt="" width={14} height={14} /></span>
        </button>
      </div>
    );
  }
  const a = preview ? { ...anchorStates[preview], day: '2026-11-10', contractUrl: 'https://testnet.nearblocks.io' } : current!;
  const state = (preview ?? current!.state) as keyof typeof DOT;
  return (
    <div className="glass anchor">
      <p className="a-title">Daily Hash on NEAR Testnet</p>
      <div className="tag" style={{ color: COLOR[state] }}>
        <img src={DOT[state]} alt="" width={9} height={9} />
        <span>{a.tag}</span>
      </div>
      <p className="a-text">{a.text}</p>
      {state === 'none' ? (
        <>
          <div className="legend" style={{ color: COLOR.anchored }}>
            <img src={DOT.anchored} alt="" width={9} height={9} /><span>Anchored: shown here when it applies</span>
          </div>
          <div className="legend" style={{ color: COLOR.mismatch }}>
            <img src={DOT.mismatch} alt="" width={9} height={9} /><span>Mismatch: shown here when it applies</span>
          </div>
        </>
      ) : (
        <>
          <p className="hash">Archive hash   {a.archive}</p>
          <p className="hash">On-chain hash  {a.chain}</p>
          <ExtLink className="a-link" href={a.contractUrl ?? 'https://testnet.nearblocks.io'}>Open the Contract on NEAR Testnet</ExtLink>
          {state === 'mismatch' && (
            <>
              <p className="hash">Next step: npm run attest:check {a.day}</p>
              <ExtLink className="a-link" href="https://github.com/ervhint/tideline-thesis/issues">Report It on GitHub</ExtLink>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Shown while the proof card is still checking.
export function AnchorLoading() {
  return (
    <div className="glass anchor" aria-busy="true">
      <p className="a-title">Daily Hash on NEAR Testnet</p>
      <div className="tag" style={{ color: COLOR.none }}>
        <img src={DOT.none} alt="" width={9} height={9} />
        <span>Checking every saved day against NEAR testnet…</span>
      </div>
    </div>
  );
}

// A command in a small terminal frame, with a copy icon in its header (the pattern install guides use).
function CodeFrame({ cmd, onCopied }: { cmd: string; onCopied: (t: string) => void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div className="frame">
      <div className="frame-head">
        <span>Terminal</span>
        <button
          type="button"
          className="frame-copy"
          aria-label={`Copy ${cmd}`}
          onClick={() => { navigator.clipboard?.writeText(cmd).catch(() => {}); setDone(true); onCopied(cmd); }}
        >
          {done ? (
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.8" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 3.2V3A1.5 1.5 0 0 0 9 1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10h.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          )}
        </button>
      </div>
      <code>{cmd}</code>
    </div>
  );
}

// The three steps anyone can run, then the extras. `day` is the newest frozen day, so step 3 runs as it stands.
export function Steps({ commands, day }: { commands: Command[]; day: string | null }) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  const steps = commands.filter((c) => c.group === 'step');
  const extras = commands.filter((c) => c.group === 'extra');
  return (
    <>
      <section className="glass steps" aria-label="Check it yourself in three steps">
        <p className="s-title">Check It Yourself in Three Steps</p>
        <div className="cs-row">
          <div>
            <p className="s-name">No install? Use a ready terminal</p>
            <p className="s-text">A terminal in your browser with everything installed, running free on your own GitHub account. Then skip step 1.</p>
          </div>
          <ExtLink className="btn btn-2 cs-btn" href={CODESPACES}>
            <span>Open in Codespaces</span>
            <span className="knob"><img src="/assets/chevron-dark.svg" alt="" width={14} height={14} /></span>
          </ExtLink>
        </div>
        <ol>
          {steps.map((c, i) => {
            const cmd = c.cmd.includes('<day>') && day ? c.cmd.replace('<day>', day) : c.cmd;
            return (
              <li className="step" key={c.cmd}>
                <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
                <div className="step-words">
                  <p className="s-name">{c.title}</p>
                  <p className="s-text">{c.text}</p>
                  {c.example && <p className="step-see">{c.example}</p>}
                </div>
                <CodeFrame cmd={cmd} onCopied={setToast} />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="glass steps more" aria-label="Going further">
        <p className="s-title">Going Further</p>
        <ul>
          {extras.map((c) => (
            <li className="step" key={c.cmd}>
              <span className="step-n step-dot" aria-hidden="true" />
              <div className="step-words">
                <p className="s-name">{c.title}</p>
                <p className="s-text">{c.text} <span className="more-need">Needs: {c.need}.</span></p>
              </div>
              <CodeFrame cmd={c.cmd} onCopied={setToast} />
            </li>
          ))}
        </ul>
      </section>
      {toast && <div className="toast" role="status">On Your Clipboard: {toast}</div>}
    </>
  );
}
