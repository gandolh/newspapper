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
    // The app's one stylesheet, for the Tailwind rules: an unknown or deprecated class is an error, and so is a
    // class list out of order.
    tailwind: { css: "ui/src/styles/index.css", order: true },
    server: ["api/src", "core/src"],
    // The browser specs and their stubbed API: Playwright, not vitest. The config and the shots spec read the
    // environment for the port, the browser and the screenshot folder.
    playwright: ["e2e/**/*.spec.ts"],
    env: ["**/config.ts", "e2e/playwright.config.ts", "e2e/shots.spec.ts"],
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
  {
    // Tokens only (the closed palette, in styles/index.css): a class that names a colour literal is a lapse.
    name: "newspapper/no-colour-literal-classes",
    files: ["ui/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(?:^|[\\s:])(?:bg|text|border|fill|stroke|ring|outline|shadow|caret|decoration|accent)-\\[(?:#|rgb|hsl|oklch)/]",
          message: "Name a token from @theme (bg-paper, text-graphite), not a colour literal.",
        },
      ],
    },
  },
  {
    // Base UI is imported through a part's subpath (`@base-ui/react/dialog`), never the package root
    // (the base-ui skill's rule 2). check-base-ui reads the same rule; this one fails in the editor.
    name: "newspapper/base-ui-subpaths",
    files: ["ui/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@base-ui/react", message: "Import the part's subpath, such as @base-ui/react/dialog." }],
        },
      ],
    },
  },
];
