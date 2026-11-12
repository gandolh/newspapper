import { Select as BaseSelect } from "@base-ui/react/select";
import { cn } from "../../lib/cn";
import { FIELD_ERROR, FIELD_ERROR_BORDER, FIELD_HINT, FIELD_LABEL } from "./fieldLooks";

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
 * Select — Base UI `Select` styled as a board control: square, mono, tick-edged.
 * Replaces the native `<select>` with an accessible, fully styleable listbox.
 * Controlled via `value` + `onValueChange(value)` (was the native `onChange`).
 */
export function Select({
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
  className,
  popupClassName,
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const triggerCls = cn(
    "flex h-unit w-full cursor-pointer items-center justify-between gap-hair border border-tick bg-paper px-hair text-left font-galley text-galley text-graphite transition-[border-color] duration-[120ms] ease-[ease]",
    "hover:border-graphite-tint data-disabled:cursor-not-allowed data-disabled:bg-board data-disabled:text-graphite-soft data-popup-open:border-process-blue",
    error && FIELD_ERROR_BORDER,
    className,
  );
  const describedBy = error ? `${selectId}-err` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-hair">
      {label && (
        <label className={FIELD_LABEL} htmlFor={selectId}>
          {label}
        </label>
      )}
      <BaseSelect.Root
        items={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => onValueChange?.(v ?? "")}
        name={name}
        disabled={disabled}
      >
        <BaseSelect.Trigger id={selectId} className={triggerCls} aria-describedby={describedBy}>
          <BaseSelect.Value>
            {(val) => {
              const opt = options.find((o) => o.value === val);
              return opt ? opt.label : <span className="text-graphite-soft">{placeholder ?? ""}</span>;
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon className="flex shrink-0 items-center text-[10px] text-graphite-soft">▾</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="z-popup" sideOffset={4} alignItemWithTrigger={false}>
            <BaseSelect.Popup
              className={cn(
                "max-h-[min(calc(var(--spacing-double)*6),var(--available-height))] min-w-(--anchor-width) overflow-y-auto bg-paper p-0 shadow-waxed",
                popupClassName,
              )}
            >
              {options.map((opt) => (
                <BaseSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex h-unit cursor-pointer items-center justify-between gap-hair border-b border-hairline px-hair font-galley text-galley text-graphite outline-none select-none last:border-b-0 data-highlighted:not-data-selected:bg-board data-selected:bg-graphite data-selected:text-board"
                >
                  <BaseSelect.ItemText className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {opt.label}
                  </BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="flex shrink-0 items-center text-[10px]">
                    ✓
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      {error && (
        <span id={`${selectId}-err`} className={FIELD_ERROR} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${selectId}-hint`} className={FIELD_HINT}>
          {hint}
        </span>
      )}
    </div>
  );
}
