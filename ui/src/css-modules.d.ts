/**
 * TypeScript declarations for CSS Modules.
 * Astro / Vite handles the actual transform at build time.
 */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
