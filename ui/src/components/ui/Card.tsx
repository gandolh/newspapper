import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
}

const PADDING = { none: "p-0", sm: "p-half", md: "p-unit", lg: "p-double" } as const;

/**
 * A slip waxed to the board. Paper, a hairline, and the hard short shadow offset down-right with zero blur: one of
 * the system's two shadows. Positioned, so a `TissueCorner` or `CropMarks` can be laid on it.
 */
export function Card({ children, padding = "md", className, ...rest }: CardProps) {
  return (
    <div className={cn("relative bg-paper shadow-waxed", PADDING[padding], className)} {...rest}>
      {children}
    </div>
  );
}
