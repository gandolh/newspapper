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
 * itself: the ground on a wrapper behind the selected tokens, above the wax
 * run when the selection is inside it, and the ink on the tokens.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WzdDiagnostic } from "@newspapper/core/wizard";
import { Button, Finding, Mark, WAX } from "../ui";
import { decorate, tokenize, type WzdRangeMark } from "./highlight.js";
import { cn } from "../../lib/cn";

const SELECTED_MARK = "selected";
/** The textarea's own selection, while it has focus and spans a range. */
const TEXT_SELECTION_MARK = "text-selection";

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) if (source[i] === "\n") line += 1;
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

/**
 * The highlight layer and the textarea share every metric. A line is 1.86 of 12.5px, about 23.25, held at 23px so lint
 * marks and wax sit on a line without touching its neighbours, and the caret stays on the paint.
 */
const GALLEY_BOX =
  "absolute inset-0 m-0 border-0 p-half font-galley text-galley leading-[23px] break-normal whitespace-pre [tab-size:2]";

/** Syntax follows casing, not category (DESIGN.md section 5, The Galley): lowercase document tags recede,
 * capitalised components are the structure, prop values are the one thing the markup itself names. */
const KIND_INK: Record<string, string> = {
  text: "text-graphite",
  punct: "text-graphite-soft",
  component: "text-graphite",
  structure: "text-graphite-soft",
  attr: "text-graphite-soft",
  value: "text-process-blue",
  comment: "text-graphite-soft",
  binding: "text-process-blue",
};

const KIND_FONT: Record<string, string> = {
  component: "font-bold",
  comment: "italic",
  binding: "font-bold",
};

/** Lint marks: the same rubylith, at galley weight. */
const LINT: Record<string, string> = {
  error: "bg-rubylith-wash-soft underline decoration-wavy decoration-rubylith underline-offset-4",
  warning: "underline decoration-wavy decoration-graphite-tint underline-offset-4",
};

export function SourcePane({
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
      return hits.length ? hits.map((d) => `${d.code}: ${d.message}`).join("\n") : undefined;
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

  /** The galley under the textarea scrolls with it. */
  const followScroll = useCallback((top: number, left: number) => {
    const layer = preRef.current;
    if (!layer) return;
    layer.scrollTop = top;
    layer.scrollLeft = left;
  }, []);

  useEffect(() => {
    const handler = (): void => {
      if (document.activeElement === textRef.current) reportCursor();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
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
   *
   * A text selection is laid on a wrapper too, one per contiguous range of
   * selected tokens, split where it crosses the wax run's edge: off the run it
   * sits behind the text like the run, and inside it it is the run's child,
   * which is how its blue lands above the wax and under the text. Its tokens
   * take graphite, on the run or off it.
   */
  const galley = useMemo(() => {
    const out: ReactNode[] = [];
    let run: ReactNode[] | null = null;
    let runStart = 0;
    let picked: ReactNode[] | null = null;
    let pickedStart = 0;
    const closePicked = (): void => {
      if (!picked) return;
      (run ?? out).push(
        <span
          key={`sel-${pickedStart}`}
          data-testid="galley-selection-ground"
          // A text selection is non-photo blue with graphite on it (DESIGN.md section 7), painted by the galley, not
          // by the textarea: the textarea paints above the galley, so its own ::selection ground would cover the
          // glyphs it selects. An inline box exactly the selected characters wide, no bleed. Off the wax run it sits
          // behind the text the way the run does (-z-1 in the galley's stacking context), so it covers no
          // neighbouring glyph; inside the run it is an ordinary inline box, painted after the run's wax.
          className={cn("bg-non-photo-select", !run && "relative -z-1")}
        >
          {picked}
        </span>,
      );
      picked = null;
    };
    const closeRun = (): void => {
      if (!run) return;
      closePicked();
      out.push(
        <span
          key={`wax-${runStart}`}
          data-testid="galley-wax-run" // The selected element's tokens sit in one wrapper that alone paints the wax and its 0.35em bleed: with a bleed
          // per token each would cover about half of the glyph before it. -z-2 puts it behind the text, one below an
          // off-run selection ground, so a selection that ends where the run begins keeps its last 0.35em. `clone`
          // gives each line of a run its own ends.
          className={cn(WAX, "relative -z-2 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]")}
        >
          {run}
        </span>,
      );
      run = null;
    };
    for (const span of spans) {
      const selected = span.marks.includes(SELECTED_MARK);
      const inSelection = span.marks.includes(TEXT_SELECTION_MARK);
      // One ink per token, chosen here rather than by cascade: graphite on a text selection (the paper inks don't hold
      // on the blue), the wax's own ink on the selected element, else the hue of its kind. Weight and slope follow
      // the kind whatever the ink, so the casing distinction survives the highlight.
      const ink = inSelection ? "text-graphite" : selected ? "text-wax-ink" : KIND_INK[span.kind];
      const lint = span.marks.filter((m) => m !== SELECTED_MARK && m !== TEXT_SELECTION_MARK);
      const token = (
        <span
          key={`${span.start}-${span.end}`}
          className={cn(ink, KIND_FONT[span.kind], ...lint.map((m) => LINT[m]))}
          title={lint.length > 0 ? messageAt(span.start, span.end) : undefined}
        >
          {source.slice(span.start, span.end)}
        </span>
      );
      if (selected && !run) {
        closePicked();
        run = [];
        runStart = span.start;
      } else if (!selected) {
        closeRun();
      }
      if (inSelection) {
        if (!picked) {
          picked = [];
          pickedStart = span.start;
        }
        picked.push(token);
      } else {
        closePicked();
        (run ?? out).push(token);
      }
    }
    closeRun();
    closePicked();
    return out;
  }, [spans, source, messageAt]);

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  return (
    <div // The galley: the copy, waxed to the board beside the artwork. Paper, a hairline, the hard short shadow, and a
      // graphite tab carrying the filename.
      className="flex h-full min-h-0 min-w-0 flex-col bg-paper shadow-waxed"
    >
      <div // The tab is graphite; the rest of the rail stays paper, so the marks keep their ink.
        className="flex h-unit shrink-0 items-stretch gap-half border-b border-hairline"
      >
        <span className="inline-flex shrink-0 items-center bg-graphite px-half font-galley text-field font-medium tracking-field text-board uppercase">
          post.wzd
        </span>
        <span className="flex min-w-0 items-center gap-half overflow-hidden">
          {errors.length > 0 && <Mark tone="rubylith">{errors.length} errors</Mark>}
          {warnings.length > 0 && <Mark tone="ink">{warnings.length} warnings</Mark>}
          {errors.length === 0 && warnings.length === 0 && <Mark>Sets clean</Mark>}
        </span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onFormat} disabled={formatted}>
          {formatted ? "Formatted" : "Format"}
        </Button>
      </div>

      <div // The overlays and the textarea must agree on every metric that affects where a glyph lands, or the paint drifts
        // from the caret.
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <pre
          data-testid="galley-highlight"
          className={cn(GALLEY_BOX, "pointer-events-none z-0 overflow-hidden bg-transparent text-graphite")}
          ref={preRef}
          aria-hidden="true"
        >
          {galley}
          {"\n "}
        </pre>
        <textarea
          ref={textRef}
          className={cn(
            GALLEY_BOX,
            "resize-none overflow-auto bg-transparent text-transparent caret-graphite outline-none selection:bg-transparent selection:text-transparent focus-visible:outline-none",
          )}
          value={source}
          spellCheck={false}
          wrap="off"
          aria-label="Wizard markup"
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => followScroll(event.currentTarget.scrollTop, event.currentTarget.scrollLeft)}
          onClick={reportCursor}
          onKeyUp={reportCursor}
          onFocus={reportCursor}
          onBlur={() => setTextSelection(null)}
        />
      </div>

      <span className="h-hair shrink-0 deckle" aria-hidden="true" />

      <ul className="max-h-[34%] flex-none overflow-auto border-t border-hairline">
        {diagnostics.map((d, i) => (
          <li key={`${d.code}-${d.loc.start.offset}-${i}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-hair py-[2px] text-left font-normal"
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
                muted={d.severity !== "error"}
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
