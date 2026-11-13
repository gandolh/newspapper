/** The pieces Settings' sections share. */
export const SETTINGS = {
  loading: "flex flex-col gap-snug",
  sectionTitle: "mb-[4px] font-chrome text-section leading-section font-extrabold text-graphite-deep wdth-head",
  sectionHint: "mb-snug max-w-[66ch] text-body leading-body text-graphite-soft",
  formActions: "mt-snug flex justify-end gap-tight",
  fields: "flex max-w-[calc(var(--spacing-unit)*14)] flex-col gap-snug",
  actions: "mt-snug flex flex-wrap gap-tight",
  /** A finding, in grease, on a leader rule. */
  problem: "mb-snug border-l-2 border-grease pl-snug font-chrome text-hint leading-hint font-medium text-grease",
  /** A notice, not a fault. */
  note: "mb-snug border-l-2 border-graphite-soft pl-snug font-chrome text-hint leading-hint font-medium text-graphite-soft",
} as const;
