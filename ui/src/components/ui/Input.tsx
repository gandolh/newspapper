import type { InputHTMLAttributes } from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export default function Input({ label, hint, error, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const cls = [styles.input, error ? styles['input--error'] : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <BaseInput id={inputId} className={cls} aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined} {...rest} />
      {error && (
        <span id={`${inputId}-err`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
