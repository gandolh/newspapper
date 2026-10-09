import styles from './BackControl.module.css';

/**
 * The narrow layout's way back: article → list → rail. Rendered always and
 * shown only below the Reader's narrow breakpoint, where the three panes stack
 * one at a time; on a wide board every pane is already on screen.
 */
export default function BackControl({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      <span aria-hidden="true">←</span> {label}
    </button>
  );
}
