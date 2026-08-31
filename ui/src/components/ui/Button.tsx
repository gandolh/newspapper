import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { HATCH } from './Marks';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

/**
 * A control printed on the board.
 *
 * `loading` is a **mark**, not motion: the button takes the 45° hatch that
 * means "held out" everywhere else in the app, and says the state in the mark
 * face. The label keeps its space so nothing reflows.
 */
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
    loading ? `${styles['btn--loading']} ${HATCH}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <BaseButton className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className={styles.working}>Working</span>}
      <span className={loading ? styles.hiddenText : ''}>{children}</span>
    </BaseButton>
  );
}
