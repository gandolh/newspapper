import type { InputHTMLAttributes, ReactNode } from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "../../lib/cn";
import { FIELD_CONTROL, FIELD_ERROR, FIELD_ERROR_BORDER, FIELD_HINT, FIELD_LABEL } from "./fieldLooks";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** An icon laid inside the field's left edge; give the field `pl-[36px]` to clear it. */
  leading?: ReactNode;
  /** Lands on the field wrapper, for the caller's own width. */
  wrapperClassName?: string;
}

export function Input({ label, hint, error, leading, wrapperClassName, className, id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const cls = cn("h-[38px] px-[10px] phone:h-(--target)", FIELD_CONTROL, error && FIELD_ERROR_BORDER, className);

  return (
    <div className={cn("flex flex-col gap-[3px]", wrapperClassName)}>
      {label && (
        <label className={FIELD_LABEL} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute top-[11px] left-[11px] phone:top-[16px]">{leading}</span>
        )}
        <BaseInput
          id={inputId}
          className={cls}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <span id={`${inputId}-err`} className={FIELD_ERROR} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${inputId}-hint`} className={FIELD_HINT}>
          {hint}
        </span>
      )}
    </div>
  );
}
