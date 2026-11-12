/** The pieces Settings' sections share. */
export const SETTINGS = {
  loading: "flex flex-col gap-half",
  sectionTitle: "mb-[4px] font-chrome text-label font-bold wdth-brand tracking-brand text-graphite uppercase",
  sectionHint: "mb-half max-w-[66ch] text-label leading-[1.45] text-graphite-soft",
  formActions: "mt-half flex justify-end gap-half",
  fields: "flex max-w-[calc(var(--spacing-unit)*14)] flex-col gap-half",
  actions: "mt-half flex flex-wrap gap-half",
  /** A finding, in grease, on a leader rule. */
  problem: "mb-half border-l-2 border-grease pl-half font-galley text-[10px] leading-[1.45] text-grease",
  /** A notice, not a fault. */
  note: "mb-half border-l-2 border-graphite-soft pl-half font-galley text-[10px] leading-[1.45] text-graphite-soft",
} as const;
