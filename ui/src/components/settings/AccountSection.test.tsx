// @vitest-environment happy-dom
/**
 * Which cards Settings shows for which account: a Ward-only user is offered a
 * local password and cannot unlink until they have one; a user with a password
 * changes it and may link Ward; an app without Ward shows no Ward card. The
 * hooks are faked, because what they do is the library's; this is what the page
 * does with their state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const session = vi.fn();
const local = vi.fn();
const idle = { pending: false, error: null, reset: () => undefined };
const reauthenticate = vi.fn(async () => true);
const link = vi.fn(async (_currentPassword: string) => true);
const unlink = vi.fn(async (_currentPassword: string) => true);
const renameUser = vi.fn(async (_next: string) => true);
const linkState = vi.fn();
const unlinkState = vi.fn();
const renameState = vi.fn();

vi.mock("@/lib/auth", () => ({
  useSession: () => session(),
  useLogout: () => ({ ...idle, logout: async () => true }),
  useWardSignOut: () => ({ ...idle, signOut: async () => true }),
  useChangePassword: () => ({ ...idle, changePassword: async () => true, done: false }),
  useSetLocalPassword: () => local(),
  useRenameUser: () => ({ ...idle, renameUser, done: false, ...renameState() }),
  useWardLink: () => ({ ...idle, link, linked: false, ...linkState() }),
  useWardUnlink: () => ({ ...idle, unlink, done: false, ...unlinkState() }),
}));

const { AccountSection } = await import("./AccountSection");
const { ToastProvider } = await import("../ui");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

function signedIn(opts: {
  hasPassword: boolean;
  origin?: "local" | "ward";
  ward: { enabled: boolean; linked: boolean };
}) {
  session.mockReturnValue({
    status: "signed_in",
    user: { id: "u1", username: "ada", role: "editor", hasPassword: opts.hasPassword },
    session: { origin: opts.origin ?? "local", expiresAt: 0 },
    ward: opts.ward,
    refresh: async () => undefined,
  });
}

async function mount() {
  window.history.replaceState({}, "", "/settings");
  container = document.createElement("div");
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

const titles = () => [...container.querySelectorAll("h2")].map((h) => h.textContent);
const field = (name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

/** Types into a controlled input the way a person does, so React sees the change. */
async function type(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const button = (label: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(label));

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
  linkState.mockReset();
  unlinkState.mockReset();
  renameState.mockReset();
});

describe("AccountSection", () => {
  it("offers a local password to a Ward-only user, and will not unlink until they have one", async () => {
    signedIn({ hasPassword: false, origin: "ward", ward: { enabled: true, linked: true } });
    await mount();
    expect(titles()).toEqual(["Account", "Username", "Local password", "Ward"]);
    expect(button("Unlink Ward")?.disabled).toBe(true);
    expect(button("Sign out of Ward too")).toBeDefined();
    expect(container.textContent).toContain("Set a local password above before you unlink Ward.");
  });

  it("asks for a fresh Ward sign-in when the first password is refused for being stale", async () => {
    signedIn({ hasPassword: false, origin: "ward", ward: { enabled: true, linked: true } });
    local.mockReturnValue({
      ...idle,
      error: { code: "reauthentication_required" },
      setPassword: async () => false,
      reauthenticate,
      reauthenticated: false,
      done: false,
    });
    await mount();
    await act(async () => button("Confirm with Ward")!.click());
    expect(reauthenticate).toHaveBeenCalled();
  });

  it("lets a user with a password change it, and link Ward from here", async () => {
    signedIn({ hasPassword: true, ward: { enabled: true, linked: false } });
    await mount();
    expect(titles()).toEqual(["Account", "Username", "Password", "Ward"]);
    expect(button("Sign out of Ward too")).toBeUndefined();
    expect(button("Link Ward")?.disabled).toBe(true);
    await type(field("ward-current-password"), "hunter2 hunter2");
    await act(async () => button("Link Ward")!.click());
    expect(link).toHaveBeenCalledWith("hunter2 hunter2");
  });

  it("unlinks Ward for a user who has a password", async () => {
    signedIn({ hasPassword: true, ward: { enabled: true, linked: true } });
    await mount();
    await type(field("ward-current-password"), "hunter2 hunter2");
    expect(button("Unlink Ward")?.disabled).toBe(false);
    await act(async () => button("Unlink Ward")!.click());
    expect(unlink).toHaveBeenCalledWith("hunter2 hunter2");
  });

  it("keeps a refused password on the page, beside the field", async () => {
    signedIn({ hasPassword: true, ward: { enabled: true, linked: false } });
    linkState.mockReturnValue({ error: { code: "invalid_credentials" } });
    await mount();
    const input = field("ward-current-password");
    expect(container.textContent).toContain("That is not your current password.");
    expect(input.getAttribute("aria-describedby")).toBe(`${input.id}-err`);
    linkState.mockReturnValue({ error: { code: "too_many_attempts", retryAfterSeconds: 42 } });
    await act(async () =>
      root!.render(
        <ToastProvider>
          <AccountSection />
        </ToastProvider>,
      ),
    );
    expect(container.textContent).toContain("Try again in 42 seconds.");
  });

  it("renames the user, and shows a refused name beside the field", async () => {
    signedIn({ hasPassword: true, ward: { enabled: false, linked: false } });
    await mount();
    expect(button("Change username")?.disabled).toBe(true);
    await type(field("username"), "  ada2 ");
    await act(async () => button("Change username")!.click());
    expect(renameUser).toHaveBeenCalledWith("ada2");
    renameState.mockReturnValue({ error: { code: "username_taken" } });
    await act(async () =>
      root!.render(
        <ToastProvider>
          <AccountSection />
        </ToastProvider>,
      ),
    );
    expect(container.textContent).toContain("That username is taken");
  });

  it("shows no Ward card when the server has no Ward", async () => {
    signedIn({ hasPassword: true, ward: { enabled: false, linked: false } });
    await mount();
    expect(titles()).toEqual(["Account", "Username", "Password"]);
  });

  it("goes back to the login form when the session has ended", async () => {
    session.mockReturnValue({ status: "signed_out", ward: { enabled: true } });
    await mount();
    expect(window.location.pathname).toBe("/login");
  });
});
