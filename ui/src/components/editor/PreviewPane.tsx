/**
 * The middle pane: every slide, compiled and painted from the same component
 * library and the same `resolveStyle` the Chromium renderer uses.
 *
 * It is a view of the markup and holds nothing the markup does not — the only
 * local state is the measured scale and the drop-zone geometry.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { WzdDocument } from '@newspapper/core/wizard';
import type { TNode, Theme } from '@newspapper/core/templates';
import { Badge, Button, EmptyState } from '../ui';
import SlideCanvas from './preview/SlideCanvas.js';
import type { NodeGestures } from './preview/TNodeView.js';
import { slotsForSubtree, type SlotDescriptor } from './preview/slots.js';
import { collectStyleProblems } from './preview/resolve.js';
import { sourceOffsetOf } from './preview/compileTraced.js';
import type { MeasuredZone } from './dragTypes.js';
import { elementAtPath, slidePaths, type WzdPath } from './paths.js';
import styles from './PreviewPane.module.css';

const MAX_SLIDE_PX = 560;
const MIN_SLIDE_PX = 180;
const EMPTY_SLOTS: SlotDescriptor[] = [];

function stampedOffsets(slides: readonly TNode[]): Set<number> {
  const out = new Set<number>();
  const visit = (node: TNode): void => {
    const at = sourceOffsetOf(node);
    if (at !== null) out.add(at);
    if (node.kind === 'box') (node.children ?? []).forEach(visit);
    if (node.kind === 'repeat') node.children.forEach(visit);
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

export default function PreviewPane(props: PreviewPaneProps) {
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

  const columnRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MAX_SLIDE_PX);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(MIN_SLIDE_PX, Math.min(MAX_SLIDE_PX, entry.contentRect.width - 8)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paths = useMemo(() => (doc ? slidePaths(doc) : []), [doc]);
  const rendered = useMemo(() => stampedOffsets(slides), [slides]);
  const problems = useMemo(
    () => (theme ? collectStyleProblems(slides, theme) : []),
    [slides, theme],
  );

  const selectedOffset = useMemo(() => {
    if (!doc || !selectedPath) return null;
    return elementAtPath(doc, selectedPath)?.loc.start.offset ?? null;
  }, [doc, selectedPath]);

  // Memoized as one array so each canvas gets a stable `slots` identity and
  // does not re-measure its drop zones on every render of the pane.
  const slotsPerSlide = useMemo<SlotDescriptor[][]>(
    () => (doc ? paths.map((path) => slotsForSubtree(doc, path, dragType, rendered)) : []),
    [doc, paths, dragType, rendered],
  );

  const scale = width / 1080;

  return (
    <div className={styles.pane}>
      <div className={styles.bar}>
        <span className={styles.barTitle}>Preview</span>
        {stale && <Badge variant="warning">Waiting for valid markup</Badge>}
        {problems.length > 0 && (
          <Badge variant="error">
            {problems.length} unthemed {problems.length === 1 ? 'node' : 'nodes'}
          </Badge>
        )}
        <span className={styles.barSpacer} />
        <Button variant="ghost" size="sm" onClick={() => onAddSlide(paths.length)}>
          Add slide
        </Button>
      </div>

      {themeError && (
        <p className={styles.themeError} role="alert">
          {themeError}
        </p>
      )}

      {problems.length > 0 && (
        <p className={styles.warning} role="alert">
          The theme does not define every token these slides ask for. The marked nodes render
          incompletely here, and the renderer will refuse them outright.
          <span className={styles.warningDetail}>{problems[0].problems[0]}</span>
        </p>
      )}

      <div className={styles.column} ref={columnRef}>
        {!theme && <p className={styles.hint}>Loading theme…</p>}

        {theme && slides.length === 0 && (
          <EmptyState
            title="No slides yet"
            hint="A post needs at least one Slide. Add one, then drag components into it."
            action={
              <Button size="sm" onClick={() => onAddSlide(0)}>
                Add the first slide
              </Button>
            }
          />
        )}

        {theme &&
          slides.map((slide, i) => {
            const path = paths[i];
            const key = path ? path.join('.') : `slide-${i}`;
            return (
              <section className={styles.slide} key={key}>
                <header className={styles.slideBar}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.slideLabel}
                    onClick={() => path && onSelectPath(path)}
                  >
                    Slide {i + 1}
                  </Button>
                  <span className={styles.barSpacer} />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!path || i === 0}
                    onClick={() => path && onNudgeSlide(path, -1)}
                    aria-label={`Move slide ${i + 1} earlier`}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!path || i === slides.length - 1}
                    onClick={() => path && onNudgeSlide(path, 1)}
                    aria-label={`Move slide ${i + 1} later`}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddSlide(i + 1)}
                    aria-label={`Add a slide after slide ${i + 1}`}
                  >
                    +
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!path}
                    onClick={() => path && onRemoveSlide(path)}
                    aria-label={`Delete slide ${i + 1}`}
                  >
                    ✕
                  </Button>
                </header>
                <SlideCanvas
                  slideKey={key}
                  slide={slide}
                  theme={theme}
                  scale={scale}
                  selectedOffset={selectedOffset}
                  gestures={gestures}
                  dragActive={dragType !== null}
                  activeZoneKey={activeZoneKey}
                  slots={slotsPerSlide[i] ?? EMPTY_SLOTS}
                  onZonesMeasured={onZonesMeasured}
                />
              </section>
            );
          })}
      </div>
    </div>
  );
}
