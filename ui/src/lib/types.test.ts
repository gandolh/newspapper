/**
 * Guards ui/src/lib/types.ts against drifting from core/src/types.ts.
 *
 * The UI keeps a hand-maintained copy of the shared types (see
 * corpus/wiki/decisions-engineering.md "The UI keeps its own copy of the
 * shared types") because importing @newspapper/core's raw .ts fights the
 * Astro production build. That entry used to claim a guard test already
 * enforced the copy; none existed, and the mirror drifted for months. This is
 * that test: it parses both files with the TypeScript compiler and fails if
 * an exported type/interface is missing, extra, or structurally different.
 *
 * `ScrapedArticle` is the one mirrored type that doesn't live in
 * core/src/types.ts — it's exported from core/src/scrape/index.ts — so it's
 * checked separately against that file instead of the main core/ui diff.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const uiTypesPath = fileURLToPath(new URL('./types.ts', import.meta.url));
const coreTypesPath = fileURLToPath(new URL('../../../core/src/types.ts', import.meta.url));
const coreScrapePath = fileURLToPath(new URL('../../../core/src/scrape/index.ts', import.meta.url));

// Node-side types (only meaningful to the Node interpreter/theme loader) and
// server-only types (UserRecord carries a password hash) intentionally do not
// appear in the browser-facing mirror.
const CORE_ONLY = new Set(['Theme', 'RenderTemplateOptions', 'UserRecord']);

// Mirrored from a core module other than types.ts — checked against that
// module directly rather than against the core/types.ts ↔ ui diff.
const MIRRORED_FROM_SCRAPE = new Set(['ScrapedArticle']);

/**
 * Print one declaration as a comparable shape.
 *
 * The declaration is re-emitted from the AST, so indentation, line breaks and
 * member separators are already normalized away — but TypeScript's printer
 * re-uses the *original source text* for literals, so a string-literal union
 * carries whatever quote character the file happens to use. That made this
 * guard sensitive to formatting: reformat one side and not the other and every
 * union type mismatches. `'a' | 'b'` and `"a" | "b"` are the same type, so the
 * quote character is normalized out here (brief 68). Nothing else about a
 * declaration's text is allowed to matter.
 */
function shapeOf(stmt: ts.Node, sf: ts.SourceFile, printer: ts.Printer): string {
  return printer
    .printNode(ts.EmitHint.Unspecified, stmt, sf)
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function exportedDecls(filePath: string): Map<string, string> {
  const source = readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ removeComments: true });
  const decls = new Map<string, string>();

  for (const stmt of sf.statements) {
    if (!ts.isInterfaceDeclaration(stmt) && !ts.isTypeAliasDeclaration(stmt)) continue;
    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) continue;
    decls.set(stmt.name.text, shapeOf(stmt, sf, printer));
  }
  return decls;
}

describe('ui/src/lib/types.ts mirrors core/src/types.ts', () => {
  const core = exportedDecls(coreTypesPath);
  const ui = exportedDecls(uiTypesPath);
  const uiWithoutScrapeMirrors = new Map(
    [...ui].filter(([name]) => !MIRRORED_FROM_SCRAPE.has(name)),
  );

  it('sanity: parsed real declarations from both files', () => {
    expect(core.size).toBeGreaterThan(5);
    expect(ui.size).toBeGreaterThan(5);
  });

  it('mirrors every core export, except the declared Node-/server-only ones', () => {
    const missing = [...core.keys()].filter((name) => !CORE_ONLY.has(name) && !ui.has(name));
    expect(missing).toEqual([]);
  });

  it('has no exports beyond what core/src/types.ts defines (plus the declared scrape mirror)', () => {
    const extra = [...uiWithoutScrapeMirrors.keys()].filter((name) => !core.has(name));
    expect(extra).toEqual([]);
  });

  it('does not re-declare a Node-/server-only type that should stay out of the mirror', () => {
    const leaked = [...CORE_ONLY].filter((name) => ui.has(name));
    expect(leaked).toEqual([]);
  });

  it('every mirrored declaration has the same shape as its core/src/types.ts counterpart', () => {
    const mismatches: string[] = [];
    for (const [name, uiShape] of uiWithoutScrapeMirrors) {
      const coreShape = core.get(name);
      if (coreShape !== undefined && coreShape !== uiShape) mismatches.push(name);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('ui/src/lib/types.ts ScrapedArticle mirrors core/src/scrape/index.ts', () => {
  const scrape = exportedDecls(coreScrapePath);
  const ui = exportedDecls(uiTypesPath);

  it('ScrapedArticle exists in both and matches shape', () => {
    expect(scrape.has('ScrapedArticle')).toBe(true);
    expect(ui.has('ScrapedArticle')).toBe(true);
    expect(ui.get('ScrapedArticle')).toBe(scrape.get('ScrapedArticle'));
  });
});
