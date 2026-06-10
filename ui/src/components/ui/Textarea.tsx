import { useEffect, useRef, type TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  autoGrow?: boolean;
}

export default function Textarea({
  label,
  hint,
  error,
  autoGrow = true,
  className = '',
  id,
  value,
  defaultValue,
  onChange,
  ...rest
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  function resize() {
    if (!autoGrow || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  });

  const cls = [styles.textarea, error ? styles['textarea--error'] : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cls}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          resize();
          onChange?.(e);
        }}
        aria-describedby={error ? `${textareaId}-err` : hint ? `${textareaId}-hint` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${textareaId}-err`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${textareaId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
