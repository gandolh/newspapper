/**
 * The board — the shell every route but /login renders inside.
 *
 * Was `App.astro`. The two Astro-shaped things it carried are gone rather
 * than replaced: `<ClientRouter/>` and the tray's `transition:persist` both
 * existed to keep the tray mounted across a navigation, and in an SPA the
 * tray is simply never unmounted.
 */
import { useEffect, type ReactNode } from "react";
import { Sidebar } from "../components/Sidebar";
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

  // Every sheet lands on the same column, and the column is a whole number of grid units wide (The One Grid Rule).
  // Fluid sheets, the editor, take the board.
  const sheet = cn("mx-auto", width === "fluid" ? "max-w-none" : "max-w-content");

  return (
    <div className="flex min-h-screen flex-col">
      {/* The tray: a full-width strip across the top of the board. */}
      <Sidebar />

      <main className="min-w-0 flex-1 p-unit max-md:p-half">
        <div className={sheet}>{children}</div>
      </main>
    </div>
  );
}
