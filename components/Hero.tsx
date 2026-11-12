import type { CSSProperties } from 'react';
import { bn } from '@/lib/mock';
import { EASY } from '@/lib/easy_text';
import { Say } from './Say';
import { Stale } from './Stale';

// S1's first screen, measured from DESIGN-REFERENCE-3.md: every position is the reference's --x, --y and --sx.
const at = (x: number, y: number, sx?: number) => ({ '--x': x, '--y': y, ...(sx ? { '--sx': sx } : {}) }) as CSSProperties;
const METER_MAX = 30e9;
// Same colours as the reading dots; Undecided matches Neutral.
const VERDICT_COLOR: Record<string, string> = { Bullish: 'var(--bullish)', Bearish: 'var(--bearish)', Undecided: 'var(--neutral)' };
// While the verdict is on hold the card counts the readings that answer, one dot per reading in its side's shape (ReadingCell).
const SIDE_DOT: Record<string, string> = { Bullish: '/assets/dot-bullish.svg', Neutral: '/assets/dot-neutral.svg', Bearish: '/assets/dot-bearish.svg', 'Not Measured': '/assets/dot-not-measured.svg' };
const Chevron = () => (
  <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m6.6 3.6 6 5.4-6 5.4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

type Props = { asOf: string; multiple: string; covered: boolean; today: number; gapTo: number; gapCaption: string; verdict: string; sides?: string[]; hold?: string | null };

const H = EASY.hero;

// The hero's headline words, shared with All Charts (docs/PLAN.md §6j L4): two lines and the tag, Pro and Easy.
export function heroLines(multiple: string, covered: boolean) {
  return {
    pro: [covered ? 'Volume Already Covers' : 'Volume Must Reach', covered ? '1.6% Issuance' : `${multiple} Today`, covered ? "at today's fees and NEAR price." : 'before buybacks cover 1.6% issuance.'],
    easy: [covered ? H.coveredLine1 : H.line1, covered ? H.coveredLine2 : `${H.before} ${multiple} ${H.after}`, covered ? H.coveredTag : H.tag],
  };
}

export function Hero({ asOf, multiple, covered, today, gapTo, gapCaption, verdict, sides = [], hold = null }: Props) {
  const L = heroLines(multiple, covered);
  return (
    <section className="card" aria-label="Headline">
      <div className="hx-stack">
        <Stale />
        <div className="hero-blk">
          <p className="eyebrow l c sx" style={at(65.7, -209.2, 0.9293)}>{`Data as of ${asOf}`}</p>
          <h1 className="hx-h1 l c num" style={at(62.6, -167.3)}>
            {/* Easy swaps the words, never the numbers (§6g E12). */}
            <span className="sx" style={{ '--sx': 0.9431 } as CSSProperties}><Say pro={L.pro[0]} easy={L.easy[0]} /></span><br />
            <span className="sx" style={{ '--sx': 0.9792 } as CSSProperties}><Say pro={L.pro[1]} easy={L.easy[1]} /></span>
          </h1>
          <div className="tagrow">
            <a className="play l c" style={at(66, 34)} href="#gauge" aria-label="Go to the gauge">
              <svg viewBox="0 0 13 14" fill="none" aria-hidden="true"><path d="M1.4 1.3 11.6 7 1.4 12.7z" fill="#0b1526" /></svg>
            </a>
            <span className="hx-tag l c sx" style={at(131, 48.7, 0.8973)}><Say pro={L.pro[2]} easy={L.easy[2]} /></span>
          </div>
          <aside className={`hx-panel l c r${hold ? ' on-hold' : ''}`} style={at(58, -165)}>
            {hold ? (
              <span className="p-head sx" style={{ '--sx': 0.8707 } as CSSProperties}>
                <span className="p-title">{`${sides.filter((s) => s !== 'Not Measured').length} of ${sides.length} Answered`}</span>
              </span>
            ) : (
              <span className="p-head sx" style={{ '--sx': 0.8707 } as CSSProperties}>
                <span className="p-title">{verdict}</span>
                <span className="dot" style={{ background: VERDICT_COLOR[verdict] ?? 'var(--neutral)' }} />
              </span>
            )}
            <span className="ring"><img src="/assets/mark.svg" alt="" width={30} height={30} /></span>
            <p className="p-sub sx" style={{ '--sx': 0.8899 } as CSSProperties}><Say pro="Volume Today Per Month" easy="Swapped Today, Per Month" /></p>
            <div className="hx-scale num"><span>$0</span><span>$10B</span><span>$20B</span><span>$30B</span></div>
            <div className="hx-track" role="img" aria-label={`Today ${bn(today, 2)} on a scale to ${bn(METER_MAX, 0)}`}>
              <i style={{ width: `${Math.min(100, (today / METER_MAX) * 100)}%` }} />
            </div>
            {hold && (
              <p className="p-hold">
                <span className="p-dots" role="img" aria-label={sides.join(', ')}>
                  {sides.map((s, i) => <img key={i} src={SIDE_DOT[s] ?? SIDE_DOT['Not Measured']} alt="" width={9} height={9} />)}
                </span>
                <span>{hold}</span>
              </p>
            )}
          </aside>
        </div>
        <div className="hx-row">
          <div className="stats">
            <div className="stat">
              <span className="hx-num l b sx" style={at(64, 60.4, 1)}>{bn(today)}</span>
              <span className="hx-lbl l b sx" style={at(358, 73.2, 0.9634)}><Say pro={<>Volume<br />Last<br />30 Days</>} easy={<>{H.today[0]}<br />{H.today[1]}<br />{H.today[2]}</>} /></span>
            </div>
            <span className="slash l b" style={at(470, 76)} />
            <div className="stat">
              <span className="hx-num l b sx" style={at(520, 60.4, 0.9858)}>{bn(Math.max(0, gapTo - today))}</span>
              <span className="hx-lbl l b sx hx-lbl2" style={at(810, 73.2, 0.9209)}><Say pro={gapCaption} easy={H.gap} /></span>
            </div>
          </div>
          <a className="meet l b r" style={at(59, 66)} href="/model/">
            <span className="thumb"><img alt="" style={{ objectPosition: '60% 50%' }} src="/media/sphere-poster.png" /></span>
            <b>Open Model</b>
            <span className="hx-knob"><Chevron /></span>
          </a>
        </div>
      </div>
    </section>
  );
}
