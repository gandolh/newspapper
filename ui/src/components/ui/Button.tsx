import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "../../lib/cn";
import { HATCH } from "./Marks";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

/** A control on the board: square, flat and shadowless, Archivo at 14 and 700. A button is not a thing waxed down, it
 * is an instruction printed on the surface it sits on; the one exception is `primary`, the one solid chip. A held-out
 * (disabled) button takes the dashed edge and the hatch, the same mark the palette and the posts use. */
const BASE = [
  "relative inline-flex items-center justify-center gap-tight border border-transparent",
  "font-chrome text-body leading-body font-bold tracking-label whitespace-nowrap no-underline select-none",
  "cursor-pointer transition-[background,color,border-color] duration-[120ms] ease-[ease]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-dashed disabled:border-graphite-tint disabled:bg-transparent disabled:bg-(image:--hatch) disabled:text-graphite-soft",
].join(" ");

const VARIANT: Record<ButtonVariant, string> = {
  // The one solid action: graphite, board text.
  primary:
    "border-graphite bg-graphite text-board enabled:hover:border-graphite-deep enabled:hover:bg-graphite-deep enabled:active:bg-graphite-deep",
  // Outlined in the field edge: the ordinary control.
  secondary: "border-field-edge bg-transparent text-graphite enabled:hover:border-graphite enabled:active:bg-board",
  // Printed straight onto the surface.
  ghost: "border-transparent bg-transparent text-graphite-soft enabled:hover:bg-graphite/5 enabled:hover:text-graphite",
  // Grease: the only red, and the only ink that means "this removes".
  danger: "border-grease bg-transparent text-grease enabled:hover:bg-grease enabled:hover:text-board",
};

/** Sizes: small 32, ordinary 38, large 48. The phone's targets are 48 (the `--target` token). */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-[32px] px-snug py-0 text-hint phone:h-(--target)",
  md: "h-[38px] px-[18px] py-0 phone:h-(--target)",
  lg: "h-(--target) px-double py-0",
};

/** The classes of a button, for a link that has to look like one. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return cn(BASE, VARIANT[variant], SIZE[size]);
}

/**
 * A control printed on the board.
 *
 * `loading` is a **mark**, not motion: the button takes the hatch that
 * means "held out" everywhere else in the app, and says the state in words. The label keeps its space so nothing reflows.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonClasses(variant, size), loading && ["cursor-wait", HATCH], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="absolute inset-0 flex items-center justify-center">Working</span>}
      <span className={cn("inline-flex items-center gap-tight", loading && "invisible")}>{children}</span>
    </BaseButton>
  );
}
