import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import styles from "./ChipRow.module.css";

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
   * What choosing a chip does (the base-ui skill's rule 16).
   *
   * - `filter` switches what a list shows and saves nothing: a `RadioGroup`,
   *   where the arrow keys move and choose. A repeat click on the chosen chip
   *   does not fire, and `value` may be `null` ("none of them").
   * - `picker` saves on each choice (the inspector's scales write to the
   *   post): a guarded `ToggleGroup`. Arrow keys only move focus; Space, Enter
   *   or a click chooses. An empty value is ignored, so one chip stays pressed.
   */
  kind: "filter" | "picker";
  /** Every chip takes the same width — what §5 means by "equal chips". */
  equal?: boolean;
  /** Chips run onto a second line instead of squeezing. */
  wrap?: boolean;
  /** Horizontal padding inside a chip. `half` (13px) is the default. */
  pad?: "hair" | "half";
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
 * the Unread / All switch on `/reader`. It is a *row*, and that is the constraint —
 * past roughly six chips it stops reading as a scale and the value wants
 * `Select` instead.
 *
 * There is deliberately no rubylith chip. §5 describes one for a masking value
 * (`Hold out`), but no scale in the Wizard catalogue has such a value, and a
 * variant with no caller is a variant nobody has looked at.
 */
export function ChipRow({
  options,
  value,
  onValueChange,
  label,
  hint,
  disabled,
  kind,
  equal,
  wrap,
  pad = "half",
  ariaLabel,
  className = "",
  id,
}: ChipRowProps) {
  const rowId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint && rowId ? `${rowId}-hint` : undefined;
  const labelId = label && rowId ? `${rowId}-label` : undefined;

  const fieldCls = [styles.field, className].filter(Boolean).join(" ");
  const rowCls = [styles.row, wrap ? styles["row--wrap"] : ""].filter(Boolean).join(" ");
  const chipCls = [styles.chip, equal ? styles["chip--equal"] : "", pad === "hair" ? styles["chip--hair"] : ""]
    .filter(Boolean)
    .join(" ");
  const groupProps = {
    className: rowCls,
    disabled,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabel ? undefined : labelId,
    "aria-describedby": hintId,
  } as const;

  return (
    <div className={fieldCls}>
      {label && (
        <span className={styles.label} id={labelId}>
          {label}
        </span>
      )}
      {kind === "filter" ? (
        <RadioGroup
          {...groupProps}
          value={value}
          onValueChange={(next) => {
            if (typeof next === "string") onValueChange(next);
          }}
        >
          {options.map((option) => (
            <Radio.Root
              key={option.value}
              value={option.value}
              className={chipCls}
              nativeButton
              render={<button type="button" />}
            >
              {option.label ?? option.value}
            </Radio.Root>
          ))}
        </RadioGroup>
      ) : (
        <ToggleGroup
          {...groupProps}
          value={value === null ? [] : [value]}
          onValueChange={(next) => {
            // The guard: an empty group (the pressed chip pressed again) is not a
            // choice, and neither is the value already chosen.
            const chosen = next[0];
            if (chosen !== undefined && chosen !== value) onValueChange(chosen);
          }}
        >
          {options.map((option) => (
            <Toggle key={option.value} value={option.value} className={chipCls}>
              {option.label ?? option.value}
            </Toggle>
          ))}
        </ToggleGroup>
      )}
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
