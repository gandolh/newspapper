/**
 * The Wizard linter — where meaning lives, as opposed to the formatter, which
 * owns whitespace.
 *
 * It reads the catalogue and returns a list. It never throws, and an invalid
 * prop value is a finding rather than a silent fallback.
 */

import {
  WZD_DOCUMENT_PARENT,
  elementChildren,
  type WzdDocument,
  type WzdElement,
  type WzdLoc,
  type WzdNode,
  type WzdText,
} from './ast.js';
import {
  WZD_REQUIRED_HEAD_FIELDS,
  getComponentSpec,
  type WzdComponentSpec,
} from './catalogue.js';
import { bindingMessage, unresolvedBindings } from './bindings.js';
import {
  sortDiagnostics,
  type WzdDiagnostic,
  type WzdDiagnosticCode,
  type WzdSeverity,
} from './diagnostics.js';
import { parse } from './parse.js';

export interface WzdLintOptions {
  /** Fewer slides than this is an error. Default 1. */
  minSlides?: number;
  /** More slides than this is a warning. Default 10. */
  maxSlides?: number;
}

export const WZD_LINT_DEFAULTS: Required<WzdLintOptions> = {
  minSlides: 1,
  maxSlides: 10,
};

const TOP_LEVEL_TAGS = ['head', 'body'];

function list(names: readonly string[]): string {
  return names.join(', ');
}

function zeroWidth(loc: WzdLoc): WzdLoc {
  return { start: loc.start, end: loc.start };
}

/** A range inside a text node, mapped back to document coordinates. */
function sliceLoc(node: WzdText, start: number, end: number): WzdLoc {
  let line = node.loc.start.line;
  let column = node.loc.start.column;
  let startPos = node.loc.start;
  for (let i = 0; i <= node.raw.length; i++) {
    if (i === start) startPos = { offset: node.loc.start.offset + i, line, column };
    if (i === end) return { start: startPos, end: { offset: node.loc.start.offset + i, line, column } };
    if (node.raw[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return node.loc;
}

class Linter {
  private readonly findings: WzdDiagnostic[] = [];
  private head: Record<string, string> = {};
  private readonly minSlides: number;
  private readonly maxSlides: number;

  constructor(options: WzdLintOptions) {
    this.minSlides = options.minSlides ?? WZD_LINT_DEFAULTS.minSlides;
    this.maxSlides = options.maxSlides ?? WZD_LINT_DEFAULTS.maxSlides;
  }

  private add(
    code: WzdDiagnosticCode,
    severity: WzdSeverity,
    message: string,
    loc: WzdLoc,
  ): void {
    this.findings.push({ code, severity, message, loc });
  }

  run(doc: WzdDocument): WzdDiagnostic[] {
    this.head = doc.head;
    this.checkDocument(doc);
    this.checkNodes(doc.children, null, []);
    return sortDiagnostics(this.findings);
  }

  private checkDocument(doc: WzdDocument): void {
    if (!doc.headElement) {
      this.add(
        'missing-head',
        'error',
        'This document has no <head>. Add one declaring at least a <title>.',
        zeroWidth(doc.loc),
      );
    } else {
      for (const field of WZD_REQUIRED_HEAD_FIELDS) {
        if (!doc.head[field]) {
          this.add(
            'missing-title',
            'error',
            `The <head> declares no ${field}. A post is identified by its title.`,
            doc.headElement.openTagLoc,
          );
        }
      }
    }

    if (!doc.bodyElement) {
      this.add(
        'slide-count',
        'error',
        'This document has no <body>, so it has no slides. A post needs at least one.',
        zeroWidth(doc.loc),
      );
      return;
    }

    const slides = elementChildren(doc.bodyElement).filter((el) => el.type === 'Slide');
    if (slides.length < this.minSlides) {
      this.add(
        'slide-count',
        'error',
        `This post has ${slides.length} slides. A post needs at least ${this.minSlides}.`,
        doc.bodyElement.openTagLoc,
      );
    } else if (slides.length > this.maxSlides) {
      this.add(
        'slide-count',
        'warning',
        `This post has ${slides.length} slides. More than ${this.maxSlides} is a lot to scroll.`,
        doc.bodyElement.openTagLoc,
      );
    }

    let sawHead = false;
    let sawBody = false;
    for (const node of doc.children) {
      if (node.kind !== 'element') continue;
      if (node.type === 'head') {
        if (sawHead) {
          this.add('misplaced-element', 'error', 'A document has one <head>.', node.openTagLoc);
        }
        sawHead = true;
      }
      if (node.type === 'body') {
        if (sawBody) {
          this.add('misplaced-element', 'error', 'A document has one <body>.', node.openTagLoc);
        }
        sawBody = true;
      }
    }
  }

  private checkNodes(
    nodes: readonly WzdNode[],
    parent: WzdElement | null,
    ancestors: readonly WzdElement[],
  ): void {
    const parentSpec = parent ? getComponentSpec(parent.type) : undefined;
    for (const node of nodes) {
      if (node.kind === 'comment') continue;
      if (node.kind === 'text') {
        this.checkText(node, parent, parentSpec);
        continue;
      }
      this.checkElement(node, parent, parentSpec, ancestors);
      this.checkNodes(node.children, node, [...ancestors, node]);
    }
  }

  private checkText(
    node: WzdText,
    parent: WzdElement | null,
    parentSpec: WzdComponentSpec | undefined,
  ): void {
    if (!parent) {
      this.add(
        'misplaced-element',
        'error',
        'Text cannot sit at the top level. Put it inside a component, inside a <Slide>.',
        node.loc,
      );
      return;
    }
    if (parentSpec && parentSpec.children !== 'text') {
      this.add(
        'misplaced-element',
        'error',
        `<${parent.type}> holds elements, not text. Wrap the words in a <Text> or <Heading>.`,
        node.loc,
      );
      return;
    }
    this.checkBindings(node, parentSpec);
  }

  /**
   * `{date}` resolves from `<head>`; one that cannot is an error rather than a
   * silently empty slide. Bindings are a slide feature, so `<head>` text is
   * not scanned.
   */
  private checkBindings(node: WzdText, parentSpec: WzdComponentSpec | undefined): void {
    if (!parentSpec || parentSpec.role !== 'component') return;
    for (const binding of unresolvedBindings(node.raw, this.head)) {
      this.add(
        'unknown-binding',
        'error',
        bindingMessage(binding),
        sliceLoc(node, binding.start, binding.end),
      );
    }
  }

  private checkElement(
    element: WzdElement,
    parent: WzdElement | null,
    parentSpec: WzdComponentSpec | undefined,
    ancestors: readonly WzdElement[],
  ): void {
    const spec = getComponentSpec(element.type);
    if (!spec) {
      const lowercase = element.type[0] === element.type[0].toLowerCase();
      this.add(
        'unknown-component',
        'error',
        lowercase
          ? `Unknown tag <${element.type}>. Lowercase tags are document structure: ${list(TOP_LEVEL_TAGS)} and the <head> fields.`
          : `Unknown component <${element.type}>. It is not in the catalogue.`,
        element.nameLoc,
      );
      return;
    }

    this.checkProps(element, spec);
    this.checkPlacement(element, spec, parent, parentSpec, ancestors);

    if (spec.name === 'Slide' && elementChildren(element).length === 0) {
      this.add(
        'empty-slide',
        'error',
        'This slide is empty. A slide renders an image, so it needs something on it.',
        element.openTagLoc,
      );
    }
  }

  private checkProps(element: WzdElement, spec: WzdComponentSpec): void {
    const allowed = Object.keys(spec.props);
    const seen = new Set<string>();
    for (const attr of element.attributes) {
      if (seen.has(attr.name)) {
        this.add(
          'duplicate-prop',
          'error',
          `\`${attr.name}\` is set twice on <${element.type}>. The first value wins.`,
          attr.nameLoc,
        );
        continue;
      }
      seen.add(attr.name);

      const propSpec = spec.props[attr.name];
      if (!propSpec) {
        this.add(
          'unknown-prop',
          'error',
          allowed.length
            ? `<${element.type}> has no \`${attr.name}\` prop. It takes: ${list(allowed)}.`
            : `<${element.type}> takes no props.`,
          attr.nameLoc,
        );
        continue;
      }

      if (propSpec.kind === 'enum') {
        const values = propSpec.values ?? [];
        if (!values.includes(attr.value)) {
          this.add(
            'invalid-prop-value',
            'error',
            `\`${attr.value}\` is not a ${attr.name}. Use one of: ${list(values)}.`,
            attr.valueLoc,
          );
        }
        continue;
      }

      if (attr.value.includes('"') && attr.value.includes("'")) {
        this.add(
          'invalid-prop-value',
          'error',
          `The value of \`${attr.name}\` cannot contain both quote characters — Wizard has no escapes.`,
          attr.valueLoc,
        );
      }
    }

    for (const propSpec of Object.values(spec.props)) {
      if (!propSpec.required) continue;
      if (!element.props[propSpec.name]) {
        this.add(
          'missing-prop',
          'error',
          `<${element.type}> needs a \`${propSpec.name}\` prop. ${propSpec.description}`,
          element.openTagLoc,
        );
      }
    }
  }

  private checkPlacement(
    element: WzdElement,
    spec: WzdComponentSpec,
    parent: WzdElement | null,
    parentSpec: WzdComponentSpec | undefined,
    ancestors: readonly WzdElement[],
  ): void {
    const parentName = parent ? parent.type : WZD_DOCUMENT_PARENT;

    if (spec.requiredParent && !spec.requiredParent.includes(parentName)) {
      if (element.type === 'Slide' && ancestors.some((a) => a.type === 'Slide')) {
        this.add(
          'misplaced-element',
          'error',
          'A <Slide> cannot be nested inside another <Slide>. One slide is one image.',
          element.openTagLoc,
        );
        return;
      }
      const where = spec.requiredParent.includes(WZD_DOCUMENT_PARENT)
        ? 'at the top level of the document'
        : `a direct child of ${spec.requiredParent.map((p) => `<${p}>`).join(' or ')}`;
      this.add(
        'misplaced-element',
        'error',
        `<${element.type}> must be ${where}.`,
        element.openTagLoc,
      );
      return;
    }

    if (spec.requiredAncestor && !ancestors.some((a) => a.type === spec.requiredAncestor)) {
      this.add(
        'misplaced-element',
        'error',
        `<${element.type}> must be inside a <${spec.requiredAncestor}>.`,
        element.openTagLoc,
      );
      return;
    }

    if (parent && parentSpec) {
      if (parentSpec.children === 'none') {
        this.add(
          'misplaced-element',
          'error',
          `<${parent.type}> takes no content.`,
          element.openTagLoc,
        );
        return;
      }
      if (parentSpec.children === 'text') {
        this.add(
          'misplaced-element',
          'error',
          `<${parent.type}> holds text, not elements.`,
          element.openTagLoc,
        );
        return;
      }
      if (parentSpec.allowedChildren && !parentSpec.allowedChildren.includes(element.type)) {
        this.add(
          'misplaced-element',
          'error',
          `<${element.type}> cannot go inside <${parent.type}>, which holds: ${list(parentSpec.allowedChildren)}.`,
          element.openTagLoc,
        );
        return;
      }
    }

  }
}

/** Lint a parsed document. Returns findings in source order; never throws. */
export function lint(doc: WzdDocument, options: WzdLintOptions = {}): WzdDiagnostic[] {
  return new Linter(options).run(doc);
}

/**
 * Parse and lint in one call. Syntax errors come first; the semantic rules
 * still run over whatever the parser recovered.
 */
export function lintSource(source: string, options: WzdLintOptions = {}): WzdDiagnostic[] {
  const result = parse(source);
  return sortDiagnostics([...result.errors, ...lint(result.doc, options)]);
}
