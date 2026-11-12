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
 * components, so they are exported as class strings as well; they are still
 * drawn once, here.
 *
 * Two more are surfaces rather than overlays, and a stylesheet that paints its
 * own surface reaches for the token instead: `--shadow-waxed` for anything
 * adhered to the board, `--rubylith-wash` for a surface that masks itself.
 * Both are defined once, in `@theme` (`shadow-waxed`, `bg-rubylith-wash`). There is no third way to draw either.
 */

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Wax highlight for the selected run in the galley. Bled past the text on both sides, which is what makes it read
 * as wax rather than as a text background. Put it on ONE box per run, never on each token of a run: inline boxes
 * paint in tree order, so a token's bleed covers the last glyph of the token before it. The galley wraps the run and
 * lays it under the text (SourcePane.tsx, the wax run). */
export const WAX = "bg-wax text-wax-ink shadow-[-0.35em_0_0_var(--color-wax),0.35em_0_0_var(--color-wax)]";
/** The 45° hatch — "held out", at a scale too small for the wash. Text under it keeps its full ink: dropping the
 * opacity would take a 9px caption below 4.5:1. */
export const HATCH = "relative after:pointer-events-none after:absolute after:inset-0 after:bg-(image:--hatch)";

export type MarkTone = "dim" | "ink" | "rubylith" | "blue";

export interface MarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** The ink. Never the only signal — the word says it too. */
  tone?: MarkTone;
  /** Drop the leading tick, for a word that already sits behind a rule. */
  bare?: boolean;
  children: ReactNode;
}

const TONE: Record<MarkTone, string> = {
  dim: "",
  ink: "text-graphite before:bg-graphite",
  rubylith: "text-rubylith-ink before:bg-rubylith-ink",
  blue: "text-process-blue before:bg-process-blue",
};

/** A state word: not a pill, no fill, no radius, no outline. A tick, then the word, set in the mark face. Tone is
 * the ink, and the ink is never the only signal — every tone has its own word. 9px mono, uppercase, tracked. */
export function Mark({ tone = "dim", bare = false, children, className, ...rest }: MarkProps) {
  const cls = cn(
    "inline-flex items-center gap-hair font-galley text-mark leading-field font-bold tracking-mark whitespace-nowrap text-graphite-soft uppercase",
    "before:h-px before:w-hair before:shrink-0 before:bg-tick",
    TONE[tone],
    bare && "before:hidden",
    className,
  );
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/** Published: the rubylith rubber stamp, 2px outline, rotated -7°. */
export function Stamp({ children = "Published", className, ...rest }: Partial<MarkProps>) {
  return (
    <span
      className={cn(
        "inline-flex origin-center -rotate-7 items-center border-2 border-rubylith bg-transparent px-[7px] py-[2px] font-galley text-mark leading-field font-bold tracking-mark whitespace-nowrap text-rubylith-ink uppercase",
        className,
      )}
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
export function TissueCorner({ title = "Draft" }: { title?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-0 right-0 size-unit",
        // The underside, then the fold: two triangles.
        "before:absolute before:inset-0 before:border-t before:border-r before:border-tissue-edge before:bg-tissue before:[clip-path:polygon(100%_0,100%_100%,0_0)]",
        "after:absolute after:inset-0 after:bg-[linear-gradient(to_bottom_left,color-mix(in_srgb,var(--color-graphite)_10%,transparent)_0_50%,transparent_50%)] after:[clip-path:polygon(100%_0,100%_100%,0_0)]",
      )}
      title={title}
      aria-hidden="true"
    />
  );
}

/**
 * Held out: the rubylith wash, laid over whatever it masks. Wrap the thing;
 * the wash is an overlay so the content under it stays legible (graphite on the wash measures 8.6:1).
 * This is the ONE way the app says "held out" (DESIGN.md, The One Mark Rule). `hatch` draws the same idea at tray
 * scale.
 */
export function HeldOut({
  children,
  hatch = false,
  className,
  ...rest
}: { children: ReactNode; hatch?: boolean } & HTMLAttributes<HTMLDivElement>) {
  const cls = cn(
    hatch ? HATCH : "relative after:pointer-events-none after:absolute after:inset-0 after:bg-rubylith-wash",
    className,
  );
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

const CROP_TICK =
  "absolute size-half before:absolute before:h-px before:w-half before:bg-graphite-tint after:absolute after:h-half after:w-px after:bg-graphite-tint";
const CROP_CORNER = {
  tl: "top-0 left-0 before:top-0 before:left-0 after:top-0 after:left-0",
  tr: "top-0 right-0 before:top-0 before:right-0 after:top-0 after:right-0",
  bl: "bottom-0 left-0 before:bottom-0 before:left-0 after:bottom-0 after:left-0",
  br: "bottom-0 right-0 before:right-0 before:bottom-0 after:right-0 after:bottom-0",
} as const;

/** The render frame: 1px L-ticks at each corner of the artwork. */
export function CropMarks() {
  return (
    <span className="pointer-events-none absolute -inset-hair" aria-hidden="true">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span key={corner} className={cn(CROP_TICK, CROP_CORNER[corner])} />
      ))}
    </span>
  );
}

function Target() {
  return (
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M11 0v22M0 11h22" />
    </svg>
  );
}

const REGISTER_CORNER = {
  tl: "top-0 left-0",
  tr: "top-0 right-0",
  bl: "bottom-0 left-0",
  br: "right-0 bottom-0",
} as const;

/** Alignment: a crosshair-in-a-circle at each corner. */
export function RegisterTargets() {
  return (
    <span className="pointer-events-none absolute -inset-unit text-tick" aria-hidden="true">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span key={corner} className={cn("absolute size-[22px]", REGISTER_CORNER[corner])}>
          <Target />
        </span>
      ))}
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
    <span className="relative flex items-start gap-half py-hair">
      <span
        className={cn(
          "relative mt-[3px] h-[12px] shrink-0 grow-0 basis-unit",
          // The leader: a real 2px line out to the edge, tipped with an arrowhead.
          "before:absolute before:top-[5px] before:right-[5px] before:left-0 before:h-[2px]",
          "after:absolute after:top-px after:right-0 after:border-[5px] after:border-r-0 after:border-transparent",
          muted ? "before:bg-graphite-tint after:border-l-graphite-tint" : "before:bg-grease after:border-l-grease",
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-col gap-[2px] text-left">
        {where && (
          <span className="font-galley text-field font-medium tracking-field text-graphite-soft uppercase">
            {where}
          </span>
        )}
        <span className={cn("font-galley text-[10px] leading-[1.45]", muted ? "text-graphite-soft" : "text-grease")}>
          {children}
        </span>
      </span>
    </span>
  );
}
