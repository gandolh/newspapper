/**
 * The dev-only proof sheet: `virtual:proof-sheet`, which the `proofSheet`
 * plugin in ui/vite.config.ts provides (`null` in every production build).
 *
 * One indirection so `routes.tsx` can be imported by a test: the root vitest
 * config does not load that plugin, so the virtual id does not resolve there,
 * and Vite rejects the import before `vi.mock` can stand in for it. A test
 * mocks this module instead (see routes.test.tsx).
 */
export { default } from 'virtual:proof-sheet';
