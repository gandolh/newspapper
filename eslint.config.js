import { houseStyle } from "./vendor/house-style/eslint.config.js";

/**
 * The house config from the vendored house-style copy, given Newspapper's folders. Thin on purpose:
 * the compiler is the first gate, and the house adds only what it cannot see. The rules and the
 * reason for each are in the copy.
 *
 * Before 2026-08-31 this file enabled no rules at all, and for a while after it linted two of the
 * three workspaces; the typed rules now read the same tsconfigs the typecheck does, tests included.
 */
export default [
  ...houseStyle({
    root: import.meta.dirname,
    web: "ui/src",
    server: ["api/src", "core/src"],
    // Allowed to print: the seed CLI talks to the person running it, the server entry logs its
    // startup, the Chromium test guard prints its skip banner, and the two loggers are where the
    // app's output goes (core's logger, and the error boundary, which has no logger to call).
    console: [
      "api/src/seed.ts",
      "api/src/server.ts",
      "core/src/render/test-support/chromium.ts",
      "core/src/util/logger.ts",
      "ui/src/components/ErrorBoundary.tsx",
    ],
    // Read through `default` by a runtime contract: the virtual proof-sheet module re-exports the
    // proof sheet's default.
    defaultExports: ["ui/src/proofSheet.ts", "ui/src/proof/KitchenSink.tsx"],
    // docs/ is the Docusaurus workspace, with its own build; data/, output/ and uploads/ are local state.
    ignores: ["docs/**", "data/**", "output/**", "uploads/**", ".claude/**"],
  }),
  {
    // core is a library with readers of its own (the Reader's config, the settings store, the upload
    // directory, the data paths), recorded in scripts/conventions.json. The rule covers the API.
    name: "newspapper/core-reads-env",
    files: ["core/src/**"],
    rules: { "n/no-process-env": "off" },
  },
  {
    // Off since 2026-11-11, until the repo turns on noUncheckedIndexedAccess: without it the rule flags
    // the non-null assertions that indexed reads need.
    name: "newspapper/no-unnecessary-type-assertion-off",
    rules: { "@typescript-eslint/no-unnecessary-type-assertion": "off" },
  },
];
