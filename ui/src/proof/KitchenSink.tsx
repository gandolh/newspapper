/**
 * The proof sheet, at /kitchen-sink — DEV ONLY.
 *
 * It lives outside `src/pages/` on purpose. Nothing imports this file by
 * path: `ui/vite.config.ts` re-exports it through the `virtual:proof-sheet`
 * module under `vite dev`, and emits `export default null` under
 * `vite build`, so the page is a working surface and never a shipped one.
 * See that file for why.
 */
export { default } from '../components/KitchenSinkIsland';
