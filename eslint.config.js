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
    ignores: ['**/dist/**', '**/.astro/**', '**/node_modules/**'],
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

      // The two React Compiler rules below are OFF, and deliberately so.
      // Both flag real patterns, but every fix is a behaviour change to a
      // component, and brief 68 is a tooling brief. `rules-of-hooks` and
      // `exhaustive-deps` — the rules that catch correctness bugs — stay on and
      // pass clean.
      //
      // set-state-in-effect: 8 sites (ApiHealthDot, ArticlesIsland,
      //   SourcesPanel ×2, EditorIsland, ImagePicker, InspectorPane,
      //   SettingsIsland). Each is a load-on-mount or sync-prop-to-draft effect
      //   that would need restructuring.
      // refs: 2 sites (EditorIsland:142,144) — reads of a ref during render.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
];
