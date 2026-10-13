// @vitest-environment happy-dom
/**
 * The login form's three states against a faked session: the Ward button is
 * there only when the server says Ward is configured, a Ward failure arrives
 * as the app's own sentence, and a signed-in browser is sent on instead of being
 * shown the form. The hooks are replaced; their behaviour is the library's and
 * is tested there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const session = vi.fn();
const wardSignIn = vi.fn();
const login = vi.fn(async () => true);
const signIn = vi.fn(async () => true);

vi.mock('@/lib/auth', () => ({
  useSession: () => session(),
  useLogin: () => ({ login, pending: false, error: null, reset: () => undefined }),
  useWardSignIn: () => wardSignIn(),
}));

const { default: LoginIsland } = await import('./LoginIsland');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

async function mount(search = '') {
  window.history.replaceState({}, '', `/login${search}`);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<LoginIsland />));
}

const text = () => container.textContent ?? '';
const buttons = () => [...container.querySelectorAll('button')].map((b) => b.textContent);

beforeEach(() => {
  session.mockReturnValue({ status: 'signed_out', ward: { enabled: true } });
  wardSignIn.mockReturnValue({ signIn, pending: false, error: null, reset: () => undefined });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.clearAllMocks();
});

describe('LoginIsland', () => {
  it('offers the form and the Ward button when the server has Ward configured', async () => {
    await mount();
    expect(container.querySelector('input[name="username"]')).not.toBeNull();
    expect(container.querySelector('input[name="password"]')).not.toBeNull();
    expect(buttons()).toEqual(['Sign in', 'Sign in with Ward']);
  });

  it('hides the Ward button when Ward is not configured', async () => {
    session.mockReturnValue({ status: 'signed_out', ward: { enabled: false } });
    await mount();
    expect(buttons()).toEqual(['Sign in']);
  });

  it('sends Ward the page the person came from, as an origin path', async () => {
    await mount(`?next=${encodeURIComponent('/posts?q=1')}`);
    const ward = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Sign in with Ward',
    )!;
    await act(async () => ward.click());
    expect(signIn).toHaveBeenCalledWith({ returnTo: '/posts?q=1' });
  });

  it('shows access_denied as the app’s own sentence, not the raw code', async () => {
    wardSignIn.mockReturnValue({
      signIn,
      pending: false,
      error: { code: 'access_denied' },
      reset: () => undefined,
    });
    await mount();
    expect(text()).toContain('Ward did not let you in here. Ask the operator for access.');
    expect(text()).not.toContain('access_denied');
  });

  it('says why a Ward session was refused when a 401 sent the person here', async () => {
    await mount('?reason=ward_session_ended');
    expect(text()).toContain('Your Ward session ended. Sign in again.');
  });

  it('says Ward is unreachable when the session probe reports it', async () => {
    session.mockReturnValue({
      status: 'signed_out',
      reason: 'ward_unavailable',
      ward: { enabled: true },
    });
    await mount();
    expect(text()).toContain('Ward is unreachable. Sign in with your password.');
  });

  it('does not show the form to a signed-in browser: it moves on to next', async () => {
    session.mockReturnValue({
      status: 'signed_in',
      user: { id: 'u', username: 'ada', role: 'editor', hasPassword: true },
      session: { origin: 'local', expiresAt: 0 },
      ward: { enabled: true, linked: false },
    });
    await mount(`?next=${encodeURIComponent('/reader')}`);
    expect(container.querySelector('form')).toBeNull();
    expect(window.location.pathname).toBe('/reader');
  });
});
