/**
 * The page map: `/` · `/posts` · `/reader` · `/settings`, plus
 * `/kitchen-sink` in dev only. (`/login` is gone — it is Ward's now, on a
 * different app entirely; the stale path is forwarded there. `/articles`
 * became the Reader in brief 105 and redirects to it.)
 *
 * Every route renders inside one `<App>` element at one position
 * in the tree, and that is load-bearing rather than tidy: React keeps an
 * element's instance when its type and position hold, so the layout — and the
 * tray inside it, and the tray's health probe — survives a navigation that
 * only swaps `children`. This is what replaced Astro's `<ClientRouter/>` plus
 * `transition:persist="sidebar"`. If a route ever renders its own `<App>`
 * again, the tray starts remounting on every click and the persistence is
 * silently gone; the guard is that no route component here knows about the
 * layout at all.
 *
 * Every route but `/login` is also behind the session. That guard is not here
 * but in `lib/api.ts`, which sends a 401 to `/login?next=…` on the first API
 * call a page makes — unchanged by this file.
 */
import type { ComponentType } from 'react';
import ProofSheet from './proofSheet';
import App from './layouts/App';
import EditorIsland from './components/editor/EditorIsland';
import PostsIsland from './components/posts/PostsIsland';
import ReaderIsland from './components/reader/ReaderIsland';
import SettingsIsland from './components/settings/SettingsIsland';
import { Redirect, usePathname } from './router';
import { wardLoginUrl } from './lib/api';

type Sheet = { title: string; width?: 'default' | 'fluid'; Island: ComponentType };

const sheets: Record<string, Sheet> = {
  '/': { title: 'Editor', width: 'fluid', Island: EditorIsland },
  '/posts': { title: 'Posts', Island: PostsIsland },
  // Fluid like the editor: three panes want the board's whole width.
  '/reader': { title: 'Reader', width: 'fluid', Island: ReaderIsland },
  '/settings': { title: 'Settings', Island: SettingsIsland },
  // null in every production build — see the proofSheet plugin in vite.config.ts.
  ...(ProofSheet ? { '/kitchen-sink': { title: 'Kitchen Sink', Island: ProofSheet } } : {}),
};

export default function Routes() {
  const path = usePathname();

  /*
   * `/login` was the only route outside the board. It is gone: newspapper has
   * no login page, and signing in is a navigation to Ward's. A bookmark or a
   * stale link lands here, and sending it to Ward rather than to `/` is what
   * makes that bookmark still do what the person meant by it.
   */
  if (path === '/login') {
    if (typeof window !== 'undefined') window.location.assign(wardLoginUrl());
    return null;
  }

  const sheet = sheets[path];
  if (!sheet) {
    // /history became /posts in brief 62. Kept so a bookmark lands somewhere
    // useful instead of 404ing; was an `astro.config.mjs` redirect entry.
    if (path === '/history') return <Redirect to="/posts" />;
    // /articles became the Reader in brief 105: its Search, Library and
    // Sources panels are the Reader's views now. Same reason as above.
    if (path === '/articles') return <Redirect to="/reader" />;
    // The static build had no 404 page either — the API's index.html fallback
    // served the editor for any unknown path. Say so in the URL bar.
    return <Redirect to="/" />;
  }

  const { title, width, Island } = sheet;
  return (
    <App title={title} width={width}>
      <Island />
    </App>
  );
}
