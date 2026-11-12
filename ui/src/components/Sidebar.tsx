/**
 * The tray.
 *
 * A full-width 78px strip across the top of the board, closed by a 1.5px
 * graphite rule and divided into compartments by 1px rules. Every compartment
 * is a **showing**: it renders the thing the route produces — a board inside
 * crop marks, a stack of boards, a column of clippings, a scale-chip row —
 * with a 9px mono caption under it. You pick a route by recognising its shape.
 *
 * The current compartment is the one pulled forward: it takes paper and the
 * waxed shadow, the same mark a selected node takes (DESIGN.md §5). No fill,
 * no accent colour, no pill.
 *
 * It used to carry `transition:persist` to survive an Astro view transition.
 * It no longer needs to: the tray is rendered by the layout above every route,
 * so navigation swaps the sheet under it and never unmounts the strip. The
 * health probe keeps running for the life of the tab.
 */
import { ApiHealthDot } from "./ApiHealthDot";
import { SessionMenu } from "./auth/SessionMenu";
import { Link, usePathname } from "../router";
import { cn } from "../lib/cn";

const navLinks = [
  { href: "/", caption: "Editor", showing: "board" },
  { href: "/posts", caption: "Posts", showing: "stack" },
  // The Articles compartment until 2026-10-09. The showing stayed: the Reader
  // is still where clippings come from.
  { href: "/reader", caption: "Reader", showing: "clipping" },
  { href: "/settings", caption: "Settings", showing: "chips" },
];

export function Sidebar() {
  const path = usePathname();
  function isActive(href: string): boolean {
    if (href === "/") return path === "/";
    return path.startsWith(href);
  }

  return (
    <nav
      className={cn(
        "sticky top-0 z-sticky flex h-(--tray-h) w-full items-stretch border-b-[1.5px] border-graphite bg-board",
        // Below 640px one course stops fitting: the brand block, four 78px compartments and the session cell want
        // more strip than a phone has. The strip stays 78px (3 x 26) and divides into two courses: one unit of head
        // carrying the wordmark and the session, two units of compartments under it. A compartment is a share of
        // its course, not a width it claims, so nothing is pushed off the edge.
        "max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:grid-rows-[var(--spacing-unit)_1fr] max-sm:[grid-template-areas:'brand_session'_'nav_nav']",
      )}
      aria-label="Main navigation"
    >
      <div className="flex shrink-0 flex-col justify-center gap-hair border-r border-rule px-unit text-graphite no-underline max-md:px-half max-sm:min-w-0 max-sm:overflow-hidden max-sm:border-r-0 max-sm:[grid-area:brand]">
        <Link href="/" className="flex flex-col gap-[2px] text-graphite no-underline" aria-label="newspapper home">
          <span className="font-chrome text-brand leading-[1.2] font-extrabold tracking-brand uppercase wdth-brand">
            newspapper
          </span>
          <span className="font-galley text-field font-medium tracking-field text-graphite-soft uppercase max-md:hidden">
            paste-up board
          </span>
        </Link>
      </div>

      <ul
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto max-sm:border-t max-sm:border-rule max-sm:[grid-area:nav]"
        role="list"
      >
        {navLinks.map(({ href, caption, showing }) => (
          <li className="flex max-sm:min-w-double max-sm:flex-[1_1_0]" key={href}>
            <Link
              href={href}
              className={cn(
                "flex w-[104px] shrink-0 flex-col items-center justify-center gap-hair border-r border-rule px-half text-graphite-soft no-underline hover:text-graphite max-md:w-[78px] max-sm:w-full max-sm:overflow-hidden max-sm:px-hair",
                // The compartment pulled forward: paper, waxed down.
                isActive(href) && "bg-paper text-graphite shadow-waxed",
              )}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <span
                className="block size-[30px] max-sm:size-unit [&_svg]:size-[30px] max-sm:[&_svg]:size-unit"
                aria-hidden="true"
              >
                {showing === "board" && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M6 3v3M3 6h3M24 3v3M27 6h-3M6 27v-3M3 24h3M24 27v-3M27 24h-3" />
                    <rect x="8" y="8" width="14" height="14" strokeWidth="1.5" />
                    <path d="M11 13h8M11 17h5" strokeWidth="1.5" />
                  </svg>
                )}
                {showing === "stack" && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="9" width="12" height="12" />
                    <rect x="9" y="6" width="12" height="12" />
                    <rect x="15" y="3" width="12" height="12" strokeWidth="1.5" />
                  </svg>
                )}
                {showing === "clipping" && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 6h24M3 11h18M3 16h21M3 21h11" />
                    <path d="M20 23l4 4M24 23l-4 4" strokeWidth="1" />
                  </svg>
                )}
                {showing === "chips" && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="2" y="11" width="7" height="8" />
                    <rect x="11.5" y="11" width="7" height="8" fill="currentColor" />
                    <rect x="21" y="11" width="7" height="8" />
                  </svg>
                )}
              </span>
              <span
                className={cn(
                  "font-galley text-field font-medium tracking-field uppercase max-sm:max-w-full max-sm:overflow-hidden max-sm:text-ellipsis max-sm:whitespace-nowrap",
                  isActive(href) && "font-bold text-graphite",
                )}
              >
                {caption}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="ml-auto flex min-w-[calc(var(--spacing-unit)*6)] shrink-0 flex-col justify-center gap-hair border-l border-rule px-half max-sm:ml-0 max-sm:min-w-0 max-sm:flex-row max-sm:items-center max-sm:gap-half max-sm:px-hair max-sm:[grid-area:session]">
        <SessionMenu />
        <ApiHealthDot />
      </div>
    </nav>
  );
}
