import type { InputHTMLAttributes } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  hint?: string;
}

export default function Toggle({ label, hint, className = '', id, ...rest }: ToggleProps) {
  const toggleId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.toggle} htmlFor={toggleId}>
        <input type="checkbox" id={toggleId} className={styles.input} {...rest} />
        <span className={styles.track}>
          <span className={styles.thumb} />
        </span>
        {label && <span className={styles.label}>{label}</span>}
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
