// The house dependency-cruiser preset, from the vendored house-style copy: no cycles, no unresolvable
// imports, a feature used through its index only, no Fastify in lib/. The UI's `@/` alias is read from
// its tsconfig.
module.exports = {
  extends: "./vendor/house-style/.dependency-cruiser.cjs",
  options: { tsConfig: { fileName: "ui/tsconfig.json" } },
};
