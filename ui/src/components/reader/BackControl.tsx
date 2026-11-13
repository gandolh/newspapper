import { Button, Icon } from "../ui";

/**
 * The narrow layout's way back: article → list → rail. Rendered always and
 * shown only below the Reader's narrow breakpoint, where the three panes stack
 * one at a time; on a wide board every pane is already on screen.
 */
export function BackControl({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" className="hidden self-start reader-narrow:inline-flex" onClick={onClick}>
      <Icon name="back" />
      {label}
    </Button>
  );
}
