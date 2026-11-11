import { useRef } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "./Button";
import modalStyles from "./Modal.module.css";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

/**
 * ConfirmDialog — Base UI `AlertDialog`: a question with two answers.
 *
 * An alert dialog is dismissed by an explicit choice, so it has no ✕ and an
 * outside press does nothing; Esc and Cancel close it. While `loading` is true
 * (the request is in flight) nothing closes it, and Cancel is disabled. Cancel
 * has the focus on open, so the safe answer is the one a stray Enter gives.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen || loading) return;
        // The same Escape guard as `Modal`: an Esc a control inside used is not ours.
        if (details.reason === "escape-key" && details.event.defaultPrevented) return;
        onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={modalStyles.backdrop} />
        <AlertDialog.Popup className={modalStyles.dialog} style={{ width: "400px" }} initialFocus={cancelRef}>
          <div className={modalStyles.header}>
            <AlertDialog.Title className={modalStyles.title}>{title}</AlertDialog.Title>
          </div>
          <div className={modalStyles.body}>
            <AlertDialog.Description render={<p />} className={styles.message}>
              {message}
            </AlertDialog.Description>
            <div className={styles.actions}>
              <AlertDialog.Close
                ref={cancelRef}
                render={
                  <Button variant="ghost" disabled={loading}>
                    {cancelLabel}
                  </Button>
                }
              />
              <Button variant={variant} onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
