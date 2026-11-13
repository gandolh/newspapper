import { cn } from "../../lib/cn";

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  label?: string;
  showPercent?: boolean;
  variant?: "default" | "success" | "error";
}

export function ProgressBar({ value, label, showPercent = false, variant = "default" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="flex w-full flex-col gap-hair">
      {(label || showPercent) && (
        <div className="flex items-baseline justify-between gap-hair">
          {label && (
            <span className="font-chrome text-label leading-label font-semibold text-graphite-soft">{label}</span>
          )}
          {showPercent && (
            <span className="font-chrome text-label leading-label font-bold text-graphite tabular-nums">
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-hair w-full overflow-hidden bg-board shadow-[0_0_0_1px_var(--color-tick)]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className={cn(
            "h-full transition-[width] duration-200 ease-[ease]",
            variant === "error" ? "bg-grease" : "bg-graphite",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
