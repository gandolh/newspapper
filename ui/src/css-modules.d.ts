/**
 * TypeScript declarations for stylesheet imports. Vite handles the actual
 * transform at build time; these only tell `tsc` the imports are legal.
 *
 * Astro used to supply the plain `*.css` half through its generated
 * `.astro/types.d.ts`. It is spelled out here now.
 */
declare module '*.css';

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
