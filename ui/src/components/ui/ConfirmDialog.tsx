import { useRef } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "./Button";
import { DIALOG_LOOKS } from "./dialogLooks";

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
        <AlertDialog.Backdrop className={DIALOG_LOOKS.backdrop} />
        <AlertDialog.Popup className={DIALOG_LOOKS.popup} style={{ width: "400px" }} initialFocus={cancelRef}>
          <div className={DIALOG_LOOKS.header}>
            <AlertDialog.Title className={DIALOG_LOOKS.title}>{title}</AlertDialog.Title>
          </div>
          <div className={DIALOG_LOOKS.body}>
            <AlertDialog.Description
              render={<p />}
              className="mb-card max-w-[62ch] text-body leading-body text-graphite"
            >
              {message}
            </AlertDialog.Description>
            <div className="flex justify-end gap-hair">
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
