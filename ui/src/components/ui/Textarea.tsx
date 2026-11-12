import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { FIELD_CONTROL, FIELD_ERROR, FIELD_ERROR_BORDER, FIELD_HINT, FIELD_LABEL } from "./fieldLooks";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  autoGrow?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  autoGrow = true,
  className,
  id,
  value,
  defaultValue,
  onChange,
  ...rest
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  function resize() {
    if (!autoGrow || !ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  });

  const cls = cn(
    "min-h-double resize-y overflow-hidden p-hair leading-[1.55] focus-visible:resize-none",
    FIELD_CONTROL,
    error && FIELD_ERROR_BORDER,
    className,
  );

  return (
    <div className="flex flex-col gap-hair">
      {label && (
        <label className={FIELD_LABEL} htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cls}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          resize();
          onChange?.(e);
        }}
        aria-describedby={error ? `${textareaId}-err` : hint ? `${textareaId}-hint` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${textareaId}-err`} className={FIELD_ERROR} role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${textareaId}-hint`} className={FIELD_HINT}>
          {hint}
        </span>
      )}
    </div>
  );
}
