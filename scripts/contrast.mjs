/**
 * Contrast over the built tokens: every text and icon pair of the Contact sheet, in both themes, read from
 * `ui/src/styles/index.css` (the `@theme static` block for light, the `:root[data-theme="dark"]` block for dark).
 * Text pairs need 4.5:1; a UI part (an edge, an icon, the focus ring) needs 3:1; a surface against the ground needs
 * to read at 1.09 or carry an edge. Translucent tokens (the tissue, the grid) are composited over the board.
 *
 *   node scripts/contrast.mjs
 *
 * Exits 1 when a pair fails, so it can sit in a gate. Not read by the app and not a test: it measures the stylesheet.
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../ui/src/styles/index.css", import.meta.url), "utf8");

function block(startMarker) {
  const start = css.indexOf(startMarker);
  if (start < 0) throw new Error(`no ${startMarker} in the stylesheet`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("unbalanced block");
}

function colours(text) {
  const out = {};
  for (const m of text.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = colours(block("@theme static"));
const dark = { ...light, ...colours(block(':root[data-theme="dark"]')) };

function parse(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 };
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value);
  if (rgba) return { rgb: [+rgba[1], +rgba[2], +rgba[3]], a: rgba[4] === undefined ? 1 : +rgba[4] };
  throw new Error(`cannot read ${value}`);
}

/** The solid colour a token paints over the board. */
function solid(map, name) {
  const { rgb, a } = parse(map[name]);
  if (a === 1) return rgb;
  const board = parse(map["board"]).rgb;
  return rgb.map((c, i) => Math.round(c * a + board[i] * (1 - a)));
}

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// [what it is, foreground token, background token, the ratio it needs]
const PAIRS = [
  ["graphite on paper (galley, body)", "graphite", "paper", 4.5],
  ["graphite on board (leader, slide name)", "graphite", "board", 4.5],
  ["graphite on tissue (inspector)", "graphite", "tissue", 4.5],
  ["graphite-deep on paper (titles, wordmark)", "graphite-deep", "paper", 4.5],
  ["graphite-soft on board (labels on the stage)", "graphite-soft", "board", 4.5],
  ["graphite-soft on paper (labels, hints, counts, placeholders)", "graphite-soft", "paper", 4.5],
  ["graphite-soft on tissue (inspector labels)", "graphite-soft", "tissue", 4.5],
  ["process-blue on paper (prop values, check and pulse icons)", "process-blue", "paper", 4.5],
  ["process-blue on tissue (check icons in the inspector)", "process-blue", "tissue", 4.5],
  ["grease on paper (Delete, errors, lint)", "grease", "paper", 4.5],
  ["grease on board (an error under a field on the board)", "grease", "board", 4.5],
  ["grease on tissue (an error in the inspector)", "grease", "tissue", 4.5],
  ["wax-ink on wax (the galley's selected element)", "wax-ink", "wax", 4.5],
  ["board on graphite (Render, the post.wzd tab, the current caption, the chosen pane)", "board", "graphite", 4.5],
  ["field-edge on paper (input, select, outlined buttons)", "field-edge", "paper", 3],
  ["field-edge on tissue (inspector fields)", "field-edge", "tissue", 3],
  ["field-edge on board (an outlined button on the stage)", "field-edge", "board", 3],
  ["focus ring (process-blue) on board", "process-blue", "board", 3],
  ["focus ring (process-blue) on paper", "process-blue", "paper", 3],
  ["focus ring (process-blue) on tissue", "process-blue", "tissue", 3],
  ["graphite-tint on paper (hatch, dashed edges; UI part)", "graphite-tint", "paper", 3],
  ["tissue-edge on board (the inspector's edge; needs 1.3)", "tissue-edge", "board", 1.3],
  ["paper on board (a card against the page; needs 1.09 or an edge)", "paper", "board", 1.09],
  ["tissue on board (needs 1.09 or an edge)", "tissue", "board", 1.09],
  ["hairline on board (a card's 1px edge; needs 1.3)", "hairline", "board", 1.3],
];

let failures = 0;
const rows = PAIRS.map(([label, fg, bg, need]) => {
  const l = ratio(solid(light, fg), solid(light, bg));
  const d = ratio(solid(dark, fg), solid(dark, bg));
  const ok = l >= need && d >= need;
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${l.toFixed(2).padStart(5)} ${d.toFixed(2).padStart(5)}  >= ${need}  ${label}`);
  return { need, l, d };
});

const min = (need, key) => Math.min(...rows.filter((r) => r.need === need).map((r) => r[key])).toFixed(2);
console.log(
  `${rows.length} pairs, ${failures} fail. Text minimum: light ${min(4.5, "l")}, dark ${min(4.5, "d")}. UI parts and the focus ring: light ${min(3, "l")}, dark ${min(3, "d")}.`,
);
process.exit(failures ? 1 : 0);
