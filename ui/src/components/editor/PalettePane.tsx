/**
 * The component palette.
 *
 * Every item is draggable into a slot and clickable for the same result, so
 * the whole post can be assembled without a pointer gesture — and so a drag
 * that ends nowhere costs nothing. The list is `WZD_COMPONENTS` read straight
 * from the catalogue; nothing here restates what a component is or takes.
 */

import { useMemo } from 'react';
import { useDrag } from '@use-gesture/react';
import { WZD_COMPONENTS, type WzdComponentSpec } from '@newspapper/core/wizard';
import { Button } from '../ui';
import styles from './PalettePane.module.css';

const GROUP_LABELS: Record<string, string> = {
  structure: 'Structure',
  content: 'Content',
  accent: 'Accents',
  generated: 'Generated',
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
        className={[styles.item, dragging ? styles.itemDragging : ''].filter(Boolean).join(' ')}
        title={spec.description}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
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

export default function PalettePane({
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
      if (spec.role !== 'component' || spec.name === 'Slide') continue;
      const list = out.get(spec.group) ?? [];
      list.push(spec);
      out.set(spec.group, list);
    }
    return [...out];
  }, []);

  return (
    <div className={styles.palette}>
      <p className={styles.hint}>
        {disabled
          ? 'Fix the markup before adding components.'
          : 'Drag into a slot, or click to add to the selection.'}
      </p>
      {groups.map(([group, specs]) => (
        <section key={group} className={styles.group}>
          <h3 className={styles.groupTitle}>{GROUP_LABELS[group] ?? group}</h3>
          <ul className={styles.items}>
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
