/**
 * The canonical printed form of a Wizard document.
 *
 * There is exactly one way to print a given tree, so the visual editor can
 * write through the formatter and produce the text a person would have typed.
 * Author formatting is not preserved: the formatter owns all whitespace apart
 * from a single blank line between siblings, which it keeps.
 */

import { type WzdDocument, type WzdElement, type WzdNode } from './ast.js';
import { parse } from './parse.js';

export interface WzdFormatOptions {
  /** Spaces per indent level. Default 2. */
  indentWidth?: number;
  /** The column props and inline text try to stay within. Default 100. */
  printWidth?: number;
}

export const WZD_FORMAT_DEFAULTS: Required<WzdFormatOptions> = {
  indentWidth: 2,
  printWidth: 100,
};

function quoteValue(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.includes('"') ? `'${collapsed}'` : `"${collapsed}"`;
}

function attributeParts(element: WzdElement): string[] {
  return element.attributes.map((attr) => `${attr.name}=${quoteValue(attr.value)}`);
}

function printableChildren(element: WzdElement): WzdNode[] {
  return element.children.filter((child) => child.kind !== 'text' || child.value !== '');
}

class Printer {
  private readonly indentWidth: number;
  private readonly printWidth: number;

  constructor(options: WzdFormatOptions) {
    this.indentWidth = options.indentWidth ?? WZD_FORMAT_DEFAULTS.indentWidth;
    this.printWidth = options.printWidth ?? WZD_FORMAT_DEFAULTS.printWidth;
  }

  private pad(depth: number): string {
    return ' '.repeat(depth * this.indentWidth);
  }

  nodes(list: WzdNode[], depth: number, blankBetweenAll: boolean): string[] {
    const out: string[] = [];
    list.forEach((node, index) => {
      if (index > 0 && (blankBetweenAll || node.blankLineBefore)) out.push('');
      out.push(...this.node(node, depth));
    });
    return out;
  }

  node(node: WzdNode, depth: number): string[] {
    if (node.kind === 'text') return [`${this.pad(depth)}${node.value}`];
    if (node.kind === 'comment') {
      const body = node.value ? ` ${node.value} ` : ' ';
      return [`${this.pad(depth)}<!--${body}-->`];
    }
    return this.element(node, depth);
  }

  private element(element: WzdElement, depth: number): string[] {
    const indent = this.pad(depth);
    const attrs = attributeParts(element);
    const inlineAttrs = attrs.length ? ` ${attrs.join(' ')}` : '';
    const children = printableChildren(element);

    const openInline = `${indent}<${element.type}${inlineAttrs}`;
    const attrsFit = openInline.length + (children.length ? 1 : 3) <= this.printWidth;

    if (!attrsFit) {
      const head = [`${indent}<${element.type}`, ...attrs.map((a) => `${this.pad(depth + 1)}${a}`)];
      if (!children.length) return [...head, `${indent}/>`];
      return [
        ...head,
        `${indent}>`,
        ...this.nodes(children, depth + 1, false),
        `${indent}</${element.type}>`,
      ];
    }

    if (!children.length) return [`${openInline} />`];

    if (children.length === 1 && children[0].kind === 'text') {
      const oneLine = `${openInline}>${children[0].value}</${element.type}>`;
      if (oneLine.length <= this.printWidth) return [oneLine];
    }

    return [
      `${openInline}>`,
      ...this.nodes(children, depth + 1, false),
      `${indent}</${element.type}>`,
    ];
  }
}

/** Print a parsed document in canonical form. Always ends in a newline, unless empty. */
export function formatDocument(doc: WzdDocument, options: WzdFormatOptions = {}): string {
  const printer = new Printer(options);
  const lines = printer.nodes(doc.children, 0, true);
  if (!lines.length) return '';
  return `${lines.join('\n')}\n`;
}

/**
 * Format `.wzd` source. Returns the source unchanged when it cannot be parsed —
 * a broken document is left alone rather than mangled.
 */
export function format(source: string, options: WzdFormatOptions = {}): string {
  const result = parse(source);
  if (result.errors.length) return result.source;
  return formatDocument(result.doc, options);
}

/** True when `source` parses cleanly and is already in canonical form. */
export function isFormatted(source: string, options: WzdFormatOptions = {}): boolean {
  const result = parse(source);
  if (result.errors.length) return false;
  return formatDocument(result.doc, options) === source;
}
