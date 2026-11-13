/**
 * The board: the shell every route but /login renders inside.
 *
 * The paper band (the tray and, under it, the page's document bar) sits across the top; the page's own content
 * fills the rest. On a phone the tray folds into a thin top bar and the four places move to a bottom bar.
 *
 * The tray is rendered here, above every route, so navigation swaps the sheet under it and never unmounts it: the
 * health probe keeps running for the life of the tab.
 */
import { useEffect, type ReactNode } from "react";
import { BottomBar, Sidebar } from "../components/Sidebar";
import { BandProvider, useBandSlot } from "../components/ui";
import { cn } from "../lib/cn";

export function App({
  title = "newspapper",
  width = "default",
  children,
}: {
  title?: string;
  width?: "default" | "fluid";
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — newspapper`;
  }, [title]);

  const [slot, setSlot] = useBandSlot();

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col",
        // The editor and the Reader fill the window: their cards are sized to the viewport and scroll inside.
        width === "fluid" && "h-dvh min-h-[720px] phone:h-auto",
      )}
    >
      <header className="relative z-sticky border-b border-rule bg-paper text-graphite shadow-waxed">
        <Sidebar />
        <div ref={setSlot} />
      </header>

      <BandProvider slot={slot}>
        <main
          className={cn("min-h-0 min-w-0 flex-1", width === "fluid" ? "flex flex-col" : "mx-auto w-full max-w-content")}
        >
          {children}
        </main>
      </BandProvider>

      <BottomBar />
    </div>
  );
}
