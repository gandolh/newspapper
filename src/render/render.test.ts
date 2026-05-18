import { describe, expect, it } from 'vitest';
import { loadTheme } from './theme.js';
import { renderSlide } from './slides/index.js';
import { toSvg } from './satori.js';
import { toPng } from './resvg.js';
import type { SlideBlock } from '../storage/posts.js';

const fixtures: SlideBlock[] = [
  { type: 'title', variant: 'title-main', text: 'Today in the World', kicker: 'Daily' },
  { type: 'title', variant: 'title-statement', text: 'The biggest story is rarely the loudest.' },
  { type: 'title', variant: 'title-question', text: 'What changed in the markets today?' },
  { type: 'body', variant: 'body-text', heading: 'Markets dipped', body: 'A short paragraph explaining the move.' },
  { type: 'body', variant: 'body-list', heading: 'Three things', items: ['First thing', 'Second thing', 'Third thing'] },
  {
    type: 'body',
    variant: 'body-comparison',
    heading: 'Before and after',
    left: { label: 'Before', body: 'The status quo.' },
    right: { label: 'After', body: 'The new state.' },
  },
  { type: 'quote', variant: 'quote-classic', quote: 'A simple sentence.', attribution: 'Source' },
  { type: 'quote', variant: 'quote-pullout', quote: 'Bigger pullquote treatment.', attribution: 'Source' },
  { type: 'quote', variant: 'quote-reaction', quote: 'A reactive line.', attribution: 'Source' },
];

describe('renderer end-to-end', () => {
  const theme = loadTheme('warm-industrial');

  it.each(fixtures.map((f, i) => [f.variant, f, i + 1] as const))(
    'renders %s to a non-empty PNG',
    async (_label, slide, idx) => {
      const node = renderSlide(slide, theme, idx, fixtures.length);
      const svg = await toSvg(node);
      expect(svg.startsWith('<svg')).toBe(true);
      const png = toPng(svg);
      expect(png.length).toBeGreaterThan(1000);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    },
    20_000,
  );
});
