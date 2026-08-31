/**
 * The tray.
 *
 * A full-width 78px strip across the top of the board, closed by a 1.5px
 * graphite rule and divided into compartments by 1px rules. Every compartment
 * is a **showing**: it renders the thing the route produces — a board inside
 * crop marks, a stack of boards, a column of clippings, a scale-chip row —
 * with a 9px mono caption under it. You pick a route by recognising its shape.
 *
 * The current compartment is the one pulled forward: it takes paper and the
 * waxed shadow, the same mark a selected node takes (DESIGN.md §5). No fill,
 * no accent colour, no pill.
 *
 * It used to carry `transition:persist` to survive an Astro view transition.
 * It no longer needs to: the tray is rendered by the layout above every route,
 * so navigation swaps the sheet under it and never unmounts the strip. The
 * health probe keeps running for the life of the tab.
 */
import ApiHealthDot from './ApiHealthDot';
import SessionMenu from './auth/SessionMenu';
import { Link, usePathname } from '../router';
import styles from './Sidebar.module.css';

const navLinks = [
  { href: '/', caption: 'Editor', showing: 'board' },
  { href: '/posts', caption: 'Posts', showing: 'stack' },
  { href: '/articles', caption: 'Articles', showing: 'clipping' },
  { href: '/settings', caption: 'Settings', showing: 'chips' },
];

export default function Sidebar() {
  const path = usePathname();
  function isActive(href: string): boolean {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }

  return (
    <nav className={styles.tray} aria-label="Main navigation">
      <div className={`${styles.cell} ${styles['cell--brand']}`}>
        <Link href="/" className={styles.brand} aria-label="newspapper home">
          <span className={styles['brand-name']}>newspapper</span>
          <span className={styles['brand-caption']}>paste-up board</span>
        </Link>
      </div>

      <ul className={styles.cells} role="list">
        {navLinks.map(({ href, caption, showing }) => (
          <li className={styles['cell-item']} key={href}>
            <Link
              href={href}
              className={[
                styles.cell,
                styles['cell--nav'],
                isActive(href) ? styles['cell--current'] : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <span className={styles.showing} aria-hidden="true">
                {showing === 'board' && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M6 3v3M3 6h3M24 3v3M27 6h-3M6 27v-3M3 24h3M24 27v-3M27 24h-3" />
                    <rect x="8" y="8" width="14" height="14" strokeWidth="1.5" />
                    <path d="M11 13h8M11 17h5" strokeWidth="1.5" />
                  </svg>
                )}
                {showing === 'stack' && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="9" width="12" height="12" />
                    <rect x="9" y="6" width="12" height="12" />
                    <rect x="15" y="3" width="12" height="12" strokeWidth="1.5" />
                  </svg>
                )}
                {showing === 'clipping' && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 6h24M3 11h18M3 16h21M3 21h11" />
                    <path d="M20 23l4 4M24 23l-4 4" strokeWidth="1" />
                  </svg>
                )}
                {showing === 'chips' && (
                  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="2" y="11" width="7" height="8" />
                    <rect x="11.5" y="11" width="7" height="8" fill="currentColor" />
                    <rect x="21" y="11" width="7" height="8" />
                  </svg>
                )}
              </span>
              <span className={styles.caption}>{caption}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={`${styles.cell} ${styles['cell--session']}`}>
        <SessionMenu />
        <ApiHealthDot />
      </div>
    </nav>
  );
}
