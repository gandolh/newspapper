/**
 * The `?` legend: every Reader key, in the existing `Modal` (brief 105, step 9).
 */
import { Modal } from '../ui';
import { READER_KEYS } from './keys';
import styles from './KeyLegend.module.css';

export default function KeyLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width={440}>
      <dl className={styles.list}>
        {READER_KEYS.map((entry) => (
          <div className={styles.row} key={entry.action}>
            <dt className={styles.keys}>
              {entry.keys.map((k, i) => (
                <span key={k} className={styles.combo}>
                  {i > 0 && <span aria-hidden="true">+</span>}
                  <kbd className={styles.kbd}>{k}</kbd>
                </span>
              ))}
            </dt>
            <dd className={styles.label}>{entry.label}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.footnote}>
        Keys do nothing while you are typing in a field. Esc leaves the filter.
      </p>
    </Modal>
  );
}
