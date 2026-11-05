/**
 * The galley: the `.wzd` copy, waxed to the board beside the artwork.
 *
 * A transparent `<textarea>` sits over a `<pre>` that paints the tokens, so
 * the caret, undo stack and IME are the browser's and highlighting never has
 * to reimplement any of them. Lint findings are painted at the exact ranges
 * the linter reported, and listed underneath so they can be jumped to.
 *
 * A text selection is the one thing the textarea would otherwise paint, and
 * it paints above the galley: its ground hid the galley's glyphs. So the
 * textarea's `::selection` is transparent and the galley shows the range
 * itself, the ground on a layer under the text and the ink on the tokens.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WzdDiagnostic } from '@newspapper/core/wizard';
import { Button, Finding, Mark, WAX } from '../ui';
import { decorate, tokenize, type WzdRangeMark } from './highlight.js';
import styles from './SourcePane.module.css';

const SELECTED_MARK = 'selected';
/** The textarea's own selection, while it has focus and spans a range. */
const TEXT_SELECTION_MARK = 'text-selection';

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) if (source[i] === '\n') line += 1;
  return line;
}

export interface SourcePaneProps {
  source: string;
  onChange: (source: string) => void;
  diagnostics: readonly WzdDiagnostic[];
  /** Source range of the selected element, painted behind the caret. */
  selectionRange: [number, number] | null;
  /**
   * Bumped whenever the selection came from somewhere other than this pane.
   * That is the cue to move the caret; a change of range alone is not, or
   * typing would fight the preview for the caret.
   */
  revealToken: number;
  onCursor: (offset: number) => void;
  onFormat: () => void;
  formatted: boolean;
}

export default function SourcePane({
  source,
  onChange,
  diagnostics,
  selectionRange,
  revealToken,
  onCursor,
  onFormat,
  formatted,
}: SourcePaneProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const groundRef = useRef<HTMLPreElement>(null);
  const [textSelection, setTextSelection] = useState<[number, number] | null>(null);

  const tokens = useMemo(() => tokenize(source), [source]);

  const spans = useMemo(() => {
    const marks: WzdRangeMark[] = diagnostics.map((d) => ({
      start: d.loc.start.offset,
      end: d.loc.end.offset,
      mark: d.severity,
    }));
    if (selectionRange) {
      marks.push({
        start: selectionRange[0],
        end: selectionRange[1],
        mark: SELECTED_MARK,
      });
    }
    if (textSelection) {
      marks.push({ start: textSelection[0], end: textSelection[1], mark: TEXT_SELECTION_MARK });
    }
    return decorate(tokens, marks, source.length);
  }, [tokens, source.length, diagnostics, selectionRange, textSelection]);

  const messageAt = useCallback(
    (start: number, end: number): string | undefined => {
      const hits = diagnostics.filter(
        (d) => d.loc.start.offset < Math.max(end, start + 1) && d.loc.end.offset + 1 > start,
      );
      return hits.length ? hits.map((d) => `${d.code}: ${d.message}`).join('\n') : undefined;
    },
    [diagnostics],
  );

  const reportCursor = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    onCursor(el.selectionStart);
    const { selectionStart: start, selectionEnd: end } = el;
    // A caret is not a selection: a collapsed range would be widened to one
    // character by `decorate` and paint as if that character were selected.
    setTextSelection((current) =>
      start === end ? null : current?.[0] === start && current[1] === end ? current : [start, end],
    );
  }, [onCursor]);

  /** The layers under the textarea scroll with it. */
  const followScroll = useCallback((top: number, left: number) => {
    for (const layer of [preRef.current, groundRef.current]) {
      if (!layer) continue;
      layer.scrollTop = top;
      layer.scrollLeft = left;
    }
  }, []);

  useEffect(() => {
    const handler = (): void => {
      if (document.activeElement === textRef.current) reportCursor();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [reportCursor]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || !selectionRange || revealToken === 0) return;
    el.setSelectionRange(selectionRange[0], selectionRange[1]);
    const line = lineOf(source, selectionRange[0]);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const target = (line - 4) * lineHeight;
    if (target < el.scrollTop || target > el.scrollTop + el.clientHeight - lineHeight * 4) {
      el.scrollTop = Math.max(0, target);
      followScroll(el.scrollTop, el.scrollLeft);
    }
    // `source` is deliberately not a dependency: a reveal is an event, not a
    // property of the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealToken]);

  /*
   * The wax is laid once per contiguous run of selected tokens, on a wrapper
   * that sits under the text. It used to be a class on every token,
   * each with its own 0.35em box-shadow bleed, and inline boxes paint in tree
   * order: each token's bleed covered the last glyph of the token before it.
   * Inside the run the tokens keep their weight and slope and take the wax's
   * ink; the wrapper alone paints the ground and the bleed.
   */
  const galley = useMemo(() => {
    const out: ReactNode[] = [];
    let run: ReactNode[] | null = null;
    let runStart = 0;
    const closeRun = (): void => {
      if (!run) return;
      out.push(
        <span key={`wax-${runStart}`} className={`${WAX} ${styles.waxRun}`}>
          {run}
        </span>,
      );
      run = null;
    };
    for (const span of spans) {
      const selected = span.marks.includes(SELECTED_MARK);
      const onWax = selected || span.marks.includes(TEXT_SELECTION_MARK);
      const lint = span.marks.filter((m) => m !== SELECTED_MARK && m !== TEXT_SELECTION_MARK);
      const token = (
        <span
          key={`${span.start}-${span.end}`}
          className={[styles[span.kind], onWax ? styles.onWax : null, ...lint.map((m) => styles[m])]
            .filter(Boolean)
            .join(' ')}
          title={lint.length > 0 ? messageAt(span.start, span.end) : undefined}
        >
          {source.slice(span.start, span.end)}
        </span>
      );
      if (selected) {
        if (!run) {
          run = [];
          runStart = span.start;
        }
        run.push(token);
      } else {
        closeRun();
        out.push(token);
      }
    }
    closeRun();
    return out;
  }, [spans, source, messageAt]);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return (
    <div className={styles.pane}>
      <div className={styles.bar}>
        <span className={styles.barTitle}>post.wzd</span>
        <span className={styles.barMarks}>
          {errors.length > 0 && <Mark tone="rubylith">{errors.length} errors</Mark>}
          {warnings.length > 0 && <Mark tone="ink">{warnings.length} warnings</Mark>}
          {errors.length === 0 && warnings.length === 0 && <Mark>Sets clean</Mark>}
        </span>
        <span className={styles.barSpacer} />
        <Button variant="ghost" size="sm" onClick={onFormat} disabled={formatted}>
          {formatted ? 'Formatted' : 'Format'}
        </Button>
      </div>

      <div className={styles.code}>
        {/* The selection's ground: the same text, unpainted, with the selected
            range on wax. It sits under the galley, so no glyph is ever behind
            it, and an inline box is the height of the text, not of the line. */}
        <pre className={styles.selectionLayer} ref={groundRef} aria-hidden="true">
          {textSelection ? (
            <>
              {source.slice(0, textSelection[0])}
              <span className={styles.selectionGround}>
                {source.slice(textSelection[0], textSelection[1])}
              </span>
              {source.slice(textSelection[1])}
            </>
          ) : (
            source
          )}
          {'\n '}
        </pre>
        <pre className={styles.highlight} ref={preRef} aria-hidden="true">
          {galley}
          {'\n '}
        </pre>
        <textarea
          ref={textRef}
          className={styles.input}
          value={source}
          spellCheck={false}
          wrap="off"
          aria-label="Wizard markup"
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) =>
            followScroll(event.currentTarget.scrollTop, event.currentTarget.scrollLeft)
          }
          onClick={reportCursor}
          onKeyUp={reportCursor}
          onFocus={reportCursor}
          onBlur={() => setTextSelection(null)}
        />
      </div>

      <span className={styles.deckle} aria-hidden="true" />

      <ul className={styles.findings}>
        {diagnostics.map((d, i) => (
          <li key={`${d.code}-${d.loc.start.offset}-${i}`}>
            <Button
              variant="ghost"
              size="sm"
              className={styles.finding}
              onClick={() => {
                const el = textRef.current;
                if (!el) return;
                el.focus();
                el.setSelectionRange(d.loc.start.offset, d.loc.end.offset);
                reportCursor();
              }}
            >
              <Finding
                where={`${d.code} · line ${d.loc.start.line}, col ${d.loc.start.column}`}
                muted={d.severity !== 'error'}
              >
                {d.message}
              </Finding>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
