import { Select as BaseSelect } from '@base-ui/react/select';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /** Render the popup wider than the trigger when labels are long. */
  popupClassName?: string;
}

/**
 * Select — Base UI `Select` styled with warm-industrial tokens.
 * Replaces the native `<select>` with an accessible, fully styleable listbox.
 * Controlled via `value` + `onValueChange(value)` (was the native `onChange`).
 */
export default function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  id,
  className = '',
  popupClassName = '',
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const triggerCls = [styles.trigger, error ? styles['select--error'] : '', className]
    .filter(Boolean)
    .join(' ');
  const describedBy = error ? `${selectId}-err` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <BaseSelect.Root
        items={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => onValueChange?.((v ?? '') as string)}
        name={name}
        disabled={disabled}
      >
        <BaseSelect.Trigger id={selectId} className={triggerCls} aria-describedby={describedBy}>
          <BaseSelect.Value>
            {(val) => {
              const opt = options.find((o) => o.value === val);
              return opt ? opt.label : <span className={styles.placeholder}>{placeholder ?? ''}</span>;
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon className={styles.chevron}>▾</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner
            className={styles.positioner}
            sideOffset={4}
            alignItemWithTrigger={false}
          >
            <BaseSelect.Popup className={[styles.popup, popupClassName].filter(Boolean).join(' ')}>
              {options.map((opt) => (
                <BaseSelect.Item key={opt.value} value={opt.value} className={styles.item}>
                  <BaseSelect.ItemText className={styles.itemText}>{opt.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className={styles.indicator}>✓</BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      {error && (
        <span id={`${selectId}-err`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${selectId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
