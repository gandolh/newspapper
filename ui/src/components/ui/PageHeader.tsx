import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Section title (20px, 800, width 112). */
  title: ReactNode;
  /** Optional one-line description under the title. */
  subtitle?: ReactNode;
  /** Optional actions (buttons) shown opposite the title; wrap below on narrow widths. */
  actions?: ReactNode;
}

/**
 * The header of a view inside a card: a title, an optional subtitle, and an optional actions slot. The page's own
 * title lives in the band (`DocBar`).
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-snug flex flex-wrap items-end justify-between gap-snug border-b border-hairline pb-snug">
      <div className="min-w-0">
        <h2 className="font-chrome text-head leading-head font-extrabold text-graphite-deep wdth-head">{title}</h2>
        {subtitle && <p className="mt-[2px] max-w-[70ch] text-body leading-body text-graphite-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-tight">{actions}</div>}
    </div>
  );
}
