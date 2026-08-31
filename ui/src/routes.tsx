/**
 * The page map: `/` · `/posts` · `/articles` · `/settings` · `/login`, plus
 * `/kitchen-sink` in dev only.
 *
 * Every route but `/login` renders inside one `<App>` element at one position
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
import ProofSheet from 'virtual:proof-sheet';
import App from './layouts/App';
import ArticlesIsland from './components/articles/ArticlesIsland';
import EditorIsland from './components/editor/EditorIsland';
import PostsIsland from './components/posts/PostsIsland';
import SettingsIsland from './components/settings/SettingsIsland';
import LoginPage from './pages/Login';
import { Redirect, usePathname } from './router';

type Sheet = { title: string; width?: 'default' | 'fluid'; Island: ComponentType };

const sheets: Record<string, Sheet> = {
  '/': { title: 'Editor', width: 'fluid', Island: EditorIsland },
  '/posts': { title: 'Posts', Island: PostsIsland },
  '/articles': { title: 'Articles', Island: ArticlesIsland },
  '/settings': { title: 'Settings', Island: SettingsIsland },
  // null in every production build — see the proofSheet plugin in vite.config.ts.
  ...(ProofSheet ? { '/kitchen-sink': { title: 'Kitchen Sink', Island: ProofSheet } } : {}),
};

export default function Routes() {
  const path = usePathname();

  // The only route outside the board.
  if (path === '/login') return <LoginPage />;

  const sheet = sheets[path];
  if (!sheet) {
    // /history became /posts in brief 62. Kept so a bookmark lands somewhere
    // useful instead of 404ing; was an `astro.config.mjs` redirect entry.
    if (path === '/history') return <Redirect to="/posts" />;
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
