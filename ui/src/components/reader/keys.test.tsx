// @vitest-environment happy-dom
/**
 * Brief 105, step 9: the Reader's keys are ignored while focus is in a text
 * field. Checked twice — on the pure mapping, and on a mounted hook receiving
 * real keydown events from real elements, so the guard is proven where it
 * actually runs (an event's `target`), not only on hand-built objects.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { isTextField, readerKeyAction, useReaderKeys, type ReaderKeyAction } from './keys';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function key(k: string, extra: Partial<KeyboardEvent> = {}, target: EventTarget | null = null) {
  return {
    key: k,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    target,
    ...extra,
  } as KeyboardEvent;
}

describe('readerKeyAction', () => {
  it('maps the fixed set', () => {
    const body = document.body;
    expect(readerKeyAction(key('j', {}, body))).toBe('next');
    expect(readerKeyAction(key('k', {}, body))).toBe('previous');
    expect(readerKeyAction(key('m', {}, body))).toBe('toggleRead');
    expect(readerKeyAction(key('s', {}, body))).toBe('save');
    expect(readerKeyAction(key('v', {}, body))).toBe('openOriginal');
    expect(readerKeyAction(key('c', {}, body))).toBe('copyLink');
    expect(readerKeyAction(key('r', {}, body))).toBe('refresh');
    expect(readerKeyAction(key('/', {}, body))).toBe('focusFilter');
    expect(readerKeyAction(key('A', { shiftKey: true }, body))).toBe('markAllRead');
    expect(readerKeyAction(key('?', { shiftKey: true }, body))).toBe('legend');
  });

  it('leaves everything else alone', () => {
    expect(readerKeyAction(key('x'))).toBeNull();
    expect(readerKeyAction(key('a'))).toBeNull(); // plain a is not Shift+A
    expect(readerKeyAction(key('J', { shiftKey: true }))).toBeNull();
    expect(readerKeyAction(key('Enter'))).toBeNull();
  });

  it('gives Ctrl, ⌘ and Alt combinations back to the browser', () => {
    expect(readerKeyAction(key('c', { ctrlKey: true }))).toBeNull();
    expect(readerKeyAction(key('r', { metaKey: true }))).toBeNull();
    expect(readerKeyAction(key('j', { altKey: true }))).toBeNull();
  });

  it('reads Caps Lock j as j', () => {
    expect(readerKeyAction(key('J'))).toBe('next');
  });

  it('ignores every key typed into a text field', () => {
    const fields = [
      Object.assign(document.createElement('input'), { type: 'text' }),
      Object.assign(document.createElement('input'), { type: 'search' }),
      document.createElement('input'), // no type: text
      document.createElement('textarea'),
      document.createElement('select'),
    ];
    for (const field of fields) {
      for (const k of ['j', 'k', 'm', 's', 'v', 'c', 'r', '/', '?']) {
        expect(readerKeyAction(key(k, {}, field))).toBeNull();
      }
      expect(readerKeyAction(key('A', { shiftKey: true }, field))).toBeNull();
    }
  });

  it('ignores keys inside a contenteditable region and inside a dialog', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const inner = document.createElement('span');
    editable.appendChild(inner);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.append(editable, dialog);
    try {
      expect(readerKeyAction(key('j', {}, inner))).toBeNull();
      expect(readerKeyAction(key('j', {}, button))).toBeNull();
    } finally {
      editable.remove();
      dialog.remove();
    }
  });

  it('still acts on a checkbox or a button, which take no typing', () => {
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox' });
    expect(isTextField(checkbox)).toBe(false);
    expect(readerKeyAction(key('j', {}, checkbox))).toBe('next');
    expect(readerKeyAction(key('j', {}, document.createElement('button')))).toBe('next');
  });
});

describe('useReaderKeys, mounted', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  function mount(onAction: (a: ReaderKeyAction) => void, enabled = true) {
    function Probe() {
      useReaderKeys(enabled, (a) => onAction(a));
      return (
        <div>
          <input data-testid="filter" type="text" />
          <textarea data-testid="note" />
          <button data-testid="row">row</button>
        </div>
      );
    }
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Probe />));
    return container;
  }

  function press(target: Element, k: string, init: KeyboardEventInit = {}) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
  }

  it('acts on a key pressed outside any text field', () => {
    const onAction = vi.fn();
    const host = mount(onAction);
    press(host.querySelector('[data-testid="row"]')!, 'j');
    press(document.body, 'k');
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(['next', 'previous']);
  });

  it('ignores keys while typing in the filter input or the note textarea', () => {
    const onAction = vi.fn();
    const host = mount(onAction);
    const input = host.querySelector('[data-testid="filter"]')!;
    const textarea = host.querySelector('[data-testid="note"]')!;
    for (const k of ['j', 'k', 'm', 's', 'v', 'c', 'r', '/', '?']) {
      press(input, k);
      press(textarea, k);
    }
    press(input, 'A', { shiftKey: true });
    expect(onAction).not.toHaveBeenCalled();
  });

  it('listens to nothing while disabled', () => {
    const onAction = vi.fn();
    mount(onAction, false);
    press(document.body, 'j');
    expect(onAction).not.toHaveBeenCalled();
  });
});
