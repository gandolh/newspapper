// @vitest-environment happy-dom
/**
 * Brief 98: a component that throws inside the boundary leaves an error message
 * and a way back, not a blank tree. Really mounted (happy-dom), because error
 * boundaries only work in a live render, not in server rendering.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;

function mount(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

function Bomb(): never {
  throw new RangeError('Maximum call stack size exceeded');
}

describe('ErrorBoundary', () => {
  it('renders an error state with a way back when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('This page hit an error');
    expect(container.textContent).toContain('Maximum call stack size exceeded');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/posts');
  });

  it('renders its children untouched when nothing throws', () => {
    mount(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(container.innerHTML).toBe('<p>fine</p>');
  });
});
