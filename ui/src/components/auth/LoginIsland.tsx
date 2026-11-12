import { useState } from "react";
import { Button, Card, Input } from "../ui";
import { useLogin, useSession, useWardSignIn } from "@/lib/auth";
import { nextFromSearch, withBase } from "@/lib/base";
import { Redirect } from "@/router";
import { authMessage, reasonMessage } from "./messages";

/**
 * The sign-in form, and "Sign in with Ward" when the server has Ward
 * configured. There is no register page: an account comes from the operator's
 * seed script or from a first Ward sign-in.
 *
 * Both ways land on the page the person came from (`?next=`, written by
 * `lib/api.ts`'s 401 redirect). A local sign-in flips the shared session state,
 * and the `<Redirect>` below does the navigating, so the form never needs to
 * know the destination twice. Ward's round trip takes the same destination as
 * `returnTo`, as an origin path.
 *
 * Where a message comes from:
 * - the form's own error (`useLogin`), e.g. a wrong password or a lockout;
 * - the button's (`useWardSignIn`), which includes what Ward sent the browser
 *   back with (`?ward_error=access_denied`);
 * - the reason the last session was refused, when a 401 sent the person here
 *   (`?reason=`) or the session probe says so (Ward unreachable).
 */
export function LoginIsland() {
  const session = useSession();
  const { login, pending, error } = useLogin();
  const ward = useWardSignIn();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [next] = useState(() => nextFromSearch(window.location.search));
  const [reason] = useState(() => new URLSearchParams(window.location.search).get("reason"));

  if (session.status === "signed_in") return <Redirect to={next} />;

  const notice = reasonMessage(session.status === "signed_out" ? session.reason : undefined) ?? reasonMessage(reason);
  const wardEnabled = session.status === "signed_out" && session.ward.enabled;

  const shownError = error || ward.error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ward.reset();
    const ok = await login(username, password);
    if (!ok) setPassword("");
  }

  return (
    <div className="w-[calc(var(--spacing-unit)*14)] max-w-full">
      <h1 className="mb-hair font-chrome text-board-title leading-board-title font-extrabold wdth-title tracking-board-title text-graphite">
        newspapper
      </h1>
      <p className="mb-unit font-galley text-field font-medium tracking-field text-graphite-soft uppercase">
        Sign in to continue.
      </p>

      <Card padding="md">
        <form className="flex flex-col gap-half" onSubmit={(e) => void handleSubmit(e)}>
          {notice && !error && !ward.error && (
            <p className="border-l-2 border-graphite-soft pl-half font-galley text-[10px] leading-[1.45] text-graphite-soft">
              {notice}
            </p>
          )}
          {shownError && (
            <p
              className="border-l-2 border-grease pl-half font-galley text-[10px] leading-[1.45] text-grease"
              role="alert"
            >
              {authMessage(shownError)}
            </p>
          )}
          {session.status === "error" && (
            <p
              className="border-l-2 border-grease pl-half font-galley text-[10px] leading-[1.45] text-grease"
              role="alert"
            >
              Could not check whether you are signed in. Reload to try again.
            </p>
          )}

          <Input
            label="Username"
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button className="mt-hair" type="submit" loading={pending}>
            Sign in
          </Button>
        </form>

        {wardEnabled && (
          <div className="mt-half flex flex-col gap-half">
            <p className="flex items-center gap-half font-galley text-field tracking-field text-graphite-soft uppercase before:h-px before:flex-1 before:bg-tick after:h-px after:flex-1 after:bg-tick">
              or
            </p>
            <Button
              variant="secondary"
              className="mt-hair"
              type="button"
              loading={ward.pending}
              onClick={() => {
                void ward.signIn({ returnTo: withBase(next) });
              }}
            >
              Sign in with Ward
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
