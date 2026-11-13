/**
 * A pane divider. `useDrag` owns pointer capture and cleanup; this only turns
 * a horizontal delta into a new width and clamps it.
 */

import { useDrag } from "@use-gesture/react";
import { cn } from "../../lib/cn";

export interface SplitterProps {
  width: number;
  min: number;
  max: number;
  /** -1 when the pane being sized is to the right of the divider. */
  direction?: 1 | -1;
  label: string;
  onResize: (width: number) => void;
  /** Where the handle sits: the caller places it in the gap between two cards. */
  className?: string;
}

export function Splitter({ width, min, max, direction = 1, label, onResize, className }: SplitterProps) {
  const bind = useDrag(
    ({ movement: [dx], memo }) => {
      const start = typeof memo === "number" ? memo : width;
      onResize(Math.max(min, Math.min(max, start + dx * direction)));
      return start;
    },
    { pointer: { keys: false } },
  );

  return (
    <div
      {...bind()}
      // The gap between two cards on the board: nothing until it is hovered or focused, then a graphite rule.
      className={cn(
        "absolute inset-y-0 z-pane w-column cursor-col-resize touch-none bg-transparent p-0 before:absolute before:inset-y-card before:left-1/2 before:w-px before:bg-transparent hover:before:bg-graphite focus-visible:before:bg-graphite max-[1099px]:hidden",
        className,
      )}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 48 : 16;
        if (event.key === "ArrowLeft") onResize(Math.max(min, Math.min(max, width - step)));
        if (event.key === "ArrowRight") onResize(Math.max(min, Math.min(max, width + step)));
      }}
    />
  );
}
