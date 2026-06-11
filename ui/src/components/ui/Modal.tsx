import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Width of the modal dialog */
  width?: number | string;
}

/**
 * Modal — Base UI `Dialog` styled with warm-industrial tokens.
 * Base UI provides the focus trap, scroll lock, escape/outside-press dismissal,
 * and portal; the public API (open/onClose/title/width) is unchanged.
 */
export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={styles.dialog}
          style={{ width: typeof width === 'number' ? `${width}px` : width }}
        >
          {title && (
            <div className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close className={styles.close} aria-label="Close dialog">
                ✕
              </Dialog.Close>
            </div>
          )}
          <div className={styles.body}>{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
