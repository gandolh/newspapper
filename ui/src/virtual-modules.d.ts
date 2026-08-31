/**
 * Modules that exist only because a Vite plugin makes them.
 *
 * `virtual:proof-sheet` is the dev-only gate on `/kitchen-sink`: under
 * `vite dev` it re-exports the proof sheet, under `vite build` its body is
 * `export default null` and the real module never enters the graph. See the
 * `proofSheet` plugin in `ui/vite.config.ts`.
 */
declare module 'virtual:proof-sheet' {
  import type { ComponentType } from 'react';
  const ProofSheet: ComponentType | null;
  export default ProofSheet;
}
