/**
 * An item's content, as the reading pane sets it (brief 105, step 7).
 *
 * The feed's HTML goes through `sanitizeItemHtml` and nowhere else. If the
 * sanitizer cannot run in this browser, the item's plain text is set as
 * paragraphs instead — the HTML is never passed through, because an
 * unsupported DOMPurify hands its input straight back.
 *
 * An item with nothing to read — a feed that sends a title and a link, or
 * content that was all iframe and script — renders `empty`, which the pane
 * fills with the way to the original.
 */
import { useMemo, type ReactNode } from 'react';
import type { FeedItem } from '@/lib/types';
import { sanitizeItemHtml, textParagraphs } from './sanitize';
import styles from './ItemBody.module.css';

/** Sanitized markup with no words and no picture in it. Read off markup the
 * sanitizer already produced, so a regex is only ever deciding a boolean. */
function isBlank(html: string): boolean {
  if (/<img\s/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '') === '';
}

export default function ItemBody({
  item,
  empty,
}: {
  item: Pick<FeedItem, 'contentHtml' | 'contentText'>;
  empty: ReactNode;
}) {
  // The `{ __html }` object is memoized, not just the string: React 19 rewrites
  // `innerHTML` whenever the object is new, which replaces every text node and
  // collapses the reader's selection on the re-render that selecting causes.
  // Copy quote depends on it.
  const markup = useMemo(() => {
    const html = sanitizeItemHtml(item.contentHtml);
    return html === null ? null : { __html: html };
  }, [item.contentHtml]);

  if (markup === null) {
    const paragraphs = textParagraphs(item.contentText);
    if (paragraphs.length === 0) return <>{empty}</>;
    return (
      <div className={styles.prose}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }

  if (isBlank(markup.__html)) return <>{empty}</>;
  return <div className={styles.prose} dangerouslySetInnerHTML={markup} />;
}
