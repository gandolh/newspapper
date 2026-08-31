/**
 * The mark set — the whole of how this app says what state a thing is in.
 *
 * DESIGN.md §5 fixes one mark per idea, and this file is the one place each
 * is drawn. There is no `Badge`: a coloured pill would say "held out" a second
 * way, and the world only has one (The One Mark Rule).
 *
 * | State                                | Mark                              |
 * |--------------------------------------|-----------------------------------|
 * | a state word                         | `<Mark>`                          |
 * | published                            | `<Stamp>`                         |
 * | draft                                | `<TissueCorner>`                  |
 * | held out / disabled / won't compile  | `<HeldOut>` — or `HATCH` at tray scale |
 * | selected, in the source              | `WAX` (the class, applied to a span) |
 * | render frame                         | `<CropMarks>`                     |
 * | alignment                            | `<RegisterTargets>`               |
 * | finding                              | `<Finding>` (note + leader line)  |
 *
 * Two marks are painted onto text runs and onto controls owned by other
 * stylesheets, so they are exported as class names as well; they are still
 * drawn once, in `Marks.module.css`.
 *
 * Two more are surfaces rather than overlays, and a stylesheet that paints its
 * own surface reaches for the token instead: `--shadow-waxed` for anything
 * adhered to the board, `--rubylith-wash` for a surface that masks itself.
 * Both are defined once, in `:root`. There is no third way to draw either.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Marks.module.css';

/** Wax highlight for the selected run in the galley. */
export const WAX: string = styles.wax;
/** The 45° hatch — "held out", at a scale too small for the wash. */
export const HATCH: string = styles.hatched;

export type MarkTone = 'dim' | 'ink' | 'rubylith' | 'blue';

export interface MarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** The ink. Never the only signal — the word says it too. */
  tone?: MarkTone;
  /** Drop the leading tick, for a word that already sits behind a rule. */
  bare?: boolean;
  children: ReactNode;
}

const TONE: Record<MarkTone, string> = {
  dim: '',
  ink: styles.markInk,
  rubylith: styles.markRubylith,
  blue: styles.markBlue,
};

/** A state word: 9px mono, uppercase, tracked, behind a tick. */
export function Mark({
  tone = 'dim',
  bare = false,
  children,
  className = '',
  ...rest
}: MarkProps) {
  const cls = [styles.mark, TONE[tone], bare ? styles.markBare : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/** Published: the rubylith rubber stamp, 2px outline, rotated -7°. */
export function Stamp({
  children = 'Published',
  className = '',
  ...rest
}: Partial<MarkProps>) {
  return (
    <span
      className={[styles.stamp, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Draft: a sheet of tissue turned back over the board's top-right corner.
 * Absolutely positioned — the thing it marks must be a positioned box.
 */
export function TissueCorner({ title = 'Draft' }: { title?: string }) {
  return (
    <span className={styles.tissueCorner} title={title} aria-hidden="true" />
  );
}

/**
 * Held out: the rubylith wash, laid over whatever it masks. Wrap the thing;
 * the wash is an overlay so the content under it stays legible.
 */
export function HeldOut({
  children,
  hatch = false,
  className = '',
  ...rest
}: { children: ReactNode; hatch?: boolean } & HTMLAttributes<HTMLDivElement>) {
  const cls = [hatch ? styles.hatched : styles.heldOut, className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

/** The render frame: 1px L-ticks at each corner of the artwork. */
export function CropMarks() {
  return (
    <span className={styles.cropMarks} aria-hidden="true">
      <span className={`${styles.cropTick} ${styles.cropTl}`} />
      <span className={`${styles.cropTick} ${styles.cropTr}`} />
      <span className={`${styles.cropTick} ${styles.cropBl}`} />
      <span className={`${styles.cropTick} ${styles.cropBr}`} />
    </span>
  );
}

function Target() {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M11 0v22M0 11h22" />
    </svg>
  );
}

/** Alignment: a crosshair-in-a-circle at each corner. */
export function RegisterTargets() {
  return (
    <span className={styles.registers} aria-hidden="true">
      <span className={`${styles.register} ${styles.registerTl}`}>
        <Target />
      </span>
      <span className={`${styles.register} ${styles.registerTr}`}>
        <Target />
      </span>
      <span className={`${styles.register} ${styles.registerBl}`}>
        <Target />
      </span>
      <span className={`${styles.register} ${styles.registerBr}`}>
        <Target />
      </span>
    </span>
  );
}

export interface FindingProps {
  /** Where it is — a line:column, a path, a source name. */
  where?: ReactNode;
  /** The note. State the measurement, not a severity word. */
  children: ReactNode;
  /** Draw it in graphite instead of grease — a note, not a finding. */
  muted?: boolean;
}

/**
 * A grease-pencil note on a 2px leader line tipped with an arrowhead.
 * The leader runs out to the edge of the surface the note sits on.
 */
export function Finding({ where, children, muted = false }: FindingProps) {
  return (
    <span
      className={[styles.finding, muted ? styles.findingMuted : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.leader} aria-hidden="true" />
      <span className={styles.findingBody}>
        {where && <span className={styles.findingWhere}>{where}</span>}
        <span className={styles.findingNote}>{children}</span>
      </span>
    </span>
  );
}
