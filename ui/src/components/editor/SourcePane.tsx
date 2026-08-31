/**
 * The galley: the `.wzd` copy, waxed to the board beside the artwork.
 *
 * A transparent `<textarea>` sits over a `<pre>` that paints the tokens, so
 * the caret, undo stack and IME are the browser's and highlighting never has
 * to reimplement any of them. Lint findings are painted at the exact ranges
 * the linter reported, and listed underneath so they can be jumped to.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { WzdDiagnostic } from '@newspapper/core/wizard';
import { Button, Finding, Mark, WAX } from '../ui';
import { decorate, tokenize, type WzdRangeMark } from './highlight.js';
import styles from './SourcePane.module.css';

const SELECTED_MARK = 'selected';

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
    return decorate(tokenize(source), marks, source.length);
  }, [source, diagnostics, selectionRange]);

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
    if (el) onCursor(el.selectionStart);
  }, [onCursor]);

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
      if (preRef.current) preRef.current.scrollTop = el.scrollTop;
    }
    // `source` is deliberately not a dependency: a reveal is an event, not a
    // property of the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealToken]);

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
        <pre className={styles.highlight} ref={preRef} aria-hidden="true">
          {spans.map((span) => (
            <span
              key={`${span.start}-${span.end}`}
              className={[
                styles[span.kind],
                ...span.marks.map((m) => (m === SELECTED_MARK ? WAX : styles[m])),
              ]
                .filter(Boolean)
                .join(' ')}
              title={
                span.marks.some((m) => m !== SELECTED_MARK)
                  ? messageAt(span.start, span.end)
                  : undefined
              }
            >
              {source.slice(span.start, span.end)}
            </span>
          ))}
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
          onScroll={(event) => {
            const el = event.currentTarget;
            if (preRef.current) {
              preRef.current.scrollTop = el.scrollTop;
              preRef.current.scrollLeft = el.scrollLeft;
            }
          }}
          onClick={reportCursor}
          onKeyUp={reportCursor}
          onFocus={reportCursor}
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
