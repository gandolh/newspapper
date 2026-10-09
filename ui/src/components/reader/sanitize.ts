/**
 * The one place a feed's HTML becomes markup (brief 105, step 7).
 *
 * The app sets no Content-Security-Policy anywhere, so this allowlist is the
 * only line of defence between a publisher's `content:encoded` and the page
 * the session cookie lives on. It is an allowlist on purpose: a tag or an
 * attribute not named here does not survive, whatever it is.
 *
 * - Text formatting, headings, lists, blockquote, pre/code, figure.
 * - `a[href]`, http(s) only, always opening a new tab with
 *   `rel="noopener noreferrer"`.
 * - `img[src|alt]`, http(s) only, always `loading="lazy"` and
 *   `referrerpolicy="no-referrer"`. The image is hotlinked from the
 *   publisher, and the referrer would tell them which item you were reading
 *   in which app. `max-width: 100%` is the reading pane's CSS, not an
 *   attribute: `style` never survives.
 *
 * A removed wrapper keeps its text (DOMPurify's `KEEP_CONTENT`), so a `<div>`
 * or a `<table>` is unwrapped rather than lost. `<script>`, `<style>`,
 * `<iframe>`, `<svg>` and the rest of DOMPurify's `FORBID_CONTENTS` go with
 * everything inside them.
 *
 * Two things DOMPurify does not give for free, and both are enforced here
 * rather than assumed:
 *
 * 1. **`data:` images.** `ALLOWED_URI_REGEXP` alone is not enough:
 *    `_isValidAttribute` re-admits `data:` on any tag in its default
 *    `DATA_URI_TAGS`, and `img` is one. The attribute hook refuses it first.
 * 2. **Unsupported environments.** `DOMPurify.sanitize` returns its input
 *    UNTOUCHED when `isSupported` is false (still true in 3.4.16). So this
 *    module never calls it there: `sanitizeItemHtml` returns `null`, and the
 *    caller renders `contentText` as text instead.
 */
import createDOMPurify, { type DOMPurify, type WindowLike } from 'dompurify';

/** Every tag that may survive. Anything else is removed, its text kept. */
export const ALLOWED_TAGS: readonly string[] = [
  // Paragraphs and breaks
  'p',
  'br',
  'hr',
  // Text formatting
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'del',
  'ins',
  'mark',
  'small',
  'sub',
  'sup',
  'cite',
  'q',
  'abbr',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // Quotation and code
  'blockquote',
  'pre',
  'code',
  'kbd',
  'samp',
  // Figures
  'figure',
  'figcaption',
  'img',
  // Links
  'a',
];

/** Which attribute each tag may keep. A tag absent here keeps none. */
const ATTRIBUTES_BY_TAG: Readonly<Record<string, readonly string[]>> = {
  a: ['href'],
  img: ['src', 'alt'],
};

/** The attributes whose value is a URL; each must be absolute http(s). */
const URL_ATTRIBUTES = new Set(['href', 'src']);

const HTTP_URL = /^https?:\/\//i;

/**
 * An attribute URL as it may survive, or `null`. Protocol-relative URLs
 * (`//cdn.example/x.png`, common in feeds) are read as https. Relative URLs
 * are refused: they would resolve against this app's origin, not the
 * publisher's, so they could only ever point at the wrong place.
 */
export function safeHttpUrl(raw: string): string | null {
  const value = raw.trim();
  const absolute = value.startsWith('//') ? `https:${value}` : value;
  return HTTP_URL.test(absolute) ? absolute : null;
}

function configure(purify: DOMPurify): DOMPurify {
  purify.addHook('uponSanitizeAttribute', (node, event) => {
    const allowed = ATTRIBUTES_BY_TAG[node.nodeName.toLowerCase()] ?? [];
    if (!allowed.includes(event.attrName)) {
      event.keepAttr = false;
      return;
    }
    if (URL_ATTRIBUTES.has(event.attrName)) {
      const url = safeHttpUrl(event.attrValue);
      if (url === null) event.keepAttr = false;
      else event.attrValue = url;
    }
  });

  // Forced attributes go on after validation, so they are the app's values
  // and never the feed's. A link with no surviving href is inert text and
  // gets nothing; an image with no surviving src is removed outright.
  purify.addHook('afterSanitizeAttributes', (node) => {
    const tag = node.nodeName.toLowerCase();
    if (tag === 'a') {
      const href = node.getAttribute('href');
      if (href === null) return;
      if (safeHttpUrl(href) === null) {
        node.removeAttribute('href');
        return;
      }
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    } else if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src === null || safeHttpUrl(src) === null) {
        node.remove();
        return;
      }
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'no-referrer');
    }
  });

  return purify;
}

const CONFIG = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: ['href', 'src', 'alt'],
  ALLOWED_URI_REGEXP: HTTP_URL,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/**
 * A sanitizer bound to `win`, with its own hooks. Its own instance rather than
 * the module-level singleton, so the hooks are registered exactly once on an
 * object nobody else configures.
 */
export function createItemSanitizer(win: WindowLike | undefined): {
  isSupported: boolean;
  sanitize: (html: string) => string | null;
} {
  const purify = win ? createDOMPurify(win) : null;
  // An unsupported instance is returned before DOMPurify defines its methods
  // (no `addHook`), and its `sanitize` would hand the input straight back.
  if (!purify?.isSupported) return { isSupported: false, sanitize: () => null };
  configure(purify);
  return { isSupported: true, sanitize: (html) => purify.sanitize(html, CONFIG) };
}

let shared: ReturnType<typeof createItemSanitizer> | null = null;

/**
 * Sanitize an item's HTML for the reading pane.
 *
 * Returns `null` when DOMPurify cannot run here. The caller must then render
 * the item's plain text — never `html` itself, which is exactly what
 * DOMPurify would have handed back.
 */
export function sanitizeItemHtml(html: string): string | null {
  shared ??= createItemSanitizer(typeof window === 'undefined' ? undefined : window);
  return shared.sanitize(html);
}

/** Plain text as paragraphs: the fallback when the sanitizer cannot run. */
export function textParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
