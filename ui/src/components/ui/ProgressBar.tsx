import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  label?: string;
  showPercent?: boolean;
  variant?: 'default' | 'success' | 'error';
}

export default function ProgressBar({
  value,
  label,
  showPercent = false,
  variant = 'default',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={styles.container}>
      {(label || showPercent) && (
        <div className={styles.meta}>
          {label && <span className={styles.label}>{label}</span>}
          {showPercent && <span className={styles.percent}>{clamped}%</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={[styles.fill, styles[`fill--${variant}`]].join(' ')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
