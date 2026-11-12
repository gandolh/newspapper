/**
 * The narrow layout's way back: article → list → rail. Rendered always and
 * shown only below the Reader's narrow breakpoint, where the three panes stack
 * one at a time; on a wide board every pane is already on screen.
 */
export function BackControl({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="hidden h-unit cursor-pointer items-center gap-hair self-start border border-tick bg-paper px-hair font-galley text-field font-bold tracking-mark text-graphite uppercase hover:border-graphite reader-narrow:inline-flex"
      onClick={onClick}
    >
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}
