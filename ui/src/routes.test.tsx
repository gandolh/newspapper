// @vitest-environment happy-dom
/**
 * Brief 105, step 10: `/articles` became the Reader. The old path redirects to
 * `/reader` the way `/history` → `/posts` does, the Reader is a sheet inside
 * the one `<App>`, and the tray's clipping compartment is the Reader's and is
 * the current one on `/reader`.
 *
 * Mounted for real (happy-dom): `usePathname` is a `useSyncExternalStore`
 * with no server snapshot, so server rendering — `router.test.tsx`'s tool —
 * cannot render the routes or the tray at all. The islands, the session cell
 * and the health probe are stubbed: this is about which sheet a path selects
 * and what the tray says, not about what each sheet fetches.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// `virtual:proof-sheet` comes from a plugin the root vitest config never
// loads; `null` is its production body.
vi.mock('./proofSheet', () => ({ default: null }));

function stubIsland(name: string) {
  return async () => {
    const { createElement } = await import('react');
    return { default: () => createElement('p', { 'data-island': name }, name) };
  };
}

vi.mock('./components/editor/EditorIsland', stubIsland('editor'));
vi.mock('./components/posts/PostsIsland', stubIsland('posts'));
vi.mock('./components/reader/ReaderIsland', stubIsland('reader'));
vi.mock('./components/settings/SettingsIsland', stubIsland('settings'));
vi.mock('./components/auth/SessionMenu', () => ({ default: () => null }));
vi.mock('./components/ApiHealthDot', () => ({ default: () => null }));

const { default: Routes } = await import('./routes');
const { navigate } = await import('./router');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

/** Mount the routes at `path`, letting the Redirect effect run. */
async function mountAt(path: string) {
  window.history.replaceState({}, '', path);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<Routes />));
}

function island(): string | null {
  return container.querySelector('[data-island]')?.getAttribute('data-island') ?? null;
}

function tray(): HTMLElement {
  return container.querySelector('nav[aria-label="Main navigation"]') as HTMLElement;
}

function compartments(): HTMLAnchorElement[] {
  return [...tray().querySelectorAll('li a')] as HTMLAnchorElement[];
}

beforeEach(() => {
  document.title = '';
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
});

describe('/articles', () => {
  it('redirects to /reader, replacing the history entry', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    await mountAt('/articles');
    expect(replaceState).toHaveBeenLastCalledWith({}, '', '/reader');
    expect(window.location.pathname).toBe('/reader');
    expect(island()).toBe('reader');
    expect(document.title).toBe('Reader — newspapper');
    replaceState.mockRestore();
  });

  it('leaves the older /history → /posts redirect working', async () => {
    await mountAt('/history');
    expect(window.location.pathname).toBe('/posts');
    expect(island()).toBe('posts');
  });
});

describe('the tray on /reader', () => {
  it('is the one tray: navigating to the Reader swaps the sheet and remounts nothing', async () => {
    await mountAt('/posts');
    const before = tray();
    await act(async () => navigate('/reader'));
    expect(island()).toBe('reader');
    expect(tray()).toBe(before);
  });

  it('has four compartments, the third of them the Reader', async () => {
    await mountAt('/reader');
    expect(compartments().map((a) => a.textContent)).toEqual([
      'Editor',
      'Posts',
      'Reader',
      'Settings',
    ]);
    expect(compartments()[2]!.getAttribute('href')).toBe('/reader');
    expect(tray().querySelector('a[href="/articles"]')).toBeNull();
  });

  it('marks the Reader compartment current, and only it', async () => {
    await mountAt('/reader');
    const current = compartments().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent)).toEqual(['Reader']);
  });

  it('keeps the clipping as the Reader compartment’s showing', async () => {
    await mountAt('/reader');
    const reader = compartments()[2]!;
    expect(reader.querySelector('svg path')?.getAttribute('d')).toBe(
      'M3 6h24M3 11h18M3 16h21M3 21h11',
    );
  });

  it('is not current on another sheet', async () => {
    await mountAt('/posts');
    const current = compartments().filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent)).toEqual(['Posts']);
  });
});
