import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat ESLint config for all three workspaces.
 *
 * Before brief 68 this file enabled *zero* rules: it registered the TypeScript
 * parser and plugin and then switched off the only three rules it named. It
 * also only ever ran against core/ and api/ — see the `lint` script in the root
 * package.json. Both halves of that are fixed here: a real recommended baseline,
 * and ui/ inside the glob.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },

  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // A leading underscore is this repo's existing signal for "required by
      // the signature, deliberately unused" — see the not-implemented stubs in
      // core/src/storage/posts.ts. Honour the convention rather than deleting
      // parameters that shape a public API.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    files: ['ui/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Both of these were 'off' between briefs 68 and 72, which hid ten
      // findings behind a config-level blanket. They are on. Five of those ten
      // sites were restructured; the other five carry an
      // `eslint-disable-next-line` with the reason on the line above it, so the
      // claim is checkable where the code is.
      //
      // Caveat worth knowing: this rule is not exhaustive. The compiler bails
      // out silently on some components and reports nothing inside them — the
      // `SourcesPanel` function in ui/src/components/articles/SourcesPanel.tsx
      // is one; a synchronous setState added to `loadSources` there produces no
      // finding. A clean run means "nothing found", not "nothing there".
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
    },
  },
];
