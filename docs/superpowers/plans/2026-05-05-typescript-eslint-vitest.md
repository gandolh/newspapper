# TypeScript + ESLint + Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all `src/**/*.js` to TypeScript, configure ESLint flat config with `@typescript-eslint`, and replace Jest with Vitest (tests co-located with source).

**Architecture:** Full rename `.js` → `.ts` with NodeNext module resolution. No deep type annotation work — just compile-clean rename + import fixes. ESLint uses flat config (`eslint.config.js`). Vitest replaces Jest with `vitest.config.ts`.

**Tech Stack:** TypeScript 5.5.4, @typescript-eslint/parser + plugin 7.18.0, ESLint 10, Vitest (latest), Node.js ESM

---

## File Map

**Created:**
- `tsconfig.json` — TS compiler config (NodeNext, strict, outDir: dist/)
- `eslint.config.js` — ESLint flat config with @typescript-eslint
- `vitest.config.ts` — Vitest config

**Renamed (`.js` → `.ts`):** All 24 files in `src/`:
- `src/index.js` → `src/index.ts`
- `src/commands/scrape.js` → `src/commands/scrape.ts`
- `src/utils/config.js` → `src/utils/config.ts`
- `src/utils/logger.js` → `src/utils/logger.ts`
- `src/storage/manifest.js` → `src/storage/manifest.ts`
- `src/storage/articles.js` → `src/storage/articles.ts`
- `src/storage/groups.js` → `src/storage/groups.ts`
- `src/storage/summaries.js` → `src/storage/summaries.ts`
- `src/storage/entities.js` → `src/storage/entities.ts`
- `src/storage/sources.js` → `src/storage/sources.ts`
- `src/scrapers/index.js` → `src/scrapers/index.ts`
- `src/scrapers/http-scraper.js` → `src/scrapers/http-scraper.ts`
- `src/scrapers/playwright-scraper.js` → `src/scrapers/playwright-scraper.ts`
- `src/scrapers/rss-parser.js` → `src/scrapers/rss-parser.ts`
- `src/nlp/clustering.js` → `src/nlp/clustering.ts`
- `src/nlp/embeddings.js` → `src/nlp/embeddings.ts`
- `src/nlp/entity-extractor.js` → `src/nlp/entity-extractor.ts`
- `src/renderer/design-loader.js` → `src/renderer/design-loader.ts`
- `src/renderer/html-builder.js` → `src/renderer/html-builder.ts`
- `src/renderer/screenshot.js` → `src/renderer/screenshot.ts`
- `src/summarizers/index.js` → `src/summarizers/index.ts`
- `src/summarizers/llm-summarizer.js` → `src/summarizers/llm-summarizer.ts`
- `src/summarizers/local-summarizer.js` → `src/summarizers/local-summarizer.ts`
- `src/summarizers/template-summarizer.js` → `src/summarizers/template-summarizer.ts`

**Modified:**
- `package.json` — update deps, scripts

---

## Task 1: Install dependencies and update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Jest, add TypeScript + ESLint TS + Vitest**

```bash
cd /home/gandolh/projects/newspapper
npm uninstall jest
npm install --save-dev typescript@5.5.4 @typescript-eslint/eslint-plugin@7.18.0 @typescript-eslint/parser@7.18.0 vitest
```

- [ ] **Step 2: Update scripts in package.json**

Replace the `"scripts"` block with:

```json
"scripts": {
  "start": "node dist/index.js",
  "build": "tsc",
  "scrape": "node dist/commands/scrape.js",
  "group": "node dist/commands/group.js",
  "extract-entities": "node dist/commands/extract-entities.js",
  "query-entities": "node dist/commands/query-entities.js",
  "summarize": "node dist/commands/summarize.js",
  "generate": "node dist/commands/generate.js",
  "export": "node dist/commands/export.js",
  "clean": "node dist/commands/clean.js",
  "list": "node dist/commands/list.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src/",
  "format": "prettier --write src/"
}
```

- [ ] **Step 3: Verify package.json is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
```

Expected: `valid`

---

## Task 2: Create tsconfig.json

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Verify tsc is available**

```bash
npx tsc --version
```

Expected: `Version 5.5.4`

---

## Task 3: Create eslint.config.js

**Files:**
- Create: `eslint.config.js`

- [ ] **Step 1: Write eslint.config.js**

```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
];
```

- [ ] **Step 2: Verify ESLint resolves (no source files yet — expect "no files" not crash)**

```bash
npx eslint src/ 2>&1 | head -5
```

Expected: either silent or "No files matched" — not a module resolution error.

---

## Task 4: Create vitest.config.ts

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Write vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Verify vitest resolves**

```bash
npx vitest run 2>&1 | head -10
```

Expected: `No test files found` or `0 tests` — not a crash.

---

## Task 5: Rename all source files .js → .ts

**Files:** All 24 src files (see File Map above)

- [ ] **Step 1: Rename all files**

```bash
cd /home/gandolh/projects/newspapper
find src -name "*.js" | while read f; do mv "$f" "${f%.js}.ts"; done
```

- [ ] **Step 2: Verify rename**

```bash
find src -name "*.js" | wc -l && find src -name "*.ts" | wc -l
```

Expected: `0` JS files, `24` TS files (or more if any were missed).

---

## Task 6: Fix TypeScript compilation errors

**Files:** Any `.ts` files with type errors

- [ ] **Step 1: Run tsc and capture errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: list of errors to fix (likely `any` implicit types, missing type declarations for some packages).

- [ ] **Step 2: Install missing @types packages if needed**

If tsc reports errors like `Could not find a declaration file for module 'X'`:

```bash
npm install --save-dev @types/lodash @types/node
```

- [ ] **Step 3: Fix implicit `any` errors**

For each error of the form `Parameter 'x' implicitly has an 'any' type`, add explicit `: any` annotation as a minimal fix. Example — if `src/utils/logger.ts` has:

```
error TS7006: Parameter 'message' implicitly has an 'any' type.
```

Change:
```ts
error: (message, ...args) => {
```
To:
```ts
error: (message: string, ...args: unknown[]) => {
```

- [ ] **Step 4: Re-run tsc until clean**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

---

## Task 7: Verify ESLint passes

**Files:** `src/**/*.ts`

- [ ] **Step 1: Run lint**

```bash
npx eslint src/
```

- [ ] **Step 2: Fix any lint errors**

Common issues after TS migration:
- `@typescript-eslint/no-explicit-any` — if too noisy on scaffolded code, add to `eslint.config.js` rules:
  ```js
  '@typescript-eslint/no-explicit-any': 'warn',
  ```
- `@typescript-eslint/no-unused-vars` — add `_` prefix to intentionally unused vars.

- [ ] **Step 3: Re-run lint until clean**

```bash
npx eslint src/
```

Expected: no errors (warnings OK).

---

## Task 8: Write a smoke test for logger

**Files:**
- Create: `src/utils/logger.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger.js';

describe('logger', () => {
  it('exposes error, warn, info, debug, success, step methods', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('calls console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('test error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes — logger already exists)**

```bash
npx vitest run src/utils/logger.test.ts 2>&1
```

Expected: tests pass if logger is correctly typed, or fail with a clear message.

- [ ] **Step 3: Fix any issues until test passes**

```bash
npx vitest run src/utils/logger.test.ts 2>&1
```

Expected: `2 passed`

---

## Task 9: Run full verification and commit

- [ ] **Step 1: Full build**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 2: Full lint**

```bash
npx eslint src/
```

Expected: no errors.

- [ ] **Step 3: Full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Update project-overview.md**

In `.claude/project-overview.md`, update the Technology Stack section to reflect:
- TypeScript 5.5.4 (replaces plain Node.js JS)
- Vitest (replaces Jest)
- ESLint flat config with @typescript-eslint

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate to TypeScript, ESLint flat config, Vitest"
```
