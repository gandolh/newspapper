# TypeScript + ESLint + Vitest Migration Design

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Full migration of the Newspapper codebase from JavaScript (ES modules) to TypeScript, replacing Jest with Vitest, and configuring ESLint with flat config format using `@typescript-eslint`.

## 1. TypeScript

- **Config:** `tsconfig.json` at root with `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` — required for Node.js ES module compatibility
- **Strictness:** `strict: true`
- **Output:** `outDir: "dist/"`, `rootDir: "src/"`
- **Source:** All `src/**/*.js` renamed to `.ts` including `src/index.js`
- **Imports:** Keep `.js` extensions in import statements (NodeNext resolution requirement)
- **No deep type annotation work** — rename + fix import errors only; type annotations added incrementally

## 2. ESLint

- **Config file:** `eslint.config.js` (flat config, ESLint 9+/10 native format)
- **Parser:** `@typescript-eslint/parser@7.18.0`
- **Plugin:** `@typescript-eslint/eslint-plugin@7.18.0`
- **Target:** `src/**/*.ts`
- **Rules:** `@typescript-eslint/recommended` ruleset as base
- **Script:** `lint` → `eslint src/`

## 3. Vitest

- **Config:** `vitest.config.ts` at root
- **Test location:** Co-located alongside source — `src/**/*.test.ts`
- **Script:** `test` → `vitest run`
- **Replaces:** Jest (removed from devDependencies)

## 4. Package Changes

**Remove:** `jest`  
**Add:** `typescript@5.5.4`, `@typescript-eslint/eslint-plugin@7.18.0`, `@typescript-eslint/parser@7.18.0`, `vitest` (latest)  
**Update scripts:** `test`, `lint`, add `build` (`tsc`)  
**Keep:** `"type": "module"` in package.json

## 5. File Renames

All files in `src/` renamed `.js` → `.ts`:
- `src/index.js` → `src/index.ts`
- `src/commands/scrape.js` → `src/commands/scrape.ts`
- All storage, scrapers, nlp, summarizers, renderer, utils modules

## Success Criteria

- `npm run build` compiles without errors
- `npm run lint` passes
- `npm test` runs (no tests yet, but vitest resolves)
- No runtime breakage of existing module structure
