import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import styles from './Button.module.css';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[`btn--${variant}`],
    styles[`btn--${size}`],
    loading ? styles['btn--loading'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <BaseButton className={cls} disabled={disabled || loading} {...rest}>
      {loading && (
        <span className={styles.spinner}>
          <Spinner size={size === 'sm' ? 14 : 16} />
        </span>
      )}
      <span className={loading ? styles.hiddenText : ''}>{children}</span>
    </BaseButton>
  );
}
