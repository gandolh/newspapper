import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

/**
 * A slip waxed to the board. Paper, a hairline, and the hard short shadow.
 * Positioned, so a `TissueCorner` or `CropMarks` can be laid on it.
 */
export default function Card({
  children,
  padding = 'md',
  className = '',
  ...rest
}: CardProps) {
  const cls = [styles.card, styles[`card--pad-${padding}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
