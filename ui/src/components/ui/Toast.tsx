import { useCallback, useMemo, type ReactNode } from 'react';
import { Toast } from '@base-ui/react/toast';
import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
  ) => void;
}

/**
 * ToastProvider / useToast — thin wrapper over Base UI's Toast.
 * The public API (`useToast().addToast(message, variant, duration)`) is unchanged,
 * so existing callers don't need updating; Base UI handles timers, the live region,
 * stacking, swipe-to-dismiss, and animation lifecycle.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Viewport className={styles.region}>
        <ToastList />
      </Toast.Viewport>
    </Toast.Provider>
  );
}

export function useToast(): ToastContextValue {
  const manager = Toast.useToastManager();
  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      manager.add({ title: message, type: variant, timeout: duration });
    },
    [manager],
  );
  return useMemo(() => ({ addToast }), [addToast]);
}

/** The kind, said as a word in the mark face. Never colour alone. */
const MARKS: Record<ToastVariant, string> = {
  success: 'Done',
  error: 'Failed',
  info: 'Note',
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const variant: ToastVariant = (toast.type as ToastVariant) ?? 'info';
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={[styles.toast, styles[`toast--${variant}`]]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={styles.toastIcon} aria-hidden="true">
          {MARKS[variant] ?? 'Note'}
        </span>
        <Toast.Title className={styles.toastMessage} />
        <Toast.Close className={styles.toastClose} aria-label="Dismiss">
          ✕
        </Toast.Close>
      </Toast.Root>
    );
  });
}
