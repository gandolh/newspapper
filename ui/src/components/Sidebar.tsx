/**
 * The tray and, on a phone, the bottom bar.
 *
 * The tray is the top of the paper band: the wordmark, the four places (each an icon and its label), and the
 * session. The current place is the one pulled forward: board ground and a 2px graphite rule under it. Below 860px
 * the tray thins to a 48px bar (wordmark, API state, Sign out) and the four places move to the bottom bar
 * (`BottomBar`), 64px with the same labels, so a place is always named and never reached by recognising a shape.
 *
 * It is rendered by the layout above every route, so navigation swaps the sheet under it and never unmounts it. The
 * health probe keeps running for the life of the tab.
 */
import { ApiHealthDot } from "./ApiHealthDot";
import { SessionMenu } from "./auth/SessionMenu";
import { Icon, type IconName } from "./ui";
import { Link, usePathname } from "../router";
import { cn } from "../lib/cn";

const navLinks: readonly { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Editor", icon: "board" },
  { href: "/posts", label: "Posts", icon: "stack" },
  { href: "/reader", label: "Reader", icon: "lines" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

function useIsActive(): (href: string) => boolean {
  const path = usePathname();
  return (href) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function Sidebar() {
  const isActive = useIsActive();

  return (
    <div className="flex h-(--tray-h) items-stretch border-b border-hairline phone:h-[48px]">
      <div className="flex min-w-[200px] flex-col justify-center px-gutter phone:min-w-0 phone:px-card">
        <Link href="/" className="flex flex-col text-graphite-deep no-underline" aria-label="newspapper home">
          <span className="font-chrome text-brand leading-[18px] font-extrabold tracking-brand uppercase wdth-brand phone:text-[16px]">
            newspapper
          </span>
          <span className="mt-px font-chrome text-label leading-[14px] font-semibold text-graphite-soft phone:hidden">
            paste-up board
          </span>
        </Link>
      </div>

      <nav className="flex items-stretch phone:hidden" aria-label="Main navigation">
        <ul className="flex items-stretch" role="list">
          {navLinks.map(({ href, label, icon }) => (
            <li className="flex" key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex items-center gap-tight border-l border-hairline px-[20px] font-chrome text-body leading-body font-semibold text-graphite-soft no-underline hover:text-graphite",
                  href === "/settings" && "border-r",
                  isActive(href) &&
                    "bg-board text-graphite after:absolute after:right-0 after:-bottom-px after:left-0 after:h-[2px] after:bg-graphite",
                )}
                aria-current={isActive(href) ? "page" : undefined}
              >
                <Icon name={icon} size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-[18px] px-gutter phone:flex-row-reverse phone:gap-snug phone:px-card">
        <SessionMenu />
        <ApiHealthDot />
      </div>
    </div>
  );
}

/** The phone's four places: 64px, plus the gesture inset, the same labels as the tray. */
export function BottomBar() {
  const isActive = useIsActive();

  return (
    <nav
      className="sticky bottom-0 z-sticky hidden h-[calc(var(--bottom-bar-h)+env(safe-area-inset-bottom,0px))] border-t border-rule bg-paper pb-[env(safe-area-inset-bottom,0px)] shadow-waxed phone:flex"
      aria-label="Places"
    >
      {navLinks.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-[2px] font-chrome text-label leading-label font-semibold text-graphite-soft no-underline",
            isActive(href) &&
              "text-graphite after:absolute after:top-[-1px] after:right-[18%] after:left-[18%] after:h-[2px] after:bg-graphite",
          )}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon name={icon} size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
