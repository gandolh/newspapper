// @vitest-environment happy-dom
/**
 * Brief 105: an item's body must survive a re-render of the pane untouched.
 *
 * Copy quote reads the reader's selection, and selecting text re-renders the
 * pane (the passage is state). Under React 19 a fresh `{ __html }` object on
 * each render rewrites `innerHTML`, which replaces every text node and
 * collapses the selection the reader just made: in a real browser the button
 * could never be used. So the test holds on to a text node and re-renders.
 *
 * The sanitizer is stubbed to hand its input back. This is about React, and
 * under happy-dom DOMPurify mangles even clean markup (`<p>a</p><p>b</p>` comes
 * back as `a<p>b</p>`); sanitize.test.ts covers it in Chromium.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ItemBody from './ItemBody';

vi.mock('./sanitize', () => ({
  sanitizeItemHtml: (html: string | null) => html ?? '',
  textParagraphs: () => [],
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('ItemBody', () => {
  it('keeps the same text nodes when the pane re-renders', () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const html = '<p>First paragraph of the item.</p><p>Second.</p>';

    act(() =>
      root!.render(<ItemBody item={{ contentHtml: html, contentText: '' }} empty={null} />),
    );
    const text = host.querySelector('p')!.firstChild;
    expect(text?.textContent).toBe('First paragraph of the item.');

    // A new item object with the same content, and a new `empty` element: what
    // the pane passes on every render.
    act(() =>
      root!.render(<ItemBody item={{ contentHtml: html, contentText: '' }} empty={<span />} />),
    );
    expect(host.querySelector('p')!.firstChild).toBe(text);
    expect(text!.isConnected).toBe(true);
  });
});
