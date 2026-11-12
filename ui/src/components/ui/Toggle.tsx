import { Switch } from "@base-ui/react/switch";
import { HATCH } from "./Marks";
import { cn } from "../../lib/cn";

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
  "aria-label"?: string;
}

/**
 * Toggle — Base UI `Switch` styled as a board control: square, mono, tick-edged.
 * Controlled via `checked` + `onCheckedChange(checked)` (was the native `onChange`).
 */
export function Toggle({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  label,
  hint,
  id,
  name,
  className,
  "aria-label": ariaLabel,
}: ToggleProps) {
  const toggleId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const labelId = toggleId ? `${toggleId}-label` : undefined;

  return (
    <div className={cn("flex flex-col gap-hair", className)}>
      <div className="inline-flex items-center gap-half select-none">
        <Switch.Root
          id={toggleId}
          className={cn(
            // A two-position slide switch on a machined track. Square, both ends.
            "group relative inline-flex h-[14px] w-unit shrink-0 cursor-pointer items-center border border-tick bg-paper p-0 transition-[background,border-color] duration-[120ms] ease-[ease]",
            "data-checked:border-graphite data-checked:bg-graphite data-disabled:cursor-not-allowed",
            disabled && HATCH,
          )}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(c) => onCheckedChange?.(c)}
          disabled={disabled}
          name={name}
          aria-label={ariaLabel}
          aria-labelledby={label && !ariaLabel ? labelId : undefined}
        >
          <Switch.Thumb className="absolute top-px left-px size-[10px] bg-graphite-tint transition-[transform,background] duration-[120ms] ease-[ease] group-data-checked:translate-x-[12px] group-data-checked:bg-board" />
        </Switch.Root>
        {label && (
          <label id={labelId} htmlFor={toggleId} className="cursor-pointer text-body text-graphite">
            {label}
          </label>
        )}
      </div>
      {hint && (
        <span className="ml-[calc(var(--spacing-unit)+var(--spacing-half))] font-galley text-[10px] leading-[1.45] text-graphite-soft">
          {hint}
        </span>
      )}
    </div>
  );
}
