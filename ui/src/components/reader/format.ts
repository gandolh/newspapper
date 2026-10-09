/**
 * Small pure formatters shared by the Reader and its Search and Library views.
 * (`excerpt` and `formatDate` moved here from the old `ArticlesIsland`.)
 */

/** Cut a body to a list excerpt at `max` characters. */
export function excerpt(body: string, max = 220): string {
  if (body.length <= max) return body;
  return body.slice(0, max).trimEnd() + '…';
}

/** `Sep 3, 2026`, or the input unchanged when it is not a date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How old an item is, as a list row says it: `now`, `12m`, `3h`, `6d`, then a
 * date. `now` is passed in — a render must not read the clock.
 */
export function formatAge(iso: string | null, now: number): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const age = Math.max(0, now - t);
  if (age < MINUTE) return 'now';
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`;
  if (age < DAY) return `${Math.floor(age / HOUR)}h`;
  if (age < 7 * DAY) return `${Math.floor(age / DAY)}d`;
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** What "Copy title + link" puts on the clipboard. */
export function titleAndLink(title: string, url: string): string {
  return `${title}\n${url}`;
}

/** What "Copy quote" puts on the clipboard: `“passage” — Title, Source, URL`. */
export function attributedQuote(
  passage: string,
  item: { title: string; sourceName: string; url: string },
): string {
  const text = passage.replace(/\s+/g, ' ').trim();
  return `“${text}” — ${item.title}, ${item.sourceName}, ${item.url}`;
}
