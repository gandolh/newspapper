import { useRef, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import styles from "./Modal.module.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog for a screen reader, so it is required. */
  title: string;
  children: ReactNode;
  /** Width of the modal dialog */
  width?: number | string;
  /**
   * An outside press closes the dialog (default). A dialog that holds a form
   * sets `false`, so a stray tap on the backdrop cannot throw the draft away;
   * it then closes with the ✕ or Esc.
   */
  dismissOnBackdrop?: boolean;
}

/** A file input is hidden behind an Upload button, so it never takes the focus. */
const FIELDS = "input:not(:disabled):not([type=file]), select:not(:disabled), textarea:not(:disabled)";
const BUTTONS = "button:not(:disabled)";

/**
 * Modal — Base UI `Dialog` as a slip waxed over the board.
 * Base UI provides the focus trap, scroll lock, outside-press dismissal and
 * portal. Two things are added here (the base-ui skill's rule 12):
 *
 * - **The Escape guard.** Base UI's Esc listener does not look at
 *   `defaultPrevented`, so an Esc that a control inside already used would also
 *   close the dialog. A control that uses Esc calls `preventDefault()` on its
 *   keydown, and the close is skipped.
 * - **Initial focus** goes to the first `[data-autofocus]` inside, else the
 *   body's first field, else the body's first button, else the dialog itself (a
 *   reference card with nothing to press): never the close button, which is what
 *   Base UI's first-tabbable default picks.
 */
export function Modal({ open, onClose, title, children, width = 480, dismissOnBackdrop = true }: ModalProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal={!dismissOnBackdrop}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) return;
        if (details.reason === "escape-key" && details.event.defaultPrevented) return;
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          ref={popupRef}
          className={styles.dialog}
          style={{ width: typeof width === "number" ? `${width}px` : width }}
          initialFocus={() =>
            popupRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
            bodyRef.current?.querySelector<HTMLElement>(FIELDS) ??
            bodyRef.current?.querySelector<HTMLElement>(BUTTONS) ??
            popupRef.current ??
            true
          }
        >
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="Close dialog">
              ✕
            </Dialog.Close>
          </div>
          <div ref={bodyRef} className={styles.body}>
            {children}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
