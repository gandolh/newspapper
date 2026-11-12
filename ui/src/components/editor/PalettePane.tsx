/**
 * The specimen showing — the component palette.
 *
 * Every item is draggable into a slot and clickable for the same result, so
 * the whole post can be assembled without a pointer gesture — and so a drag
 * that ends nowhere costs nothing. The list is `WZD_COMPONENTS` read straight
 * from the catalogue; nothing here restates what a component is or takes.
 */

import { useMemo } from "react";
import { useDrag } from "@use-gesture/react";
import { WZD_COMPONENTS, type WzdComponentSpec } from "@newspapper/core/wizard";
import { Button, HATCH } from "../ui";
import { cn } from "../../lib/cn";

/**
 * Each component renders as the thing it produces (The Showing Rule): a
 * `Heading` is set at heading weight, a `Kicker` in tracked mono caps, a
 * `Quote` in italic, a `Stat` as a heavy numeral. Structure has no type of
 * its own, so it shows its shape instead.
 */
const SHOWINGS = {
  showHeading: "text-[17px] font-extrabold wdth-title tracking-[-0.02em]",
  showText: "text-[12px] font-normal",
  showList: "text-[12px] font-normal before:text-graphite-soft before:content-['—_']",
  showQuote: "text-[13px] font-medium italic",
  showStat: "text-[20px] font-black tracking-[-0.03em]",
  showKicker: "font-galley text-field font-bold tracking-field uppercase",
  showSource: "font-galley text-field font-medium tracking-field text-graphite-soft uppercase",
  showCounter: "font-galley text-[11px] font-medium tabular-nums",
  // Structure produces a shape, not a run of type, so it shows one.
  showSchematic: "font-galley text-[10px] font-medium tracking-[0.08em] text-graphite-soft uppercase",
} as const;

const DEFAULT_SHOWING = "showText" as const;

const SHOWING: Record<string, keyof typeof SHOWINGS> = {
  Heading: "showHeading",
  Text: "showText",
  List: "showList",
  Item: "showList",
  Quote: "showQuote",
  Stat: "showStat",
  Kicker: "showKicker",
  Source: "showSource",
  PageCounter: "showCounter",
  Image: "showSchematic",
  Stack: "showSchematic",
  Row: "showSchematic",
  Divider: "showSchematic",
  Spacer: "showSchematic",
};

const GROUP_LABELS: Record<string, string> = {
  structure: "Structure",
  content: "Content",
  accent: "Accents",
  generated: "Generated",
};

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
  onDragStart,
  onDragMove,
  onDragEnd,
  onInsert,
}: {
  spec: WzdComponentSpec;
  disabled: boolean;
  dragging: boolean;
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

  return (
    <li>
      <Button
        {...bind()}
        variant="secondary"
        size="sm"
        disabled={disabled}
        className={cn(
          // Every compartment is a cell of the showing: a tick border, and inside it the component set the way it
          // sets (DESIGN.md section 3, The Showing Rule).
          "h-auto min-h-unit touch-none px-hair py-[4px]",
          dragging ? "cursor-grabbing" : "cursor-grab",
          SHOWINGS[SHOWING[spec.name] ?? DEFAULT_SHOWING],
          // Nowhere to put it: the same rubylith idea the rest of the app uses for "held out", drawn as the 45°
          // hatch at this scale. The ink is unchanged: dimming a 9px caption would take it under 4.5:1.
          disabled && ["border-tick text-graphite-soft", HATCH],
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
      </Button>
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

  return (
    <div className="flex flex-col gap-half bg-paper p-half shadow-waxed">
      <p className="font-galley text-[10px] leading-[1.45] text-graphite-soft">
        {disabled ? "Fix the markup before adding components." : "Drag into a slot, or click to add to the selection."}
      </p>
      {groups.map(([group, specs]) => (
        <section key={group} className="flex flex-col gap-[4px]">
          <h3 className="border-b border-rule pb-[2px] font-galley text-field font-medium tracking-field text-graphite-soft uppercase">
            {GROUP_LABELS[group] ?? group}
          </h3>
          <ul className="flex flex-wrap gap-[4px]">
            {specs.map((spec) => (
              <PaletteItem
                key={spec.name}
                spec={spec}
                disabled={disabled || unavailable.has(spec.name)}
                dragging={dragging === spec.name}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onInsert={onInsert}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
