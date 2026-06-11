import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

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
 * optional actions slot. Used by History, Sources, Settings, and Prompt so the
 * page-top vocabulary stays identical across the app.
 */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
