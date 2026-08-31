import { describe, it, expect } from 'vitest';
import type { TNode } from '../types.js';
import { resolveImageUrls } from './resolve-images.js';

const BASE = 'http://127.0.0.1:3001';

describe('resolveImageUrls', () => {
  it('resolves a compiled /uploads/<ref> background-image to an absolute URL', () => {
    const tree: TNode = {
      kind: 'box',
      style: { backgroundImage: "url('/uploads/harbour-at-dawn-9f3a1c2b')" },
    };

    const resolved = resolveImageUrls(tree, BASE) as Extract<TNode, { kind: 'box' }>;
    expect(resolved.style?.['backgroundImage']).toBe(
      "url('http://127.0.0.1:3001/uploads/harbour-at-dawn-9f3a1c2b')",
    );
  });

  it('drops a background-image that is not a valid upload ref', () => {
    const tree: TNode = {
      kind: 'box',
      style: { backgroundImage: "url('http://evil.example/x.jpg')", borderRadius: 8 },
    };

    const resolved = resolveImageUrls(tree, BASE) as Extract<TNode, { kind: 'box' }>;
    expect(resolved.style?.['backgroundImage']).toBeUndefined();
    expect(resolved.style?.['borderRadius']).toBe(8);
  });

  it('recurses into children of box and repeat nodes', () => {
    const tree: TNode = {
      kind: 'box',
      children: [
        { kind: 'text', text: 'hi' },
        {
          kind: 'repeat',
          source: 'items',
          children: [{ kind: 'box', style: { backgroundImage: "url('/uploads/a-1')" } }],
        },
      ],
    };

    const resolved = resolveImageUrls(tree, BASE) as Extract<TNode, { kind: 'box' }>;
    const repeatNode = resolved.children?.[1] as Extract<TNode, { kind: 'repeat' }>;
    const inner = repeatNode.children[0] as Extract<TNode, { kind: 'box' }>;
    expect(inner.style?.['backgroundImage']).toBe("url('http://127.0.0.1:3001/uploads/a-1')");
  });

  it('leaves nodes without a background-image untouched', () => {
    const tree: TNode = { kind: 'text', text: 'hello', style: { color: 'red' } };
    expect(resolveImageUrls(tree, BASE)).toEqual(tree);
  });
});
