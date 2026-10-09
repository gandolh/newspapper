/**
 * The reading pane: one item, set to read, with the ways to keep it.
 *
 * "Inspire" is clip and copy, never seed (brief 105, owner decision 3): save
 * to the library with a note, copy the title and link, copy a selected passage
 * as an attributed quote. There is no "start a post from this" here, by
 * decisions.md — a saved article is a reference, not a pipeline input.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { FeedItem, FeedItemSummary } from '@/lib/types';
import { Button, EmptyState, Mark, Skeleton, Textarea } from '../ui';
import buttonStyles from '../ui/Button.module.css';
import BackControl from './BackControl';
import ItemBody from './ItemBody';
import { formatDate } from './format';
import styles from './ReadingPane.module.css';

/** The inline note field under the actions. `save` saves the item with it;
 * `edit` replaces the saved article's note. */
export interface NoteDraft {
  mode: 'save' | 'edit';
  text: string;
  /** The existing note is still being fetched (`edit` only). */
  loading: boolean;
  busy: boolean;
}

export interface ReadingPaneProps {
  /** The selected row (or the item itself), shown while the full item loads. */
  summary: Omit<FeedItemSummary, 'excerpt'> | null;
  item: FeedItem | null;
  error: string | null;
  note: NoteDraft | null;
  onSave: () => void;
  onNoteChange: (text: string) => void;
  onNoteSubmit: () => void;
  onNoteCancel: () => void;
  onToggleRead: () => void;
  onCopyLink: () => void;
  onCopyQuote: (passage: string) => void;
  onRetry: () => void;
  onBack: () => void;
}

/** A button-shaped link: the same chip a `Button` prints, as a real `<a>`. */
const LINK_BUTTON = [
  buttonStyles.btn,
  buttonStyles['btn--secondary'],
  buttonStyles['btn--sm'],
].join(' ');

export default function ReadingPane(props: ReadingPaneProps) {
  const { summary, item, error, note } = props;
  const contentRef = useRef<HTMLDivElement>(null);
  const [passage, setPassage] = useState('');

  // Copy quote is live only while text is selected inside the pane. The
  // selection is read on every change rather than on click, because by the
  // time a click lands some browsers have already collapsed it.
  useEffect(() => {
    function onSelectionChange() {
      const selection = document.getSelection();
      const content = contentRef.current;
      if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !content) {
        setPassage('');
        return;
      }
      const range = selection.getRangeAt(0);
      setPassage(
        content.contains(range.commonAncestorContainer)
          ? selection.toString().replace(/\s+/g, ' ').trim()
          : '',
      );
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const back = <BackControl label="List" onClick={props.onBack} />;

  if (!summary) {
    return (
      <div className={styles.pane}>
        {back}
        <EmptyState
          icon="—"
          title="Nothing open"
          hint="Pick an item from the list, or press j to open the first one. Press ? for every key."
        />
      </div>
    );
  }

  const shown = item ?? summary;
  const loading = item === null && error === null;
  const meta = [shown.sourceName, shown.author, formatDate(shown.publishedAt ?? shown.sortAt)]
    .filter(Boolean)
    .join(' · ');

  const openOriginal = (
    <a className={LINK_BUTTON} href={shown.url} target="_blank" rel="noopener noreferrer">
      Open original ↗
    </a>
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    props.onNoteSubmit();
  }

  return (
    <div className={styles.pane}>
      {back}
      <article className={styles.sheet} aria-label={shown.title || 'Item'}>
        <div ref={contentRef}>
          <header className={styles.head}>
            <h2 className={styles.title}>{shown.title || 'Untitled'}</h2>
            <p className={styles.meta}>
              {meta}
              {!shown.read && (
                <Mark tone="ink" className={styles.metaMark}>
                  Unread
                </Mark>
              )}
            </p>
          </header>

          <div className={styles.actions}>
            {openOriginal}
            {shown.saved ? (
              <>
                <Mark tone="ink">Saved</Mark>
                <Button size="sm" variant="ghost" onClick={props.onSave} disabled={loading}>
                  Edit note
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={props.onSave} disabled={loading || note !== null}>
                Save to library
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={props.onCopyLink}>
              Copy title + link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!passage}
              title={passage ? undefined : 'Select a passage in the item first'}
              // Keep the selection: a press on the button must not collapse it.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => props.onCopyQuote(passage)}
            >
              Copy quote
            </Button>
            <Button size="sm" variant="ghost" onClick={props.onToggleRead}>
              {shown.read ? 'Mark unread' : 'Mark read'}
            </Button>
          </div>

          {note && (
            <form className={styles.noteForm} onSubmit={submit}>
              {note.loading ? (
                <Skeleton height={52} />
              ) : (
                <Textarea
                  id="reader-note"
                  label={note.mode === 'save' ? 'Note (optional)' : 'Note'}
                  placeholder="Why this is worth writing from"
                  hint="Ctrl+Enter saves · Esc cancels"
                  value={note.text}
                  rows={2}
                  autoFocus
                  disabled={note.busy}
                  onChange={(e) => props.onNoteChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      props.onNoteCancel();
                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      props.onNoteSubmit();
                    }
                  }}
                />
              )}
              <div className={styles.noteActions}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={props.onNoteCancel}
                  disabled={note.busy}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={note.busy} disabled={note.loading}>
                  {note.mode === 'save' ? 'Save to library' : 'Save note'}
                </Button>
              </div>
            </form>
          )}

          <div className={styles.body}>
            {error ? (
              <EmptyState
                icon="!"
                title="This item did not load"
                hint={error}
                action={
                  <Button size="sm" variant="secondary" onClick={props.onRetry}>
                    Try again
                  </Button>
                }
              />
            ) : loading ? (
              <div className={styles.loading} role="status">
                <span className={styles.srOnly}>Loading the item</span>
                <Skeleton height={26} width="60%" />
                <Skeleton height={130} />
                <Skeleton height={78} />
              </div>
            ) : (
              <ItemBody
                item={item!}
                empty={
                  <EmptyState
                    icon="↗"
                    title="No text in the feed"
                    hint="This feed sends a title and a link, and nothing to read here."
                    action={openOriginal}
                  />
                }
              />
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
