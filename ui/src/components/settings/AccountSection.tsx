import { useState } from 'react';
import { Button, Card, Input, Skeleton, useToast } from '../ui';
import {
  useChangePassword,
  useLogout,
  useSession,
  useSetLocalPassword,
  useWardLink,
  useWardSignOut,
  useWardUnlink,
} from '@/lib/auth';
import { withBase } from '@/lib/base';
import { Redirect } from '@/router';
import { authMessage } from '../auth/messages';
import styles from './SettingsIsland.module.css';

/**
 * The account half of Settings: who you are, the local password, the Ward link
 * and signing out. Each card is its own component, because each owns hooks that
 * must not run for a user they do not apply to (a Ward-only user has no
 * password to change; an app without Ward configured has no link to manage).
 *
 * The library supplies state and handlers and nothing visible; every sentence
 * here comes from `authMessage`, so the wording matches the login page.
 */
export default function AccountSection() {
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <Card>
        <div className={styles.loading}>
          <Skeleton height={26} width="40%" />
          <Skeleton height={26} />
        </div>
      </Card>
    );
  }
  // A session that ended while the page was open (Ward revoked it, or it was
  // unlinked) goes back to the form rather than showing an account that is gone.
  if (session.status === 'signed_out') return <Redirect to="/login" />;
  if (session.status === 'error') {
    return (
      <Card>
        <h2 className={styles.sectionTitle}>Account</h2>
        <p className={styles.problem} role="alert">
          {authMessage(session.error)}
        </p>
      </Card>
    );
  }

  const { user, session: info, ward } = session;
  return (
    <>
      <Card>
        <h2 className={styles.sectionTitle}>Account</h2>
        <p className={styles.sectionHint}>
          Signed in as <strong>{user.username}</strong> ({user.role}),{' '}
          {info.origin === 'ward' ? 'through Ward' : 'with your password'}.
        </p>
        <SignOutRow viaWard={info.origin === 'ward'} />
      </Card>

      {user.hasPassword ? <ChangePasswordCard /> : <SetPasswordCard />}
      {ward.enabled && <WardCard linked={ward.linked} hasPassword={user.hasPassword} />}
    </>
  );
}

function SignOutRow({ viaWard }: { viaWard: boolean }) {
  const { logout, pending } = useLogout();
  const out = useWardSignOut();

  return (
    <>
      {out.error && (
        <p className={styles.problem} role="alert">
          {authMessage(out.error, 'ward')}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          loading={pending}
          onClick={async () => {
            if (await logout()) window.location.assign(withBase('/login'));
          }}
        >
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
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (await changePassword(current, next)) {
      setCurrent('');
      setNext('');
      addToast('Password changed', 'success');
    }
  }

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <h2 className={styles.sectionTitle}>Password</h2>
        <p className={styles.sectionHint}>
          Changing it signs out every other session of yours on this app.
        </p>
        {error && (
          <p className={styles.problem} role="alert">
            {authMessage(error, 'password')}
          </p>
        )}
        <div className={styles.fields}>
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
        <div className={styles.formActions}>
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
  const [next, setNext] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    local.reset();
    if (await local.setPassword(next)) {
      setNext('');
      addToast('Password set', 'success');
      await session.refresh();
    }
  }

  const needsWard = local.error?.code === 'reauthentication_required';

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <h2 className={styles.sectionTitle}>Local password</h2>
        <p className={styles.sectionHint}>
          You sign in with Ward and have no password here. Set one to get in while Ward is
          unreachable, and before you can unlink Ward.
        </p>
        {local.reauthenticated && !local.error && (
          <p className={styles.note}>Confirmed with Ward. Set your password now.</p>
        )}
        {local.error && (
          <p className={styles.problem} role="alert">
            {authMessage(local.error, 'password')}
          </p>
        )}
        <div className={styles.fields}>
          <Input
            label="New password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className={styles.formActions}>
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

function WardCard({ linked, hasPassword }: { linked: boolean; hasPassword: boolean }) {
  const link = useWardLink();
  const unlink = useWardUnlink();
  const session = useSession();
  const error = link.error ?? unlink.error;

  return (
    <Card>
      <h2 className={styles.sectionTitle}>Ward</h2>
      <p className={styles.sectionHint}>
        {linked
          ? 'Your Ward account is linked, so you can sign in with the Ward button.'
          : 'Link your Ward account to sign in with the Ward button. Nothing is linked by name: you confirm it at Ward.'}
      </p>
      {link.linked && !error && <p className={styles.note}>Ward is linked.</p>}
      {error && (
        <p className={styles.problem} role="alert">
          {authMessage(error, 'ward')}
        </p>
      )}
      <div className={styles.actions}>
        {linked ? (
          <Button
            variant="secondary"
            loading={unlink.pending}
            disabled={!hasPassword}
            onClick={async () => {
              link.reset();
              if (await unlink.unlink()) await session.refresh();
            }}
          >
            Unlink Ward
          </Button>
        ) : (
          <Button
            loading={link.pending}
            onClick={() => {
              unlink.reset();
              void link.link();
            }}
          >
            Link Ward
          </Button>
        )}
      </div>
      {linked && !hasPassword && (
        <p className={styles.sectionHint}>Set a local password above before you unlink Ward.</p>
      )}
    </Card>
  );
}
