import { describe, expect, it } from 'vitest';
import { ComposeParseError, parsePost } from './parse.js';

const validRaw = JSON.stringify({
  title: 'Today in News',
  slides: [
    { type: 'title', variant: 'title-main', text: 'Big Day', kicker: 'World' },
    { type: 'body', variant: 'body-text', heading: 'What happened', body: 'Stuff' },
    { type: 'quote', variant: 'quote-classic', quote: 'Hi', attribution: 'Me' },
  ],
});

describe('parsePost', () => {
  it('parses a valid response', () => {
    const post = parsePost(validRaw, '2026-05-18', 'warm-industrial');
    expect(post.title).toBe('Today in News');
    expect(post.slides).toHaveLength(3);
    expect(post.date).toBe('2026-05-18');
  });

  it('extracts JSON inside fenced code blocks', () => {
    const post = parsePost('```json\n' + validRaw + '\n```', '2026-05-18', 'warm-industrial');
    expect(post.slides).toHaveLength(3);
  });

  it('extracts JSON when surrounded by prose', () => {
    const post = parsePost(`Sure, here is the post:\n${validRaw}\nHope it helps!`, '2026-05-18', 'warm-industrial');
    expect(post.slides).toHaveLength(3);
  });

  it('rejects slide counts below 2', () => {
    const raw = JSON.stringify({
      title: 'T',
      slides: [{ type: 'title', variant: 'title-main', text: 'one' }],
    });
    expect(() => parsePost(raw, '2026-05-18', 'warm-industrial')).toThrow(ComposeParseError);
  });

  it('rejects slide counts above 8', () => {
    const slide = { type: 'title', variant: 'title-main', text: 'x' };
    const raw = JSON.stringify({ title: 'T', slides: Array(9).fill(slide) });
    expect(() => parsePost(raw, '2026-05-18', 'warm-industrial')).toThrow(ComposeParseError);
  });

  it('rejects unknown variants', () => {
    const raw = JSON.stringify({
      title: 'T',
      slides: [
        { type: 'title', variant: 'title-main', text: 'x' },
        { type: 'body', variant: 'body-mystery', heading: 'h', body: 'b' },
      ],
    });
    expect(() => parsePost(raw, '2026-05-18', 'warm-industrial')).toThrow(/unknown body variant/);
  });

  it('rejects body-list without string items', () => {
    const raw = JSON.stringify({
      title: 'T',
      slides: [
        { type: 'title', variant: 'title-main', text: 'x' },
        { type: 'body', variant: 'body-list', heading: 'h', items: [1, 2, 3] },
      ],
    });
    expect(() => parsePost(raw, '2026-05-18', 'warm-industrial')).toThrow(/string\[\] items/);
  });
});
