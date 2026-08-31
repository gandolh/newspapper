import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Width — number (px) or any CSS length. Defaults to 100%. */
  width?: number | string;
  /** Height — number (px) or any CSS length. Defaults to one grid unit. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

/**
 * A placeholder in the shape of the content being loaded: a block ruled at
 * the galley's line pitch, on board, inside a hairline. It is static on
 * purpose — a shimmer would be a third animation, and this world has two.
 */
export default function Skeleton({ width = '100%', height = 26, className, style }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
