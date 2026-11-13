import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

/**
 * The paper band: the tray and the document bar are one surface. The shell (`layouts/App.tsx`) draws the tray and
 * leaves a slot under it; each page puts its own document bar there with `<DocBar>`, so the tray stays mounted
 * across navigation while the bar changes with the page.
 */
const BandSlot = createContext<HTMLElement | null>(null);

export function BandProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <BandSlot.Provider value={slot}>{children}</BandSlot.Provider>;
}

/** A state hook for the slot element, set through a ref callback. */
export function useBandSlot(): [HTMLElement | null, (el: HTMLElement | null) => void] {
  return useState<HTMLElement | null>(null);
}

export interface DocBarProps {
  children: ReactNode;
  className?: string;
}

/** The document bar under the tray: the page's title, its states and its actions. */
export function DocBar({ children, className }: DocBarProps) {
  const slot = useContext(BandSlot);
  const bar = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-[20px] gap-y-snug px-gutter py-[10px] phone:flex-col phone:items-stretch phone:gap-tight phone:px-card phone:pt-[10px] phone:pb-snug",
        className,
      )}
    >
      {children}
    </div>
  );
  // Outside the shell (a test mounting a page alone) the bar stays where it is rendered.
  return slot ? createPortal(bar, slot) : bar;
}

/** The page title, 26px at width 125 (22 on a phone). */
export function BoardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        "min-w-0 font-chrome text-board-title leading-board-title font-extrabold tracking-board-title text-balance text-graphite-deep wdth-title phone:text-[22px] phone:leading-[26px]",
        className,
      )}
    >
      {children}
    </h1>
  );
}
