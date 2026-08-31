/**
 * A pane divider. `useDrag` owns pointer capture and cleanup; this only turns
 * a horizontal delta into a new width and clamps it.
 */

import { useDrag } from '@use-gesture/react';
import styles from './Splitter.module.css';

export interface SplitterProps {
  width: number;
  min: number;
  max: number;
  /** -1 when the pane being sized is to the right of the divider. */
  direction?: 1 | -1;
  label: string;
  onResize: (width: number) => void;
}

export default function Splitter({
  width,
  min,
  max,
  direction = 1,
  label,
  onResize,
}: SplitterProps) {
  const bind = useDrag(
    ({ movement: [dx], memo }) => {
      const start = typeof memo === 'number' ? memo : width;
      onResize(Math.max(min, Math.min(max, start + dx * direction)));
      return start;
    },
    { pointer: { keys: false } },
  );

  return (
    <div
      {...bind()}
      className={styles.splitter}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 48 : 16;
        if (event.key === 'ArrowLeft') onResize(Math.max(min, Math.min(max, width - step)));
        if (event.key === 'ArrowRight') onResize(Math.max(min, Math.min(max, width + step)));
      }}
    />
  );
}
