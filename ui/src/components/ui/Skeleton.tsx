import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Width — number (px) or any CSS length. Defaults to 100%. */
  width?: number | string;
  /** Height — number (px) or any CSS length. Defaults to 16px. */
  height?: number | string;
  /** Border radius override (number = px). */
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A shimmering placeholder block for loading states. Prefer composing a few of
 * these into the shape of the content being loaded over a centered spinner.
 */
export default function Skeleton({ width = '100%', height = 16, radius, className, style }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
