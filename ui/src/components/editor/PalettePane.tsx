/**
 * The component palette: three groups collapsed and Content open.
 *
 * Every item is draggable into a slot and clickable for the same result, so
 * the whole post can be assembled without a pointer gesture — and so a drag
 * that ends nowhere costs nothing. The list is `WZD_COMPONENTS` read straight
 * from the catalogue; nothing here restates what a component is or takes.
 */

import { useMemo, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { WZD_COMPONENTS, type WzdComponentSpec } from "@newspapper/core/wizard";
import { Icon } from "../ui";
import { cn } from "../../lib/cn";

/**
 * Each component renders as the thing it produces (The Showing Rule): a `Heading` is set at heading weight and
 * width, a `Stat` as a heavy wide numeral, a `Quote` in italic. Everything else is the plain chip.
 */
const SHOWINGS = {
  showHeading: "py-[2px] text-head leading-head font-extrabold wdth-head",
  showStat: "py-[2px] text-head leading-head font-extrabold wdth-title",
  showQuote: "italic",
} as const;

const SHOWING: Partial<Record<string, keyof typeof SHOWINGS>> = {
  Heading: "showHeading",
  Quote: "showQuote",
  Stat: "showStat",
};

const GROUP_LABELS: Record<string, string> = {
  structure: "Structure",
  content: "Content",
  accent: "Accents",
  generated: "Generated",
};

/** Content is open; the other three start collapsed, and each stays as the operator left it. */
const DEFAULT_OPEN: readonly string[] = ["content"];
const OPEN_KEY = "newspapper-palette-open";

function readOpen(): Set<string> {
  try {
    const stored = localStorage.getItem(OPEN_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed)) return new Set(parsed.filter((g): g is string => typeof g === "string"));
  } catch {
    // Storage blocked or damaged: the defaults apply.
  }
  return new Set(DEFAULT_OPEN);
}

export interface PalettePaneProps {
  onDragStart: (component: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  onInsert: (component: string) => void;
  /** Names that have nowhere to go given the current selection. */
  unavailable: ReadonlySet<string>;
  dragging: string | null;
  disabled: boolean;
}

function PaletteItem({
  spec,
  disabled,
  dragging,
  word,
  onDragStart,
  onDragMove,
  onDragEnd,
  onInsert,
}: {
  spec: WzdComponentSpec;
  disabled: boolean;
  dragging: boolean;
  /** A word in a collapsed group: the same working chip, set as a plain word until it is hovered. */
  word: boolean;
  onDragStart: (component: string) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  onInsert: (component: string) => void;
}) {
  const bind = useDrag(
    (state) => {
      if (disabled) return;
      if (state.tap) {
        onInsert(spec.name);
        return;
      }
      if (state.first) onDragStart(spec.name);
      if (state.active) onDragMove(state.xy[0], state.xy[1]);
      if (state.last) onDragEnd();
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  const showing = SHOWING[spec.name];

  return (
    <li>
      <button
        {...bind()}
        type="button"
        disabled={disabled}
        className={cn(
          "touch-none font-chrome text-graphite-soft",
          dragging ? "cursor-grabbing" : "cursor-grab",
          word
            ? "min-h-[28px] border-0 border-b border-transparent bg-transparent px-[4px] text-label leading-label font-semibold hover:border-b-field-edge hover:text-graphite phone:min-h-(--target) phone:px-snug"
            : [
                // A cell of the showing: a field-edge ring, and inside it the component set the way it sets.
                "min-h-[28px] border border-field-edge bg-paper px-[9px] py-[3px] text-hint leading-[18px] font-semibold text-graphite phone:min-h-(--target) phone:px-snug",
                showing && SHOWINGS[showing],
              ],
          // Nowhere to put it: the hatch and a dashed edge, the one "held out" mark.
          disabled && "cursor-not-allowed border-dashed border-graphite-tint bg-(image:--hatch) text-graphite-soft",
        )}
        title={spec.description}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) onInsert(spec.name);
          }
        }}
      >
        {spec.name}
      </button>
    </li>
  );
}

export function PalettePane({
  onDragStart,
  onDragMove,
  onDragEnd,
  onInsert,
  unavailable,
  dragging,
  disabled,
}: PalettePaneProps) {
  const groups = useMemo(() => {
    const out = new Map<string, WzdComponentSpec[]>();
    for (const spec of Object.values(WZD_COMPONENTS)) {
      // `Slide` is added with the slide controls, not dropped into one.
      if (spec.role !== "component" || spec.name === "Slide") continue;
      const list = out.get(spec.group) ?? [];
      list.push(spec);
      out.set(spec.group, list);
    }
    return [...out];
  }, []);

  const [open, setOpen] = useState<Set<string>>(readOpen);
  function toggle(group: string): void {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
      } catch {
        // The state is kept for this visit only.
      }
      return next;
    });
  }

  return (
    <section aria-label="Palette" className="bg-paper px-card pt-tight pb-[6px] shadow-waxed">
      <p className="font-chrome text-hint leading-[16px] font-medium text-graphite-soft">
        {disabled ? "Fix the markup before adding components." : "Drag into a slot, or click to add to the selection."}
      </p>
      {groups.map(([group, specs]) => {
        const expanded = open.has(group);
        const items = specs.map((spec) => (
          <PaletteItem
            key={spec.name}
            spec={spec}
            word={!expanded}
            disabled={disabled || unavailable.has(spec.name)}
            dragging={dragging === spec.name}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onInsert={onInsert}
          />
        ));
        const header = (
          <button
            type="button"
            className="flex min-h-[32px] w-full cursor-pointer items-center gap-tight border-0 bg-transparent p-0 text-left font-chrome text-label leading-label font-semibold text-graphite-soft phone:min-h-(--target)"
            aria-expanded={expanded}
            onClick={() => toggle(group)}
          >
            <Icon
              name="chevronRight"
              size={14}
              className={cn("transition-transform duration-150", expanded && "rotate-90")}
            />
            <span className="text-graphite">{GROUP_LABELS[group] ?? group}</span>
            {expanded && <span className="ml-auto tabular-nums">{specs.length}</span>}
          </button>
        );
        return (
          <div key={group} className="border-t border-hairline first:border-t-0">
            {expanded ? (
              <>
                {header}
                <ul className="flex flex-wrap gap-[6px] pb-snug">{items}</ul>
              </>
            ) : (
              <div className="flex min-h-[32px] flex-wrap items-center phone:min-h-(--target)">
                <div className="shrink-0 pr-[6px] [&>button]:w-auto">{header}</div>
                <ul className="flex flex-wrap items-center">{items}</ul>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
