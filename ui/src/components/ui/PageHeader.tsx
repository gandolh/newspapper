import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Page title (Display type — 26px/800). */
  title: ReactNode;
  /** Optional one-line description under the title. */
  subtitle?: ReactNode;
  /** Optional actions (buttons) shown opposite the title; wrap below on narrow widths. */
  actions?: ReactNode;
}

/**
 * The standard top-of-page header: a Display title, optional subtitle, and an
 * optional actions slot. Used by History, Sources, and Settings so the
 * page-top vocabulary stays identical across the app.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-unit flex flex-wrap items-end justify-between gap-half border-b-[1.5px] border-graphite pb-half">
      <div className="min-w-0">
        <h1 className="font-chrome text-board-title leading-board-title font-extrabold wdth-title tracking-board-title text-graphite">
          {title}
        </h1>
        {subtitle && <p className="mt-hair max-w-[70ch] text-body text-graphite-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-hair">{actions}</div>}
    </div>
  );
}
