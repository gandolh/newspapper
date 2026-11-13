import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[calc(var(--spacing-unit)*9)] flex-col items-center justify-center gap-tight border border-dashed border-graphite-tint px-column py-[48px] text-center">
      {icon && (
        <span className="text-graphite-soft" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="font-chrome text-head leading-head font-extrabold text-graphite-deep wdth-head">{title}</h2>
      {hint && <p className="max-w-[44ch] text-body leading-body text-graphite-soft">{hint}</p>}
      {action && <div className="mt-tight">{action}</div>}
    </div>
  );
}
