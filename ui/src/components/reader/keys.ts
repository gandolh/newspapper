/**
 * The Reader's keyboard set (brief 105, step 9). A fixed set, no remapping.
 *
 * Every key is ignored while focus is in a text field — typing "just" into the
 * filter must not open three items and save one — and inside an open dialog,
 * where the keys belong to the dialog. A key with Ctrl, ⌘ or Alt is the
 * browser's, never ours.
 */
import { useEffect, useEffectEvent } from 'react';

export type ReaderKeyAction =
  | 'next'
  | 'previous'
  | 'toggleRead'
  | 'save'
  | 'openOriginal'
  | 'copyLink'
  | 'refresh'
  | 'focusFilter'
  | 'markAllRead'
  | 'legend';

/** The legend, in the order the `?` dialog lists it. */
export const READER_KEYS: ReadonlyArray<{
  keys: string[];
  action: ReaderKeyAction;
  label: string;
}> = [
  { keys: ['j'], action: 'next', label: 'Next item (opens it, which marks it read)' },
  { keys: ['k'], action: 'previous', label: 'Previous item' },
  { keys: ['m'], action: 'toggleRead', label: 'Toggle read / unread' },
  { keys: ['s'], action: 'save', label: 'Save to library (opens the note field)' },
  { keys: ['v'], action: 'openOriginal', label: 'Open the original in a new tab' },
  { keys: ['c'], action: 'copyLink', label: 'Copy title + link' },
  { keys: ['r'], action: 'refresh', label: 'Refresh feeds' },
  { keys: ['/'], action: 'focusFilter', label: 'Focus the filter' },
  { keys: ['Shift', 'A'], action: 'markAllRead', label: 'Mark all read' },
  { keys: ['?'], action: 'legend', label: 'This list' },
];

const SINGLE: Readonly<Record<string, ReaderKeyAction>> = {
  j: 'next',
  k: 'previous',
  m: 'toggleRead',
  s: 'save',
  v: 'openOriginal',
  c: 'copyLink',
  r: 'refresh',
  '/': 'focusFilter',
};

/** `<input>` types that take no typing; a key pressed on one is still ours. */
const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

interface ElementLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

/** Focus is somewhere a key types a character. */
export function isTextField(target: EventTarget | null): boolean {
  const el = target as ElementLike | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.has((el.type ?? 'text').toLowerCase());
  return (
    typeof el.closest === 'function' &&
    el.closest('[contenteditable=""],[contenteditable="true"]') !== null
  );
}

function inDialog(target: EventTarget | null): boolean {
  const el = target as ElementLike | null;
  return (
    !!el &&
    typeof el.closest === 'function' &&
    el.closest('[role="dialog"],[role="alertdialog"]') !== null
  );
}

export type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target' | 'defaultPrevented'
> & { isComposing?: boolean };

/** The action a keydown asks for, or `null` when it is not the Reader's. */
export function readerKeyAction(event: KeyLike): ReaderKeyAction | null {
  if (event.defaultPrevented || event.isComposing) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTextField(event.target) || inDialog(event.target)) return null;

  if (event.key === '?') return 'legend';
  if (event.shiftKey) return event.key.toLowerCase() === 'a' ? 'markAllRead' : null;
  // Caps Lock sends `J` with no Shift; it is still j.
  return SINGLE[event.key.length === 1 ? event.key.toLowerCase() : event.key] ?? null;
}

/**
 * Listen on the window while `enabled`. The handler always sees the latest
 * render's state; the listener is attached once per `enabled` change.
 */
export function useReaderKeys(
  enabled: boolean,
  onAction: (action: ReaderKeyAction, event: KeyboardEvent) => void,
): void {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    const action = readerKeyAction(event);
    if (action) onAction(action, event);
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => handle(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}
