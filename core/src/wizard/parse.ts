/**
 * Newspapper Wizard parser — hand-written recursive descent.
 *
 * This is markup, not JSX: there are no expressions. `{date}` is carried
 * through as ordinary text and resolved by the renderer. The parser knows
 * nothing about the catalogue; naming and placement are the linter's job.
 *
 * Parsing never throws. Every problem is reported as a `syntax-error`
 * diagnostic with a range, and the parser recovers so the editor still has a
 * tree to show.
 */

import {
  elementChildren,
  textContent,
  type WzdAttribute,
  type WzdComment,
  type WzdDocument,
  type WzdElement,
  type WzdLoc,
  type WzdNode,
  type WzdPosition,
  type WzdText,
} from './ast.js';
import type { WzdDiagnostic } from './diagnostics.js';

export interface WzdParseResult {
  doc: WzdDocument;
  /** Syntax errors, in source order. Empty for a well-formed document. */
  errors: WzdDiagnostic[];
  /** The normalized source that every offset in `doc` refers to. */
  source: string;
}

export class WzdSyntaxError extends Error {
  readonly diagnostic: WzdDiagnostic;
  readonly diagnostics: WzdDiagnostic[];

  constructor(diagnostics: WzdDiagnostic[]) {
    const first = diagnostics[0];
    super(`${first.loc.start.line}:${first.loc.start.column}: ${first.message}`);
    this.name = 'WzdSyntaxError';
    this.diagnostic = first;
    this.diagnostics = diagnostics;
  }
}

const TAG_NAME = /[A-Za-z][A-Za-z0-9]*/y;
const ATTR_NAME = /[A-Za-z_][A-Za-z0-9_-]*/y;

/** Normalize line endings and strip a BOM. Offsets refer to the result. */
export function normalizeSource(source: string): string {
  return source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

interface ChildrenResult {
  nodes: WzdNode[];
  closeTagLoc: WzdLoc | null;
  closed: boolean;
}

interface ClosingTag {
  name: string;
  loc: WzdLoc;
}

class Parser {
  private readonly src: string;
  private readonly lineStarts: number[];
  private i = 0;
  private readonly openStack: string[] = [];
  readonly errors: WzdDiagnostic[] = [];

  constructor(src: string) {
    this.src = src;
    this.lineStarts = [0];
    for (let n = 0; n < src.length; n++) {
      if (src.charCodeAt(n) === 10) this.lineStarts.push(n + 1);
    }
  }

  private positionAt(offset: number): WzdPosition {
    const clamped = Math.max(0, Math.min(offset, this.src.length));
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid] <= clamped) lo = mid;
      else hi = mid - 1;
    }
    return { offset: clamped, line: lo + 1, column: clamped - this.lineStarts[lo] + 1 };
  }

  private loc(start: number, end: number): WzdLoc {
    return { start: this.positionAt(start), end: this.positionAt(end) };
  }

  private error(message: string, loc: WzdLoc): void {
    this.errors.push({ code: 'syntax-error', severity: 'error', message, loc });
  }

  private skipWhitespace(): void {
    while (this.i < this.src.length && /\s/.test(this.src[this.i])) this.i++;
  }

  parseDocument(): WzdDocument {
    const { nodes } = this.parseNodes(null);
    let headElement: WzdElement | null = null;
    let bodyElement: WzdElement | null = null;
    for (const node of nodes) {
      if (node.kind !== 'element') continue;
      if (node.type === 'head' && !headElement) headElement = node;
      if (node.type === 'body' && !bodyElement) bodyElement = node;
    }
    const head: Record<string, string> = {};
    if (headElement) {
      for (const field of elementChildren(headElement)) {
        if (!Object.prototype.hasOwnProperty.call(head, field.type)) {
          head[field.type] = textContent(field);
        }
      }
    }
    return {
      kind: 'document',
      head,
      body: bodyElement ? bodyElement.children : [],
      children: nodes,
      headElement,
      bodyElement,
      loc: this.loc(0, this.src.length),
    };
  }

  private parseNodes(parentName: string | null): ChildrenResult {
    const nodes: WzdNode[] = [];
    let blank = false;
    while (this.i < this.src.length) {
      if (this.src.startsWith('<!--', this.i)) {
        nodes.push(this.parseComment(blank));
        blank = false;
        continue;
      }
      if (this.src.startsWith('</', this.i)) {
        const start = this.i;
        const close = this.readClosingTag();
        if (!close) continue;
        if (parentName !== null && close.name === parentName) {
          return { nodes, closeTagLoc: close.loc, closed: true };
        }
        if (parentName !== null && this.openStack.includes(close.name)) {
          this.i = start;
          return { nodes, closeTagLoc: null, closed: false };
        }
        this.error(
          `Unexpected closing tag </${close.name}> — nothing here is open.`,
          close.loc,
        );
        continue;
      }
      if (this.src[this.i] === '<') {
        const element = this.parseElement(blank);
        blank = false;
        if (element) nodes.push(element);
        continue;
      }
      const start = this.i;
      while (this.i < this.src.length && this.src[this.i] !== '<') this.i++;
      const raw = this.src.slice(start, this.i);
      if (raw.trim() === '') {
        if (countNewlines(raw) >= 2) blank = true;
        continue;
      }
      const lead = raw.length - raw.trimStart().length;
      const tail = raw.length - raw.trimEnd().length;
      const from = start + lead;
      const to = this.i - tail;
      const node: WzdText = {
        kind: 'text',
        value: collapse(raw),
        raw: this.src.slice(from, to),
        blankLineBefore: blank || countNewlines(raw.slice(0, lead)) >= 2,
        loc: this.loc(from, to),
      };
      blank = false;
      nodes.push(node);
    }
    return { nodes, closeTagLoc: null, closed: false };
  }

  private parseComment(blankLineBefore: boolean): WzdComment {
    const start = this.i;
    this.i += 4;
    const bodyStart = this.i;
    const close = this.src.indexOf('-->', bodyStart);
    let bodyEnd: number;
    if (close === -1) {
      bodyEnd = this.src.length;
      this.i = this.src.length;
      this.error('This comment is never closed — add `-->`.', this.loc(start, this.i));
    } else {
      bodyEnd = close;
      this.i = close + 3;
    }
    return {
      kind: 'comment',
      value: collapse(this.src.slice(bodyStart, bodyEnd)),
      raw: this.src.slice(bodyStart, bodyEnd),
      blankLineBefore,
      loc: this.loc(start, this.i),
    };
  }

  private readClosingTag(): ClosingTag | null {
    const start = this.i;
    this.i += 2;
    TAG_NAME.lastIndex = this.i;
    const match = TAG_NAME.exec(this.src);
    if (!match) {
      this.error('Malformed closing tag — expected a tag name after `</`.', this.loc(start, this.i));
      return null;
    }
    const name = match[0];
    this.i += name.length;
    this.skipWhitespace();
    if (this.src[this.i] === '>') {
      this.i++;
    } else {
      this.error(`Closing tag </${name}> is missing its \`>\`.`, this.loc(start, this.i));
    }
    return { name, loc: this.loc(start, this.i) };
  }

  private parseElement(blankLineBefore: boolean): WzdElement | null {
    const start = this.i;
    this.i++;
    TAG_NAME.lastIndex = this.i;
    const match = TAG_NAME.exec(this.src);
    if (!match) {
      this.error(
        'Unexpected `<`. Write a tag name after it, or remove it — `<` cannot appear in text.',
        this.loc(start, start + 1),
      );
      this.i = start + 1;
      return null;
    }
    const name = match[0];
    const nameLoc = this.loc(this.i, this.i + name.length);
    this.i += name.length;

    const attributes: WzdAttribute[] = [];
    const props: Record<string, string> = {};
    let selfClosing = false;
    let unterminated = false;

    for (;;) {
      this.skipWhitespace();
      if (this.i >= this.src.length) {
        this.error(`The \`<${name}\` tag is never finished — add \`>\`.`, this.loc(start, this.i));
        unterminated = true;
        selfClosing = true;
        break;
      }
      if (this.src.startsWith('/>', this.i)) {
        this.i += 2;
        selfClosing = true;
        break;
      }
      if (this.src[this.i] === '>') {
        this.i++;
        break;
      }
      const attribute = this.parseAttribute(name);
      if (!attribute) continue;
      attributes.push(attribute);
      if (!Object.prototype.hasOwnProperty.call(props, attribute.name)) {
        props[attribute.name] = attribute.value;
      }
    }

    const openTagLoc = this.loc(start, this.i);

    if (selfClosing) {
      return {
        kind: 'element',
        type: name,
        props,
        attributes,
        children: [],
        selfClosing: true,
        blankLineBefore,
        openTagLoc,
        closeTagLoc: null,
        nameLoc,
        loc: openTagLoc,
      };
    }

    this.openStack.push(name);
    const result = this.parseNodes(name);
    this.openStack.pop();
    if (!result.closed && !unterminated) {
      this.error(`\`<${name}>\` is never closed — add \`</${name}>\`.`, openTagLoc);
    }
    return {
      kind: 'element',
      type: name,
      props,
      attributes,
      children: result.nodes,
      selfClosing: false,
      blankLineBefore,
      openTagLoc,
      closeTagLoc: result.closeTagLoc,
      nameLoc,
      loc: this.loc(start, result.closeTagLoc ? result.closeTagLoc.end.offset : this.i),
    };
  }

  private parseAttribute(tag: string): WzdAttribute | null {
    const nameStart = this.i;
    ATTR_NAME.lastIndex = this.i;
    const match = ATTR_NAME.exec(this.src);
    if (!match) {
      const char = this.src[this.i];
      this.error(
        `Unexpected \`${char}\` inside the \`<${tag}\` tag.`,
        this.loc(this.i, this.i + 1),
      );
      this.i++;
      return null;
    }
    const name = match[0];
    this.i += name.length;
    const nameLoc = this.loc(nameStart, this.i);
    const afterName = this.i;
    this.skipWhitespace();
    if (this.src[this.i] !== '=') {
      this.i = afterName;
      this.error(
        `Prop \`${name}\` needs a value, like ${name}="md". Wizard has no bare props.`,
        nameLoc,
      );
      return { name, value: '', loc: nameLoc, nameLoc, valueLoc: this.loc(afterName, afterName) };
    }
    this.i++;
    this.skipWhitespace();
    const quote = this.src[this.i];
    if (quote !== '"' && quote !== "'") {
      const valueStart = this.i;
      while (
        this.i < this.src.length &&
        !/[\s>]/.test(this.src[this.i]) &&
        !this.src.startsWith('/>', this.i)
      ) {
        this.i++;
      }
      const value = this.src.slice(valueStart, this.i);
      this.error(
        `Prop values must be quoted — write ${name}="${value}". Wizard has no expressions.`,
        this.loc(valueStart, this.i),
      );
      return {
        name,
        value,
        loc: this.loc(nameStart, this.i),
        nameLoc,
        valueLoc: this.loc(valueStart, this.i),
      };
    }
    const valueStart = this.i + 1;
    const close = this.src.indexOf(quote, valueStart);
    let valueEnd: number;
    if (close === -1) {
      valueEnd = this.src.length;
      this.i = this.src.length;
      this.error(
        `The value of \`${name}\` is missing its closing ${quote}.`,
        this.loc(valueStart - 1, this.i),
      );
    } else {
      valueEnd = close;
      this.i = close + 1;
    }
    return {
      name,
      value: this.src.slice(valueStart, valueEnd),
      loc: this.loc(nameStart, this.i),
      nameLoc,
      valueLoc: this.loc(valueStart, valueEnd),
    };
  }
}

function countNewlines(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Parse a `.wzd` document. Never throws; syntax problems come back in `errors`. */
export function parse(source: string): WzdParseResult {
  const normalized = normalizeSource(source);
  const parser = new Parser(normalized);
  const doc = parser.parseDocument();
  return { doc, errors: parser.errors, source: normalized };
}

/** Parse, throwing `WzdSyntaxError` on the first problem. For callers that want a document or nothing. */
export function parseOrThrow(source: string): WzdDocument {
  const result = parse(source);
  if (result.errors.length) throw new WzdSyntaxError(result.errors);
  return result.doc;
}
