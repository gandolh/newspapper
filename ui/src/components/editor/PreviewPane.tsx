/**
 * The middle pane: every slide, compiled and painted from the same component
 * library and the same `resolveStyle` the Chromium renderer uses.
 *
 * It is a view of the markup and holds nothing the markup does not — the only
 * local state is the measured scale and the drop-zone geometry.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { WzdDocument } from "@newspapper/core/wizard";
import type { TNode, Theme } from "@newspapper/core/templates";
import { Button, CropMarks, EmptyState, Icon, Mark, RegisterTargets, type IconName } from "../ui";
import { SlideCanvas } from "./preview/SlideCanvas.js";
import type { NodeGestures } from "./preview/TNodeView.js";
import { slotsForSubtree, type SlotDescriptor } from "./preview/slots.js";
import { collectStyleProblems } from "./preview/resolve.js";
import { sourceOffsetOf } from "./preview/compileTraced.js";
import type { MeasuredZone } from "./dragTypes.js";
import { elementAtPath, slidePaths, type WzdPath } from "./paths.js";
import { cn } from "../../lib/cn";
import { compile } from "@/lib/motion";

/** The preview scales by integer factors only: a resampled preview is not one (DESIGN.md §5, The Fixed Scale
    Rule). 1080 ÷ 2, 4, 8. The working slide takes the largest factor its frame has room for; the contact strip is
    always 1:8. */
const FACTORS = [1 / 2, 1 / 4, 1 / 8] as const;
const STRIP_SCALE = 1 / 8;
/** The dimension leader above the slide and its gap: 16 + 8. The frame's own padding is outside the measured box. */
const FRAME_CHROME = 24;
const FRAME_SIDES = 48;
const EMPTY_SLOTS: SlotDescriptor[] = [];
/** A thumbnail is a picture of a slide: it takes no gesture and measures no drop zone. */
const NO_GESTURES: NodeGestures = {
  onSelect: () => undefined,
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragEnd: () => undefined,
};
const NO_ZONES = (): void => undefined;

function stampedOffsets(slides: readonly TNode[]): Set<number> {
  const out = new Set<number>();
  const visit = (node: TNode): void => {
    const at = sourceOffsetOf(node);
    if (at !== null) out.add(at);
    if (node.kind === "box") (node.children ?? []).forEach(visit);
    if (node.kind === "repeat") node.children.forEach(visit);
  };
  slides.forEach(visit);
  return out;
}

export interface PreviewPaneProps {
  /** The document the preview was compiled from — a debounce behind the source. */
  doc: WzdDocument | null;
  slides: readonly TNode[];
  theme: Theme | null;
  themeError: string | null;
  /** Set while the source does not parse, so the preview shows the last good state. */
  stale: boolean;
  selectedPath: WzdPath | null;
  onSelectPath: (path: WzdPath | null) => void;
  gestures: NodeGestures;
  dragType: string | null;
  activeZoneKey: string | null;
  onZonesMeasured: (slideKey: string, zones: MeasuredZone[]) => void;
  onAddSlide: (index: number) => void;
  onRemoveSlide: (path: WzdPath) => void;
  onNudgeSlide: (path: WzdPath, delta: -1 | 1) => void;
}

/** A finding about the theme or the slide is a grease note, not a coloured banner. */
const FINDING =
  "mx-snug mt-tight border-l-2 border-grease bg-paper py-[2px] pl-tight font-chrome text-hint leading-hint font-medium text-grease";

function startsWith(path: WzdPath, prefix: WzdPath): boolean {
  return prefix.length <= path.length && prefix.every((n, i) => path[i] === n);
}

const TOOL =
  "grid size-[34px] cursor-pointer place-items-center border-0 bg-transparent p-0 text-graphite phone:size-(--target) disabled:cursor-not-allowed disabled:text-graphite-soft disabled:bg-(image:--hatch) active:enabled:bg-board";

export function PreviewPane(props: PreviewPaneProps) {
  const {
    doc,
    slides,
    theme,
    themeError,
    stale,
    selectedPath,
    onSelectPath,
    gestures,
    dragType,
    activeZoneKey,
    onZonesMeasured,
    onAddSlide,
    onRemoveSlide,
    onNudgeSlide,
  } = props;

  const frameBoxRef = useRef<HTMLDivElement>(null);
  // The frame exists once the theme has loaded and there is a slide; the observer attaches then.
  const hasFrame = theme !== null && slides.length > 0;
  const [room, setRoom] = useState({ width: 270 + FRAME_SIDES, height: 270 + FRAME_CHROME });

  useEffect(() => {
    const el = frameBoxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setRoom({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasFrame]);

  const paths = useMemo(() => (doc ? slidePaths(doc) : []), [doc]);
  const rendered = useMemo(() => stampedOffsets(slides), [slides]);
  const problems = useMemo(() => (theme ? collectStyleProblems(slides, theme) : []), [slides, theme]);

  // The working slide is the one the selection is in; with none selected it is the one last picked on the strip.
  const [picked, setPicked] = useState(0);
  const selectedSlide = selectedPath ? paths.findIndex((p) => startsWith(selectedPath, p)) : -1;
  const current = Math.max(0, Math.min(selectedSlide >= 0 ? selectedSlide : picked, slides.length - 1));

  const selectedOffset = useMemo(() => {
    if (!doc || !selectedPath) return null;
    return elementAtPath(doc, selectedPath)?.loc.start.offset ?? null;
  }, [doc, selectedPath]);

  // Memoized as one array so the working canvas gets a stable `slots` identity and does not re-measure its drop
  // zones on every render of the pane.
  const currentPath = paths[current];
  const currentSlots = useMemo<SlotDescriptor[]>(
    () => (doc && currentPath ? slotsForSubtree(doc, currentPath, dragType, rendered) : EMPTY_SLOTS),
    [doc, currentPath, dragType, rendered],
  );

  const fit = Math.min(room.width - FRAME_SIDES, room.height - FRAME_CHROME);
  const scale = FACTORS.find((f) => 1080 * f <= fit) ?? FACTORS[FACTORS.length - 1];
  const size = 1080 * scale;

  // The compile: the marks round the working slide re-set around a slide that has just been set. The artwork
  // inside the crop marks is never animated; see `lib/motion.ts`.
  const marksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    compile(marksRef.current);
  }, [slides]);

  const tools: { icon: IconName; label: string; disabled: boolean; run: () => void }[] = [
    {
      icon: "up",
      label: `Move slide ${current + 1} earlier`,
      disabled: !currentPath || current === 0,
      run: () => currentPath && onNudgeSlide(currentPath, -1),
    },
    {
      icon: "down",
      label: `Move slide ${current + 1} later`,
      disabled: !currentPath || current === slides.length - 1,
      run: () => currentPath && onNudgeSlide(currentPath, 1),
    },
    {
      icon: "plus",
      label: `Add a slide after slide ${current + 1}`,
      disabled: false,
      run: () => onAddSlide(current + 1),
    },
    {
      icon: "close",
      label: `Delete slide ${current + 1}`,
      disabled: !currentPath,
      run: () => currentPath && onRemoveSlide(currentPath),
    },
  ];

  const working = theme && slides[current];

  return (
    <section
      aria-label="Preview"
      // The stage: the one place the blue grid prints, on the board. Posts and the Reader have no paste-up.
      className="flex h-full min-h-0 min-w-0 flex-col bg-board stage-grid shadow-waxed"
    >
      <div className="flex h-[44px] shrink-0 items-center gap-snug border-b border-hairline bg-paper pr-[10px] pl-[14px] phone:h-[48px]">
        <span className="font-chrome text-label leading-label font-semibold text-graphite">Preview</span>
        <span className="font-galley text-label leading-label text-graphite">1 : {Math.round(1 / scale)}</span>
        {stale && <Mark tone="ink">Last good set</Mark>}
        {problems.length > 0 && (
          <Mark tone="rubylith" icon="alert">
            {problems.length} unthemed {problems.length === 1 ? "node" : "nodes"}
          </Mark>
        )}
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={() => onAddSlide(paths.length)}>
          <Icon name="plus" />
          Add slide
        </Button>
      </div>

      {themeError && (
        <p className={FINDING} role="alert">
          {themeError}
        </p>
      )}

      {problems.length > 0 && (
        <p className={FINDING} role="alert">
          The theme does not define every token these slides ask for. The marked nodes render incompletely here, and the
          renderer will refuse them outright.
          <span className="mt-[2px] block text-graphite-soft">{problems[0].problems[0]}</span>
        </p>
      )}

      {!theme && (
        <p className="p-card font-chrome text-hint leading-hint font-medium text-graphite-soft">Loading theme…</p>
      )}

      {theme && slides.length === 0 && (
        <div className="flex min-h-0 flex-1 items-center justify-center p-card">
          <div className="bg-board">
            <EmptyState
              title="No slides yet"
              hint="A post needs at least one Slide. Add one, then drag components into it."
              action={
                <Button size="sm" onClick={() => onAddSlide(0)}>
                  Add the first slide
                </Button>
              }
            />
          </div>
        </div>
      )}

      {working && (
        <>
          <div className="flex shrink-0 items-center justify-between px-snug pt-snug pb-0 pl-[14px] phone:pt-[4px] phone:pr-0 phone:pl-snug">
            <span className="bg-board py-[2px] pr-tight font-chrome text-body leading-body font-bold text-graphite">
              Slide {current + 1}
            </span>
            <div
              role="group"
              aria-label={`Slide ${current + 1} tools`}
              className="flex divide-x divide-hairline border border-field-edge bg-paper"
            >
              {tools.map((tool) => (
                <button
                  key={tool.icon}
                  type="button"
                  className={TOOL}
                  disabled={tool.disabled}
                  aria-label={tool.label}
                  onClick={tool.run}
                >
                  <Icon name={tool.icon} />
                </button>
              ))}
            </div>
          </div>

          <div
            ref={frameBoxRef}
            className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-tight overflow-auto pt-[10px] pb-[22px] phone:min-h-[306px] phone:pt-[4px] phone:pb-tight"
          >
            <RegisterTargets />
            <div
              className="flex items-center gap-[10px] font-galley text-label leading-label whitespace-nowrap text-graphite before:h-px before:flex-1 before:bg-graphite-soft after:h-px after:flex-1 after:bg-graphite-soft"
              style={{ width: size }}
              aria-hidden="true"
            >
              <span className="bg-board px-[4px]">1080 × 1080</span>
            </div>
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <div className="pointer-events-none absolute inset-0" ref={marksRef}>
                <CropMarks />
              </div>
              <SlideCanvas
                slideKey={currentPath ? currentPath.join(".") : `slide-${current}`}
                slide={slides[current]}
                theme={theme}
                scale={scale}
                selectedOffset={selectedOffset}
                gestures={gestures}
                dragActive={dragType !== null}
                activeZoneKey={activeZoneKey}
                slots={currentSlots}
                onZonesMeasured={onZonesMeasured}
              />
            </div>
          </div>

          <div className="mt-snug shrink-0 bg-paper px-[6px] py-tight shadow-waxed phone:mt-tight">
            <div
              role="group"
              aria-label="All slides"
              className="flex gap-[4px] overflow-x-auto pb-[2px] max-[1279px]:gap-tight max-[1279px]:[mask-image:linear-gradient(to_right,var(--color-graphite)_calc(100%-24px),transparent)]"
            >
              {slides.map((slide, i) => {
                const path = paths[i];
                return (
                  <button
                    key={path ? path.join(".") : `thumb-${i}`}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    aria-current={i === current ? "true" : undefined}
                    className={cn(
                      "group flex shrink-0 cursor-pointer flex-col items-stretch border-2 bg-transparent p-0",
                      i === current ? "border-graphite" : "border-transparent",
                    )}
                    onClick={() => {
                      setPicked(i);
                      if (path) onSelectPath(path);
                    }}
                  >
                    <span
                      className="relative m-[6px] block shrink-0"
                      style={{ width: 1080 * STRIP_SCALE, height: 1080 * STRIP_SCALE }}
                    >
                      <SlideCanvas
                        slideKey={`thumb-${i}`}
                        slide={slide}
                        theme={theme}
                        scale={STRIP_SCALE}
                        selectedOffset={null}
                        gestures={NO_GESTURES}
                        dragActive={false}
                        activeZoneKey={null}
                        slots={EMPTY_SLOTS}
                        onZonesMeasured={NO_ZONES}
                      />
                      <CropMarks small />
                    </span>
                    <span
                      className={cn(
                        "py-[4px] text-center font-chrome text-label leading-label font-semibold tabular-nums",
                        i === current ? "bg-graphite font-bold text-board" : "text-graphite-soft",
                      )}
                    >
                      Slide {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
