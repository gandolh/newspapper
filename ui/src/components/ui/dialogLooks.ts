/** What `Modal` and `ConfirmDialog` share: a slip waxed over the board. A dialog has to pick one of the two shadows,
 * and takes the hard short one, never an ambient glow. */
export const DIALOG_LOOKS = {
  backdrop: "fixed inset-0 z-overlay bg-graphite/32",
  popup:
    "fixed top-1/2 left-1/2 z-dialog max-h-[calc(100vh-var(--spacing-double))] max-w-[calc(100vw-var(--spacing-double))] -translate-1/2 overflow-y-auto bg-paper shadow-waxed",
  header: "flex items-center justify-between gap-half border-b-[1.5px] border-graphite px-unit py-half",
  title: "font-chrome text-label font-bold wdth-brand tracking-brand text-graphite uppercase",
  body: "p-unit",
} as const;
