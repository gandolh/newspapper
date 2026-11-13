/**
 * The mark set — the whole of how this app says what state a thing is in.
 *
 * DESIGN.md §5 fixes one mark per idea, and this file is the one place each
 * is drawn. There is no `Badge`: a coloured pill would say "held out" a second
 * way, and the world only has one (The One Mark Rule).
 *
 * | State                                | Mark                              |
 * |--------------------------------------|-----------------------------------|
 * | a state word (with its icon)           | `<Mark>`                          |
 * | published                            | `<Stamp>`                         |
 * | draft                                | `<TissueCorner>`                  |
 * | held out / disabled / won't compile  | `<HeldOut>` — or `HATCH` at control scale |
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
import { Icon, type IconName } from "./Icon";

/** Wax highlight for the selected run in the galley. Bled past the text on both sides, which is what makes it read
 * as wax rather than as a text background. Put it on ONE box per run, never on each token of a run: inline boxes
 * paint in tree order, so a token's bleed covers the last glyph of the token before it. The galley wraps the run and
 * lays it under the text (SourcePane.tsx, the wax run). */
export const WAX = "bg-wax text-wax-ink shadow-[-0.35em_0_0_var(--color-wax),0.35em_0_0_var(--color-wax)]";
/** The 135° hatch — "held out", at a scale too small for the wash. Text under it keeps its full ink: dropping the
 * opacity would take a small label below 4.5:1. */
export const HATCH = "relative after:pointer-events-none after:absolute after:inset-0 after:bg-(image:--hatch)";

export type MarkTone = "dim" | "ink" | "rubylith" | "blue";

export interface MarkProps extends HTMLAttributes<HTMLSpanElement> {
  /** The ink. Never the only signal: the word says it too. */
  tone?: MarkTone;
  /** A stroke icon before the word (a check for Compiles, a disk for Saved, an alert for an error). */
  icon?: IconName;
  children: ReactNode;
}

const TONE: Record<MarkTone, string> = {
  dim: "text-graphite-soft",
  ink: "text-graphite",
  rubylith: "text-grease",
  blue: "text-process-blue",
};

/** A state word: not a pill, no fill, no radius, no outline. An icon where there is one, then the word, a 12px
 * sentence-case Archivo label at 600. Tone is the ink, and the ink is never the only signal: every tone has its own
 * word, and the icon says it a second way. */
export function Mark({ tone = "dim", icon, children, className, ...rest }: MarkProps) {
  const cls = cn(
    "inline-flex items-center gap-[6px] font-chrome text-label leading-label font-semibold tracking-label whitespace-nowrap",
    TONE[tone],
    className,
  );
  return (
    <span className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** Published: the rubylith rubber stamp, 2px outline, rotated -7°. */
export function Stamp({ children = "Published", className, ...rest }: Partial<MarkProps>) {
  return (
    <span
      className={cn(
        "inline-flex origin-center -rotate-7 items-center border-2 border-rubylith bg-transparent px-[7px] py-[2px] font-chrome text-label leading-label font-bold tracking-label whitespace-nowrap text-grease",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/**
 * Draft: a sheet turned back over the card's top-right corner, the dog-ear. Absolutely positioned: the thing it
 * marks must be a positioned box.
 */
export function TissueCorner({ title = "Draft" }: { title?: string }) {
  return (
    <span
      className="pointer-events-none absolute top-0 right-0 size-unit bg-[linear-gradient(225deg,var(--color-board)_0_50%,var(--color-tissue-edge)_50%_100%)]"
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

const CROP_CORNER = {
  tl: "top-[-6px] left-[-6px] border-t border-l",
  tr: "top-[-6px] right-[-6px] border-t border-r",
  bl: "bottom-[-6px] left-[-6px] border-b border-l",
  br: "right-[-6px] bottom-[-6px] border-r border-b",
} as const;
const CROP_CORNER_SMALL = {
  tl: "top-[-5px] left-[-5px] border-t border-l",
  tr: "top-[-5px] right-[-5px] border-t border-r",
  bl: "bottom-[-5px] left-[-5px] border-b border-l",
  br: "right-[-5px] bottom-[-5px] border-r border-b",
} as const;

/** The render frame: 1px graphite L-ticks hanging off each corner of the artwork's box, which must be positioned.
 * `small` is the contact strip's and the post card's size. */
export function CropMarks({ small = false }: { small?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span
          key={corner}
          className={cn(
            "absolute border-graphite",
            small ? "size-[9px]" : "size-[14px]",
            (small ? CROP_CORNER_SMALL : CROP_CORNER)[corner],
          )}
        />
      ))}
    </span>
  );
}

const REGISTER_CORNER = {
  tl: "top-[6px] left-[12px]",
  tr: "top-[6px] right-[12px]",
  bl: "bottom-[12px] left-[12px]",
  br: "right-[12px] bottom-[12px]",
} as const;

/** Alignment: a crosshair-in-a-circle in each corner of the stage, which must be positioned. They go below 1280px,
 * where the stage has no room to spare. */
export function RegisterTargets() {
  return (
    <span className="pointer-events-none absolute inset-0 text-graphite-soft max-[1279px]:hidden" aria-hidden="true">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <svg
          key={corner}
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className={cn("absolute", REGISTER_CORNER[corner])}
        >
          <circle cx="12" cy="12" r="6" />
          <path d="M12 1v22M1 12h22" />
        </svg>
      ))}
    </span>
  );
}

export interface FindingProps {
  /** Where it is: a line:column, a path, a source name. */
  where?: ReactNode;
  /** The note. State the measurement, not a severity word. */
  children: ReactNode;
  /** Draw it in graphite instead of grease: a note, not a finding. */
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
          <span className="font-chrome text-label leading-label font-semibold tracking-label text-graphite-soft">
            {where}
          </span>
        )}
        <span
          className={cn("font-chrome text-hint leading-hint font-medium", muted ? "text-graphite-soft" : "text-grease")}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
