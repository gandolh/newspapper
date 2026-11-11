// The house dependency-cruiser preset, from the vendored house-style copy: no cycles, no unresolvable
// imports, a feature used through its index only, no Fastify in lib/. The UI's `@/` alias is read from
// its tsconfig.
module.exports = {
  extends: "./vendor/house-style/.dependency-cruiser.cjs",
  forbidden: [
    {
      // A Vite plugin makes `virtual:proof-sheet` (ui/vite.config.ts), so no file resolves it.
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "^virtual:" },
    },
    {
      // A warning for now (2026-11-11): api/src/lib/sse.ts types its reply with Fastify's FastifyReply.
      // When the SSE helper takes a structural reply type, or moves out of lib/, this goes and the rule
      // is an error again.
      name: "lib-without-fastify",
      severity: "warn",
    },
  ],
  options: { tsConfig: { fileName: "ui/tsconfig.json" } },
};
