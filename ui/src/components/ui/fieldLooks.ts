/** The pieces `Input` and `Textarea` share. */

/** Field label: 9px mono, uppercase, tracked. A dimension callout, not a sentence. */
export const FIELD_LABEL =
  "font-galley text-field leading-field font-medium tracking-field text-graphite-soft uppercase";

/** The value is data, so it is set in the galley face. */
export const FIELD_CONTROL = [
  "w-full border border-tick bg-paper font-galley text-galley text-graphite transition-[border-color] duration-[120ms] ease-[ease]",
  "placeholder:text-graphite-soft placeholder:opacity-100",
  "enabled:hover:border-graphite-tint focus-visible:border-process-blue",
  "disabled:cursor-not-allowed disabled:bg-board disabled:text-graphite-soft",
].join(" ");

export const FIELD_ERROR_BORDER = "border-rubylith";

export const FIELD_ERROR = "font-galley text-[10px] leading-[1.45] text-rubylith-ink";
export const FIELD_HINT = "font-galley text-[10px] leading-[1.45] text-graphite-soft";
