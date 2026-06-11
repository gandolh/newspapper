import { Switch } from '@base-ui/react/switch';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Toggle — Base UI `Switch` styled with warm-industrial tokens.
 * Controlled via `checked` + `onCheckedChange(checked)` (was the native `onChange`).
 */
export default function Toggle({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  hint,
  id,
  name,
  className = '',
  'aria-label': ariaLabel,
}: ToggleProps) {
  const toggleId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const labelId = toggleId ? `${toggleId}-label` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <div className={styles.toggle}>
        <Switch.Root
          id={toggleId}
          className={styles.track}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(c) => onCheckedChange?.(c)}
          disabled={disabled}
          name={name}
          aria-label={ariaLabel}
          aria-labelledby={label && !ariaLabel ? labelId : undefined}
        >
          <Switch.Thumb className={styles.thumb} />
        </Switch.Root>
        {label && (
          <label id={labelId} htmlFor={toggleId} className={styles.label}>
            {label}
          </label>
        )}
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
