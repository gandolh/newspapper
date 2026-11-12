import type { InputHTMLAttributes } from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "../../lib/cn";
import { FIELD_CONTROL, FIELD_ERROR, FIELD_ERROR_BORDER, FIELD_HINT, FIELD_LABEL } from "./fieldLooks";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const cls = cn("h-unit px-hair", FIELD_CONTROL, error && FIELD_ERROR_BORDER, className);

  return (
    <div className="flex flex-col gap-hair">
      {label && (
        <label className={FIELD_LABEL} htmlFor={inputId}>
          {label}
        </label>
      )}
      <BaseInput
        id={inputId}
        className={cls}
        aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
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
