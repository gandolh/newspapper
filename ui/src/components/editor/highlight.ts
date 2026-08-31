/**
 * Wizard syntax highlighting, as a plain tokenizer.
 *
 * The source pane is a transparent `<textarea>` over a `<pre>` that paints
 * these tokens, so highlighting never touches what the caret does. The
 * tokenizer is deliberately independent of the parser: it has to colour a
 * half-typed tag, which the parser refuses to describe.
 *
 * Tokens tile the whole source with no gaps and no overlaps, which is what
 * lets diagnostics be sliced into them.
 */

export type WzdTokenKind =
  | 'text'
  | 'punct'
  | 'component'
  | 'structure'
  | 'attr'
  | 'value'
  | 'comment'
  | 'binding';

export interface WzdToken {
  start: number;
  end: number;
  kind: WzdTokenKind;
}

const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_.:-]/;

class Tokenizer {
  private readonly out: WzdToken[] = [];
  private pending = -1;

  constructor(private readonly src: string) {}

  private flushText(upTo: number): void {
    if (this.pending < 0 || upTo <= this.pending) {
      this.pending = -1;
      return;
    }
    const slice = this.src.slice(this.pending, upTo);
    let cursor = this.pending;
    const binding = /\{[^{}\n]*\}/g;
    let match: RegExpExecArray | null;
    while ((match = binding.exec(slice)) !== null) {
      const at = this.pending + match.index;
      if (at > cursor) this.out.push({ start: cursor, end: at, kind: 'text' });
      this.out.push({ start: at, end: at + match[0].length, kind: 'binding' });
      cursor = at + match[0].length;
    }
    if (cursor < upTo) this.out.push({ start: cursor, end: upTo, kind: 'text' });
    this.pending = -1;
  }

  private push(start: number, end: number, kind: WzdTokenKind): void {
    if (end > start) this.out.push({ start, end, kind });
  }

  private name(from: number): number {
    let i = from;
    if (i < this.src.length && NAME_START.test(this.src[i])) {
      i += 1;
      while (i < this.src.length && NAME_CHAR.test(this.src[i])) i += 1;
    }
    return i;
  }

  /** Consume a tag from `<`. Returns the offset just past it. */
  private tag(from: number): number {
    const src = this.src;
    let i = from + 1;
    const closing = src[i] === '/';
    if (closing) i += 1;
    this.push(from, i, 'punct');

    const nameEnd = this.name(i);
    if (nameEnd > i) {
      const first = src[i];
      this.push(i, nameEnd, first === first.toUpperCase() ? 'component' : 'structure');
    }
    i = nameEnd;

    while (i < src.length && src[i] !== '>') {
      const ch = src[i];
      if (/\s/.test(ch)) {
        this.push(i, i + 1, 'text');
        i += 1;
        continue;
      }
      if (ch === '/') {
        this.push(i, i + 1, 'punct');
        i += 1;
        continue;
      }
      if (ch === '=') {
        this.push(i, i + 1, 'punct');
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== ch) j += 1;
        j = Math.min(j + 1, src.length);
        this.push(i, j, 'value');
        i = j;
        continue;
      }
      const end = this.name(i);
      if (end > i) {
        this.push(i, end, 'attr');
        i = end;
        continue;
      }
      this.push(i, i + 1, 'text');
      i += 1;
    }
    if (i < src.length) {
      this.push(i, i + 1, 'punct');
      i += 1;
    }
    return i;
  }

  run(): WzdToken[] {
    const src = this.src;
    let i = 0;
    while (i < src.length) {
      if (src[i] === '<') {
        if (src.startsWith('<!--', i)) {
          this.flushText(i);
          const close = src.indexOf('-->', i + 4);
          const end = close < 0 ? src.length : close + 3;
          this.push(i, end, 'comment');
          i = end;
          continue;
        }
        const after = src[i + 1];
        if (after === '/' || (after !== undefined && NAME_START.test(after))) {
          this.flushText(i);
          i = this.tag(i);
          continue;
        }
      }
      if (this.pending < 0) this.pending = i;
      i += 1;
    }
    this.flushText(src.length);
    return this.out;
  }
}

export function tokenize(source: string): WzdToken[] {
  return new Tokenizer(source).run();
}

export interface WzdSpan extends WzdToken {
  /** Extra classes layered over the token — lint marks, the selected element. */
  marks: string[];
}

export interface WzdRangeMark {
  start: number;
  end: number;
  mark: string;
}

/**
 * Slice `tokens` at every mark boundary so each resulting span carries the
 * complete set of marks covering it. Zero-width marks are widened by one
 * character so a diagnostic pointing at an insertion point is still visible.
 */
export function decorate(
  tokens: readonly WzdToken[],
  marks: readonly WzdRangeMark[],
  length: number,
): WzdSpan[] {
  if (!marks.length) return tokens.map((t) => ({ ...t, marks: [] }));

  const widened = marks.map((m) => ({
    ...m,
    start: Math.max(0, Math.min(m.start, length)),
    end: Math.max(Math.min(m.end, length), Math.min(m.start + 1, length)),
  }));

  const cuts = new Set<number>();
  for (const m of widened) {
    cuts.add(m.start);
    cuts.add(m.end);
  }

  const out: WzdSpan[] = [];
  for (const token of tokens) {
    const inner = [...cuts].filter((c) => c > token.start && c < token.end).sort((a, b) => a - b);
    const bounds = [token.start, ...inner, token.end];
    for (let i = 0; i < bounds.length - 1; i += 1) {
      const start = bounds[i];
      const end = bounds[i + 1];
      const hits = widened.filter((m) => m.start < end && m.end > start).map((m) => m.mark);
      out.push({ start, end, kind: token.kind, marks: [...new Set(hits)] });
    }
  }
  return out;
}
