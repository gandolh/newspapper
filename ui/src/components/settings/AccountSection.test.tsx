// @vitest-environment happy-dom
/**
 * Which cards Settings shows for which account: a Ward-only user is offered a
 * local password and cannot unlink until they have one; a user with a password
 * changes it and may link Ward; an app without Ward shows no Ward card. The
 * hooks are faked, because what they do is the library's; this is what the page
 * does with their state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const session = vi.fn();
const local = vi.fn();
const idle = { pending: false, error: null, reset: () => undefined };
const reauthenticate = vi.fn(async () => true);
const link = vi.fn(async () => true);
const unlink = vi.fn(async () => true);

vi.mock('@/lib/auth', () => ({
  useSession: () => session(),
  useLogout: () => ({ ...idle, logout: async () => true }),
  useWardSignOut: () => ({ ...idle, signOut: async () => true }),
  useChangePassword: () => ({ ...idle, changePassword: async () => true, done: false }),
  useSetLocalPassword: () => local(),
  useWardLink: () => ({ ...idle, link, linked: false }),
  useWardUnlink: () => ({ ...idle, unlink, done: false }),
}));

const { default: AccountSection } = await import('./AccountSection');
const { ToastProvider } = await import('../ui');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

function signedIn(opts: {
  hasPassword: boolean;
  origin?: 'local' | 'ward';
  ward: { enabled: boolean; linked: boolean };
}) {
  session.mockReturnValue({
    status: 'signed_in',
    user: { id: 'u1', username: 'ada', role: 'editor', hasPassword: opts.hasPassword },
    session: { origin: opts.origin ?? 'local', expiresAt: 0 },
    ward: opts.ward,
    refresh: async () => undefined,
  });
}

async function mount() {
  window.history.replaceState({}, '', '/settings');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root!.render(
      <ToastProvider>
        <AccountSection />
      </ToastProvider>,
    ),
  );
}

const titles = () => [...container.querySelectorAll('h2')].map((h) => h.textContent);
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

beforeEach(() => {
  local.mockReturnValue({
    ...idle,
    setPassword: async () => true,
    reauthenticate,
    reauthenticated: false,
    done: false,
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.clearAllMocks();
});

describe('AccountSection', () => {
  it('offers a local password to a Ward-only user, and will not unlink until they have one', async () => {
    signedIn({ hasPassword: false, origin: 'ward', ward: { enabled: true, linked: true } });
    await mount();
    expect(titles()).toEqual(['Account', 'Local password', 'Ward']);
    expect(button('Unlink Ward')?.disabled).toBe(true);
    expect(button('Sign out of Ward too')).toBeDefined();
    expect(container.textContent).toContain('Set a local password above before you unlink Ward.');
  });

  it('asks for a fresh Ward sign-in when the first password is refused for being stale', async () => {
    signedIn({ hasPassword: false, origin: 'ward', ward: { enabled: true, linked: true } });
    local.mockReturnValue({
      ...idle,
      error: { code: 'reauthentication_required' },
      setPassword: async () => false,
      reauthenticate,
      reauthenticated: false,
      done: false,
    });
    await mount();
    await act(async () => button('Confirm with Ward')!.click());
    expect(reauthenticate).toHaveBeenCalled();
  });

  it('lets a user with a password change it, and link Ward from here', async () => {
    signedIn({ hasPassword: true, ward: { enabled: true, linked: false } });
    await mount();
    expect(titles()).toEqual(['Account', 'Password', 'Ward']);
    expect(button('Sign out of Ward too')).toBeUndefined();
    await act(async () => button('Link Ward')!.click());
    expect(link).toHaveBeenCalled();
  });

  it('unlinks Ward for a user who has a password', async () => {
    signedIn({ hasPassword: true, ward: { enabled: true, linked: true } });
    await mount();
    expect(button('Unlink Ward')?.disabled).toBe(false);
    await act(async () => button('Unlink Ward')!.click());
    expect(unlink).toHaveBeenCalled();
  });

  it('shows no Ward card when the server has no Ward', async () => {
    signedIn({ hasPassword: true, ward: { enabled: false, linked: false } });
    await mount();
    expect(titles()).toEqual(['Account', 'Password']);
  });

  it('goes back to the login form when the session has ended', async () => {
    session.mockReturnValue({ status: 'signed_out', ward: { enabled: true } });
    await mount();
    expect(window.location.pathname).toBe('/login');
  });
});
