/**
 * A compiled `TNode` tree, painted in the browser.
 *
 * Style resolution is core's `resolveStyle` and nothing else — the same
 * function the Chromium renderer runs, so what the preview shows is what the
 * render produces. When a token does not exist in the theme, `resolveStyle`
 * throws; that is caught per declaration and reported as a visible warning on
 * the node rather than being swallowed, because a preview that renders happily
 * where the renderer refuses is worse than no preview at all.
 *
 * One `useDrag` per node turns a tap into a selection and a drag into a move.
 * The innermost node stops propagation, so a click always names the deepest
 * thing under the pointer.
 */

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useDrag } from '@use-gesture/react';
import type { TNode, Theme } from '@newspapper/core/templates';
import { sourceOffsetOf, styleWithoutStamp } from './compileTraced.js';
import { childrenOf, resolveTolerant, toReactStyle } from './resolve.js';
import styles from './TNodeView.module.css';

export interface NodeGestures {
  onSelect: (offset: number) => void;
  onDragStart: (offset: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
}

export interface TNodeViewProps {
  node: TNode;
  theme: Theme;
  /** Source offset of the selected element, when it is on this slide. */
  selectedOffset: number | null;
  gestures: NodeGestures;
  registerNode: (offset: number, el: HTMLElement | null) => void;
}

export default function TNodeView(props: TNodeViewProps): ReactNode {
  const { node, theme, selectedOffset, gestures, registerNode } = props;
  const offset = sourceOffsetOf(node);
  const { css, problems } = resolveTolerant(styleWithoutStamp(node), theme);
  const selected = offset !== null && offset === selectedOffset;

  const bind = useDrag(
    (state) => {
      if (offset === null) return;
      if (state.tap) {
        gestures.onSelect(offset);
        return;
      }
      if (state.first) gestures.onDragStart(offset);
      if (state.active) gestures.onDragMove(state.xy[0], state.xy[1]);
      if (state.last) gestures.onDragEnd();
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  const className = [
    styles.node,
    offset !== null ? styles.selectable : '',
    selected ? styles.selected : '',
    problems.length ? styles.warned : '',
  ]
    .filter(Boolean)
    .join(' ');

  // `bind()` recognizes the gesture on this node; every ancestor has its own
  // recognizer listening for the same bubbling pointerdown, so propagation is
  // stopped here to make the innermost node — the one under the pointer — the
  // one that answers.
  const bound = offset === null ? {} : bind();
  const shared = {
    ...bound,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (offset === null) return;
      event.stopPropagation();
      bound.onPointerDown?.(event);
    },
    className,
    style: toReactStyle(css) as CSSProperties,
    'data-wzd-offset': offset ?? undefined,
    'data-wzd-warning': problems.length ? '' : undefined,
    title: problems.length ? problems.join('\n') : undefined,
    ref: (el: HTMLDivElement | null) => {
      if (offset !== null) registerNode(offset, el);
    },
  };

  if (node.kind === 'text') {
    return (
      <div {...shared}>
        <span dangerouslySetInnerHTML={{ __html: node.text }} />
      </div>
    );
  }

  return (
    <div {...shared}>
      {childrenOf(node).map((child, i) => (
        <TNodeView
          key={i}
          node={child}
          theme={theme}
          selectedOffset={selectedOffset}
          gestures={gestures}
          registerNode={registerNode}
        />
      ))}
    </div>
  );
}
