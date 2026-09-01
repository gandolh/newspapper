import styles from './ChipRow.module.css';

export interface ChipOption {
  value: string;
  /** Defaults to `value`. The chip sets it uppercase either way. */
  label?: string;
}

export interface ChipRowProps {
  options: ChipOption[];
  /** The active value, or `null` when nothing in the row is chosen. */
  value: string | null;
  onValueChange: (value: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /**
   * The ARIA shape. `toggle` (default) renders `aria-pressed` buttons — a
   * filter, where "none of them" is a real state. `tablist` renders
   * `role="tab"` with `aria-selected`, for a row that switches which panel is
   * on screen.
   */
  behavior?: 'toggle' | 'tablist';
  /** Every chip takes the same width — what §5 means by "equal chips". */
  equal?: boolean;
  /** Chips run onto a second line instead of squeezing. */
  wrap?: boolean;
  /** Horizontal padding inside a chip. `half` (13px) is the default. */
  pad?: 'hair' | 'half';
  /** Labels the row when there is no visible `label`. */
  ariaLabel?: string;
  /** Lands on the field wrapper — for the caller's own margins, nothing else. */
  className?: string;
  id?: string;
}

/**
 * ChipRow — the scale chip row (DESIGN.md §5, Fields).
 *
 * The control for a value that comes from a short, named scale: the
 * inspector's `size`, `align` and `emphasis`, the keyword filter on `/posts`,
 * the panel switch on `/articles`. It is a *row*, and that is the constraint —
 * past roughly six chips it stops reading as a scale and the value wants
 * `Select` instead.
 *
 * There is deliberately no rubylith chip. §5 describes one for a masking value
 * (`Hold out`), but no scale in the Wizard catalogue has such a value, and a
 * variant with no caller is a variant nobody has looked at.
 */
export default function ChipRow({
  options,
  value,
  onValueChange,
  label,
  hint,
  disabled,
  behavior = 'toggle',
  equal,
  wrap,
  pad = 'half',
  ariaLabel,
  className = '',
  id,
}: ChipRowProps) {
  const rowId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const hintId = hint && rowId ? `${rowId}-hint` : undefined;
  const labelId = label && rowId ? `${rowId}-label` : undefined;

  const fieldCls = [styles.field, className].filter(Boolean).join(' ');
  const rowCls = [styles.row, wrap ? styles['row--wrap'] : ''].filter(Boolean).join(' ');
  const chipCls = [
    styles.chip,
    equal ? styles['chip--equal'] : '',
    pad === 'hair' ? styles['chip--hair'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fieldCls}>
      {label && (
        <span className={styles.label} id={labelId}>
          {label}
        </span>
      )}
      <div
        className={rowCls}
        role={behavior === 'tablist' ? 'tablist' : 'group'}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : labelId}
        aria-describedby={hintId}
      >
        {options.map((option) => {
          const active = option.value === value;
          const state =
            behavior === 'tablist'
              ? ({ role: 'tab', 'aria-selected': active } as const)
              : ({ 'aria-pressed': active } as const);
          return (
            <button
              key={option.value}
              type="button"
              className={chipCls}
              disabled={disabled}
              onClick={() => onValueChange(option.value)}
              {...state}
            >
              {option.label ?? option.value}
            </button>
          );
        })}
      </div>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
