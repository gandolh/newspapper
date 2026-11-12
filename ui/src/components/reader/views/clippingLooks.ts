/** The Reader's Search and Library views share one clipping card. */
export const CLIPPING = {
  /** PageHeader brings its own bottom margin; the panel's gap replaces it. */
  panel: "flex flex-col gap-unit *:first:mb-0",
  resultList: "flex flex-col gap-half",
  resultCard: "flex flex-col gap-hair",
  resultMeta: "flex items-center gap-half",
  metaText: "font-galley text-field font-medium tracking-field text-graphite-soft uppercase tabular-nums",
  externalLink: "ml-auto text-graphite-soft no-underline hover:text-process-blue",
  resultTitle: "font-chrome text-label leading-label font-bold tracking-label",
  resultExcerpt: "text-label leading-[1.45] text-graphite-soft",
  resultActions: "mt-[4px] flex justify-end gap-[4px]",
  loadingList: "flex flex-col gap-half",
  noteForm: "flex flex-col gap-hair",
} as const;
