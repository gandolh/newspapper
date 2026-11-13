/** The Reader's Search and Library views share one clipping card. */
export const CLIPPING = {
  /** PageHeader brings its own bottom margin; the panel's gap replaces it. */
  panel: "flex flex-col gap-card *:first:mb-0",
  resultList: "flex flex-col gap-snug",
  resultCard: "flex flex-col gap-hair",
  resultMeta: "flex items-center gap-snug",
  metaText: "text-label leading-label font-semibold text-graphite-soft tabular-nums",
  externalLink: "ml-auto text-graphite-soft no-underline hover:text-process-blue",
  resultTitle: "font-chrome text-body leading-body font-bold",
  resultExcerpt: "text-hint leading-hint text-graphite-soft",
  resultActions: "mt-[4px] flex justify-end gap-[4px]",
  loadingList: "flex flex-col gap-snug",
  noteForm: "flex flex-col gap-hair",
} as const;
