import { useCallback, useMemo, type ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";
import { cn } from "../../lib/cn";
import { Icon } from "./Icon";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

/**
 * ToastProvider / useToast — thin wrapper over Base UI's Toast.
 * The public API (`useToast().addToast(message, variant, duration)`) is unchanged,
 * so existing callers don't need updating; Base UI handles timers, the live region,
 * stacking, swipe-to-dismiss, and animation lifecycle. The viewport sits in a
 * portal, so no ancestor's stacking context can put it under the page.
 * An error toast stays until its Dismiss button is pressed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-card bottom-card z-toast flex w-[calc(100vw-var(--spacing-card)*2)] max-w-[calc(var(--spacing-unit)*15)] flex-col gap-half phone:bottom-[calc(var(--bottom-bar-h)+var(--spacing-card))]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export function useToast(): ToastContextValue {
  const manager = Toast.useToastManager();
  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4000) => {
      // An error stays until it is dismissed, whatever duration the caller gave.
      manager.add({
        title: message,
        type: variant,
        timeout: variant === "error" ? 0 : duration,
        priority: variant === "error" ? "high" : "low",
      });
    },
    [manager],
  );
  return useMemo(() => ({ addToast }), [addToast]);
}

/** The kind, said as a word in the mark face. Never colour alone. */
/** The left rule and the mark word carry the kind; the slip stays paper. */
const RULE: Record<ToastVariant, string> = {
  success: "border-l-graphite",
  error: "border-l-grease",
  info: "border-l-process-blue",
};

const MARK_INK: Record<ToastVariant, string> = {
  success: "",
  error: "text-grease",
  info: "text-process-blue",
};

const MARKS: Record<ToastVariant, string> = {
  success: "Done",
  error: "Failed",
  info: "Note",
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const variant: ToastVariant = (toast.type as ToastVariant) ?? "info";
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "flex items-start gap-snug border-l-[3px] bg-paper p-snug text-graphite shadow-waxed",
          RULE[variant],
        )}
      >
        <span
          className={cn(
            "shrink-0 font-chrome text-label leading-label font-bold text-graphite-soft",
            MARK_INK[variant],
          )}
          aria-hidden="true"
        >
          {MARKS[variant] ?? "Note"}
        </span>
        <Toast.Title className="min-w-0 flex-1 text-body leading-body font-medium" />
        <Toast.Close
          className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-[2px] text-graphite-soft hover:text-graphite"
          aria-label="Dismiss"
        >
          <Icon name="close" />
        </Toast.Close>
      </Toast.Root>
    );
  });
}
