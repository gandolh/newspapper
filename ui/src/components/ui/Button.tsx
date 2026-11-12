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

/** A control on the board: square, flat and shadowless. A button is not a thing waxed down, it is an instruction
 * printed on the surface it sits on; the one exception is `primary`, the inverted chip. */
const BASE = [
  "relative inline-flex items-center justify-center gap-hair border border-transparent",
  "font-chrome text-label leading-none font-bold tracking-label whitespace-nowrap no-underline select-none",
  "cursor-pointer transition-[background,color,border-color] duration-[120ms] ease-[ease]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-tick disabled:bg-transparent disabled:text-graphite-soft",
].join(" ");

const VARIANT: Record<ButtonVariant, string> = {
  // The inverted chip: solid graphite, board text.
  primary: "border-graphite bg-graphite text-board enabled:hover:border-graphite-deep enabled:hover:bg-graphite-deep",
  // Paper with a tick edge: the ordinary control.
  secondary: "border-tick bg-paper text-graphite enabled:hover:border-graphite",
  // Printed straight onto the board.
  ghost: "border-transparent bg-transparent text-graphite-soft enabled:hover:bg-graphite/5 enabled:hover:text-graphite",
  // Rubylith: the masking ink, and the only ink that means "this removes".
  danger:
    "border-rubylith bg-paper text-rubylith-ink enabled:hover:border-rubylith-ink enabled:hover:bg-rubylith-ink enabled:hover:text-board",
};

/** Sizes: 1, 1.5 and 2 units of the 26px grid. */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-unit px-half py-0 text-[12px]",
  md: "h-[39px] px-unit py-0",
  lg: "h-double px-double py-0 text-body",
};

/** The classes of a button, for a link that has to look like one. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return cn(BASE, VARIANT[variant], SIZE[size]);
}

/**
 * A control printed on the board.
 *
 * `loading` is a **mark**, not motion: the button takes the 45° hatch that
 * means "held out" everywhere else in the app, and says the state in the mark
 * face. The label keeps its space so nothing reflows.
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
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center font-galley text-mark font-bold tracking-mark uppercase">
          Working
        </span>
      )}
      <span className={loading ? "invisible" : ""}>{children}</span>
    </BaseButton>
  );
}
