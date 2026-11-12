import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[calc(var(--spacing-unit)*12)] flex-col items-center justify-center gap-half px-unit py-double text-center outline-1 outline-offset-[calc(var(--spacing-half)*-1)] outline-tick outline-dashed">
      {icon && (
        <span className="font-galley text-[26px] leading-none text-graphite-soft" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="font-chrome text-board-title leading-board-title font-extrabold tracking-board-title text-graphite wdth-title">
        {title}
      </h2>
      {hint && <p className="max-w-[44ch] text-body text-graphite-soft">{hint}</p>}
      {action && <div className="mt-half">{action}</div>}
    </div>
  );
}
