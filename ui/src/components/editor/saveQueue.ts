/**
 * The editor's save path, serialized: **at most one save request in flight.**
 *
 * `save()` used to fire a request on every call. Two quick saves on a new post
 * (the Save button plus the autosave timer, or a double click) both saw no id
 * and both POSTed, leaving an orphan post. On an existing post two overlapping
 * PUTs could land in either order, so an older body could be the one SQLite
 * kept while the UI said "Saved" and showed the newer one.
 *
 * Here a save requested while one is in flight is not sent; it is remembered,
 * and one more save runs when the current one settles, reading the content
 * *then*. So a new post gets exactly one POST (later saves wait for its id and
 * PUT), requests reach the server in order, and the last write is always the
 * latest content. Any number of saves requested during a request coalesce into
 * one.
 *
 * It holds no React state, so it can be tested without a DOM.
 */
export interface SaveBody {
  markup: string;
  theme: string;
}

export interface SaveQueueOptions {
  /** The content to save, read at send time, not at request time. */
  read(): SaveBody;
  create(body: SaveBody): Promise<{ id: number }>;
  update(id: number, body: SaveBody): Promise<unknown>;
  onStart(): void;
  /** `body` is what was written. The caller compares it with the current
   * content to decide whether the editor is clean. */
  onSaved(body: SaveBody, id: number, created: boolean): void;
  onError(error: unknown): void;
}

export interface SaveQueue {
  /** Resolves once this request, and any coalesced into the same run, settled. */
  save(): Promise<void>;
  /** The post now being edited (a different post was opened). */
  setId(id: number | null): void;
  readonly saving: boolean;
}

export function createSaveQueue(
  options: SaveQueueOptions,
  initialId: number | null = null,
): SaveQueue {
  let id = initialId;
  let inFlight: Promise<void> | null = null;
  let again = false;

  async function run(): Promise<void> {
    do {
      again = false;
      const body = options.read();
      options.onStart();
      try {
        if (id === null) {
          const created = await options.create(body);
          id = created.id;
          options.onSaved(body, id, true);
        } else {
          await options.update(id, body);
          options.onSaved(body, id, false);
        }
      } catch (error) {
        // A failed save ends the run: retrying blindly would loop on a server
        // that keeps refusing. The editor stays dirty, so the next edit or the
        // Save button tries again.
        again = false;
        options.onError(error);
      }
    } while (again);
  }

  return {
    save() {
      if (inFlight) {
        again = true;
        return inFlight;
      }
      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    setId(next) {
      id = next;
    },
    get saving() {
      return inFlight !== null;
    },
  };
}
