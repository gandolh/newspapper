import { useRef, useState } from "react";
import { Button, Card, Input, Skeleton, useToast } from "../ui";
import {
  useChangePassword,
  useLogout,
  useRenameUser,
  useSession,
  useSetLocalPassword,
  useWardLink,
  useWardSignOut,
  useWardUnlink,
} from "@/lib/auth";
import { withBase } from "@/lib/base";
import { Redirect } from "@/router";
import { authMessage } from "../auth/messages";
import { SETTINGS } from "./settingsLooks";

/**
 * The account half of Settings: who you are, the local password, the Ward link
 * and signing out. Each card is its own component, because each owns hooks that
 * must not run for a user they do not apply to (a Ward-only user has no
 * password to change; an app without Ward configured has no link to manage).
 *
 * The library supplies state and handlers and nothing visible; every sentence
 * here comes from `authMessage`, so the wording matches the login page.
 */
export function AccountSection() {
  const session = useSession();

  if (session.status === "loading") {
    return (
      <Card>
        <div className={SETTINGS.loading}>
          <Skeleton height={26} width="40%" />
          <Skeleton height={26} />
        </div>
      </Card>
    );
  }
  // A session that ended while the page was open (Ward revoked it, or it was
  // unlinked) goes back to the form rather than showing an account that is gone.
  if (session.status === "signed_out") return <Redirect to="/login" />;
  if (session.status === "error") {
    return (
      <Card>
        <h2 className={SETTINGS.sectionTitle}>Account</h2>
        <p className={SETTINGS.problem} role="alert">
          {authMessage(session.error)}
        </p>
      </Card>
    );
  }

  const { user, session: info, ward } = session;
  return (
    <>
      <Card>
        <h2 className={SETTINGS.sectionTitle}>Account</h2>
        <p className={SETTINGS.sectionHint}>
          Signed in as <strong>{user.username}</strong> ({user.role}),{" "}
          {info.origin === "ward" ? "through Ward" : "with your password"}.
        </p>
        <SignOutRow viaWard={info.origin === "ward"} />
      </Card>

      <ChangeUsernameCard current={user.username} />
      {user.hasPassword ? <ChangePasswordCard /> : <SetPasswordCard />}
      {ward.enabled && <WardCard linked={ward.linked} hasPassword={user.hasPassword} />}
    </>
  );
}

function SignOutRow({ viaWard }: { viaWard: boolean }) {
  const { logout, pending } = useLogout();
  const out = useWardSignOut();

  async function signOutHere() {
    if (await logout()) window.location.assign(withBase("/login"));
  }

  return (
    <>
      {out.error && (
        <p className={SETTINGS.problem} role="alert">
          {authMessage(out.error, "ward")}
        </p>
      )}
      <div className={SETTINGS.actions}>
        <Button variant="secondary" loading={pending} onClick={() => void signOutHere()}>
          Sign out
        </Button>
        {viaWard && (
          <Button variant="ghost" loading={out.pending} onClick={() => void out.signOut()}>
            Sign out of Ward too
          </Button>
        )}
      </div>
    </>
  );
}

function ChangePasswordCard() {
  const { addToast } = useToast();
  const { changePassword, pending, error, reset } = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (await changePassword(current, next)) {
      setCurrent("");
      setNext("");
      addToast("Password changed", "success");
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <h2 className={SETTINGS.sectionTitle}>Password</h2>
        <p className={SETTINGS.sectionHint}>Changing it signs out every other session of yours on this app.</p>
        {error && (
          <p className={SETTINGS.problem} role="alert">
            {authMessage(error, "password")}
          </p>
        )}
        <div className={SETTINGS.fields}>
          <Input
            label="Current password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input
            label="New password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className={SETTINGS.formActions}>
          <Button type="submit" loading={pending} disabled={!current || !next}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * For a user who signs in with Ward only. A first local password is allowed
 * within ten minutes of a Ward sign-in; later, Ward asks for its own password
 * again (`reauthenticate`) and returns here, so a stolen Ward session cookie
 * alone cannot plant a password.
 */
function SetPasswordCard() {
  const { addToast } = useToast();
  const session = useSession();
  const local = useSetLocalPassword();
  const [next, setNext] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    local.reset();
    if (await local.setPassword(next)) {
      setNext("");
      addToast("Password set", "success");
      await session.refresh();
    }
  }

  const needsWard = local.error?.code === "reauthentication_required";

  return (
    <Card>
      <form onSubmit={(e) => void save(e)} noValidate>
        <h2 className={SETTINGS.sectionTitle}>Local password</h2>
        <p className={SETTINGS.sectionHint}>
          You sign in with Ward and have no password here. Set one to get in while Ward is unreachable, and before you
          can unlink Ward.
        </p>
        {local.reauthenticated && !local.error && (
          <p className={SETTINGS.note}>Confirmed with Ward. Set your password now.</p>
        )}
        {local.error && (
          <p className={SETTINGS.problem} role="alert">
            {authMessage(local.error, "password")}
          </p>
        )}
        <div className={SETTINGS.fields}>
          <Input
            label="New password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className={SETTINGS.formActions}>
          {needsWard && (
            <Button
              type="button"
              variant="secondary"
              loading={local.pending}
              onClick={() => void local.reauthenticate()}
            >
              Confirm with Ward
            </Button>
          )}
          <Button type="submit" loading={local.pending} disabled={!next}>
            Set password
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * The name you sign in with. The account keeps its id, its sessions and its
 * posts; only the name changes. The server refuses a name another user holds
 * and one that looks like another's (`AIice` against `alice`), both as
 * `username_taken`.
 */
function ChangeUsernameCard({ current }: { current: string }) {
  const { addToast } = useToast();
  const { renameUser, pending, error, reset } = useRenameUser();
  const [name, setName] = useState(current);
  const formRef = useRef<HTMLFormElement>(null);
  const next = name.trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending || next === "" || next === current) return;
    if (await renameUser(next)) {
      addToast("Username changed", "success");
    } else {
      formRef.current?.querySelector("input")?.focus();
    }
  }

  return (
    <Card>
      <form ref={formRef} onSubmit={(e) => void save(e)} noValidate>
        <h2 className={SETTINGS.sectionTitle}>Username</h2>
        <p className={SETTINGS.sectionHint}>
          The name you sign in with. Your posts and sessions stay as they are; sign in with the new name from now on.
        </p>
        <div className={SETTINGS.fields}>
          <Input
            label="Username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={name}
            error={error ? authMessage(error, "username") : undefined}
            onChange={(e) => {
              setName(e.target.value);
              reset();
            }}
          />
        </div>
        <div className={SETTINGS.formActions}>
          <Button type="submit" loading={pending} disabled={next === "" || next === current}>
            Change username
          </Button>
        </div>
      </form>
    </Card>
  );
}

function WardCard({ linked, hasPassword }: { linked: boolean; hasPassword: boolean }) {
  const link = useWardLink();
  const unlink = useWardUnlink();
  const session = useSession();
  const error = link.error ?? unlink.error;
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // Linking and unlinking both ask for the local password again. A Ward-only
  // user has none to type: they set one first (above) and the server answers
  // `no_local_password` whatever is sent.
  const asksPassword = hasPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    link.reset();
    unlink.reset();
    let ok: boolean;
    if (linked) {
      ok = await unlink.unlink(password);
      if (ok) await session.refresh();
    } else {
      // On success the browser leaves for Ward, so there is nothing to clear.
      ok = await link.link(password);
    }
    if (!ok) formRef.current?.querySelector("input")?.focus();
  }

  return (
    <Card>
      <form ref={formRef} onSubmit={(e) => void submit(e)} noValidate>
        <h2 className={SETTINGS.sectionTitle}>Ward</h2>
        <p className={SETTINGS.sectionHint}>
          {linked
            ? "Your Ward account is linked, so you can sign in with the Ward button. Type your password to unlink it."
            : "Link your Ward account to sign in with the Ward button. Type your password to start; nothing is linked by name, you confirm it at Ward."}
        </p>
        {link.linked && !error && <p className={SETTINGS.note}>Ward is linked.</p>}
        {asksPassword && (
          <div className={SETTINGS.fields}>
            <Input
              label="Current password"
              id="ward-current-password"
              name="ward-current-password"
              type="password"
              autoComplete="current-password"
              value={password}
              error={error ? authMessage(error, "ward") : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                link.reset();
                unlink.reset();
              }}
            />
          </div>
        )}
        {!asksPassword && error && (
          <p className={SETTINGS.problem} role="alert">
            {authMessage(error, "ward")}
          </p>
        )}
        <div className={SETTINGS.actions}>
          {linked ? (
            <Button type="submit" variant="secondary" loading={unlink.pending} disabled={!hasPassword || !password}>
              Unlink Ward
            </Button>
          ) : (
            <Button type="submit" loading={link.pending} disabled={!password}>
              Link Ward
            </Button>
          )}
        </div>
        {linked && !hasPassword && (
          <p className={SETTINGS.sectionHint}>Set a local password above before you unlink Ward.</p>
        )}
      </form>
    </Card>
  );
}
