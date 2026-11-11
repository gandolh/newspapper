import preset from "./vendor/house-style/knip.json" with { type: "json" };

// knip has no `extends`, so this spreads the house preset. The Docusaurus workspace has its own
// build and conventions; Ward's generated copies sit under vendor/, which the preset ignores.
export default {
  ...preset,
  ignoreWorkspaces: ["docs"],
  workspaces: { ".": { entry: ["scripts/*.mjs"] } },
};
