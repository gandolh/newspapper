import { cn } from "../../lib/cn";
import { Link } from "@/router";
import { useLogout, useSession } from "@/lib/auth";
import { withBase } from "@/lib/base";

const SESSION =
  "flex items-center gap-[18px] font-chrome text-body leading-body font-semibold phone:gap-snug phone:text-hint";
/** Sign in and sign out: a button or a link set as an underlined word. */
const LINK =
  "shrink-0 cursor-pointer border-none bg-transparent p-0 [font:inherit] text-graphite underline decoration-1 underline-offset-[3px] hover:not-disabled:text-graphite-deep phone:flex phone:min-h-[44px] phone:items-center";

/**
 * Who is signed in, and the way out: the tray's session compartment.
 *
 * With no session it shows the way in: a link to the app's own login page.
 * Signing out ends this app's session only. Ending the Ward session as well
 * ("sign out of Ward too") is in Settings, where the Ward account is managed.
 *
 * `useSession` probes `GET /api/auth/session`, which is public and answers
 * `user: null` for a signed-out browser, so this component renders on every
 * page without the 401 redirect firing before the page it asked for has had a
 * chance to render anything.
 */
export function SessionMenu() {
  const session = useSession();
  const { logout, pending } = useLogout();

  if (session.status !== "signed_in") {
    // Nothing until the probe answers: no flash of "Sign in" on a signed-in page.
    if (session.status === "loading") return null;
    return (
      <span className={SESSION}>
        <Link className={LINK} href="/login">
          Sign in
        </Link>
      </span>
    );
  }

  async function signOut() {
    if (await logout()) window.location.assign(withBase("/login"));
  }

  return (
    <span className={SESSION}>
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap text-graphite-soft phone:hidden"
        title={session.user.username}
      >
        {session.user.username}
      </span>
      <button
        type="button"
        className={cn(LINK, "disabled:cursor-default disabled:text-graphite-soft")}
        disabled={pending}
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </span>
  );
}
