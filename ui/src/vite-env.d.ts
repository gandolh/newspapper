/**
 * Vite's build-time constants, spelled out by hand.
 *
 * `vite/client` would declare these, but it also declares `*.css` and the other
 * asset modules that `css-modules.d.ts` already owns here, and two ambient
 * declarations of the same wildcard module do not merge cleanly. The repo
 * writes its own ambient types (see `css-modules.d.ts` and
 * `virtual-modules.d.ts`); this is the third, and it declares only the one
 * member the client actually reads.
 *
 * `BASE_URL` is Vite's echo of the `base` in `ui/vite.config.ts`. `lib/base.ts`
 * is the only module that should read it.
 */
interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The stylesheet test reads what Tailwind generated, as a string. */
declare module "*.css?inline" {
  const css: string;
  export default css;
}

/** The one stylesheet, imported for its side effect (Vite handles the transform). */
declare module "*.css";
