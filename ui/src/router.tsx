/**
 * The router.
 *
 * Six routes, no parameters, no nested layouts, no data loaders — the whole
 * routing problem is "which of six components does this pathname select".
 * React Router (and its data APIs, its `<Outlet/>` tree and its own history
 * abstraction) and Wouter were both weighed and rejected: the repo adds
 * dependencies reluctantly, and neither buys anything a match on
 * `window.location.pathname` does not already give us.
 *
 * There is a second reason, and it is the stronger one. Several islands
 * navigate with `window.location.assign` (`PostsIsland`, `SessionMenu`,
 * `lib/api.ts`'s 401 redirect) and `EditorIsland` writes `?post=` straight
 * into history with `replaceState`. A router that owns history would be in a
 * quiet argument with all of that. This one does not own history: it reads
 * `window.location` on demand, so a full page load and a hand-written
 * `replaceState` are both simply the truth.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect` is deliberate —
 * `react-hooks/set-state-in-effect` is an error in this repo (brief 68) and
 * the store is the primitive that pattern is a workaround for.
 *
 * ── App paths vs origin paths ───────────────────────────────────────────────
 *
 * Everything this module exposes speaks APP paths: `/posts`, not
 * `/newspapper/posts`. The base is applied on the way out (`navigate`, and the
 * `href` a `<Link>` renders) and removed on the way in (`pathnameSnapshot`), so
 * `routes.tsx` matches the same four strings whether the app is at the origin
 * root or under a Caddy sub-path. See `lib/base.ts`.
 */
import {
  useEffect,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { stripBase, withBase } from './lib/base';

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** The app path for the current URL, base stripped. Exported for tests only:
 * `usePathname` is this behind `useSyncExternalStore`. */
export function pathnameSnapshot(): string {
  return stripBase(window.location.pathname);
}

/** The current pathname, re-read on pushState, replaceState and Back/Forward. */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, pathnameSnapshot);
}

/**
 * Navigate without a page load. `replace` swaps the entry instead of adding one.
 *
 * `to` is an APP path; the history entry written is the origin path.
 */
export function navigate(to: string, options?: { replace?: boolean }): void {
  const url = withBase(to);
  if (options?.replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  emit();
}

/**
 * A real `<a>` that stays a real `<a>`: middle-click, ⌘/Ctrl-click, a
 * `target`, a `download` and any off-site href all fall through to the
 * browser. Only the plain left click is intercepted.
 *
 * `href` is an APP path and the rendered attribute is the origin path — which
 * is what those fall-through cases need. A ⌘-click opens what the browser
 * reads off the element, so a base-less `href` here would open a new tab on a
 * URL this app does not serve.
 */
export function Link({
  href,
  children,
  ...rest
}: { href: string; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>): JSX.Element {
  function onClick(event: MouseEvent<HTMLAnchorElement>): void {
    rest.onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (rest.target && rest.target !== '_self') return;
    if (rest.download != null) return;
    if (!href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  }

  return (
    <a {...rest} href={withBase(href)} onClick={onClick}>
      {children}
    </a>
  );
}

/**
 * Rewrite the current entry to `to`. The swap happens in an effect rather than
 * in render because `navigate` notifies every subscriber synchronously, and
 * doing that mid-render would be updating other components while this one
 * renders. One frame of nothing, then the destination route.
 */
export function Redirect({ to }: { to: string }): null {
  useEffect(() => {
    // Both sides are app paths: `to` already is, and the location is stripped.
    if (stripBase(window.location.pathname) !== to) navigate(to, { replace: true });
  }, [to]);
  return null;
}
