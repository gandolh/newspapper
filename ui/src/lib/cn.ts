import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, told this app's @theme names (styles/index.css). Without the `text` list it reads `text-label` as a
 * colour, so `cn("text-label", "text-graphite")` would drop one of the two; the other lists do the same for the
 * tracking, leading, shadow, spacing, font and z names. Keep the lists in step with @theme.
 *
 * The sizes carry no line height (a row sets its own with `leading-*`), so a size must not remove a `leading-*`,
 * which tailwind-merge does by default: `cn("leading-label", "text-mark")` keeps both.
 */
const twMerge = extendTailwindMerge<"wdth">({
  extend: {
    theme: {
      text: ["board-title", "head", "section", "brand", "body", "hint", "label", "galley", "field", "mark", "caption"],
      leading: ["board-title", "head", "section", "body", "hint", "label", "galley", "field"],
      tracking: ["board-title", "brand", "label", "field", "mark"],
      shadow: ["waxed", "lifted", "hinged"],
      font: ["chrome", "galley", "slide"],
      spacing: ["hair", "half", "unit", "double", "tight", "snug", "card", "column", "gutter"],
      container: ["content", "narrow"],
    },
    classGroups: {
      z: [{ z: ["pane", "sticky", "ghost", "overlay", "dialog", "popup", "toast"] }],
      wdth: [{ wdth: ["title", "head", "brand", "narrow"] }],
    },
  },
  override: {
    conflictingClassGroups: { "font-size": [] },
  },
});

/** Joins class names, and lets a later class win over an earlier one it conflicts with. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
