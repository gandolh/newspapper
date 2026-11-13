/** The pieces `Input`, `Textarea` and `Select` share. */

/** Field label: 12px sentence-case Archivo at 600, graphite-soft. */
export const FIELD_LABEL = "font-chrome text-label leading-label font-semibold tracking-label text-graphite-soft";

/** A field: a 1px field-edge ring (a 3:1 UI part), paper, Archivo at 14. 38px tall, 48 on a phone. */
export const FIELD_CONTROL = [
  "w-full border border-field-edge bg-paper font-chrome text-body leading-body font-medium text-graphite transition-[border-color] duration-[120ms] ease-[ease]",
  "placeholder:text-graphite-soft placeholder:opacity-100",
  "enabled:hover:border-graphite focus-visible:border-process-blue",
  "disabled:cursor-not-allowed disabled:bg-board disabled:text-graphite-soft",
].join(" ");

export const FIELD_ERROR_BORDER = "border-grease";

export const FIELD_ERROR = "font-chrome text-label leading-label font-semibold text-grease";
export const FIELD_HINT = "font-chrome text-label leading-label font-medium text-graphite-soft";
