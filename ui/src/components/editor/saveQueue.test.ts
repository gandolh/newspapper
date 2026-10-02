import { describe, expect, it } from 'vitest';
import { createSaveQueue, type SaveBody } from './saveQueue';

/** A fake server: requests resolve only when the test says so, in any order. */
function fakeServer() {
  const db = new Map<number, SaveBody>();
  let nextId = 1;
  const pending: Array<{ kind: 'POST' | 'PUT'; body: SaveBody; resolve: () => void }> = [];
  return {
    db,
    pending,
    posts: () => pending.filter((p) => p.kind === 'POST').length,
    create(body: SaveBody) {
      return new Promise<{ id: number }>((resolve) => {
        pending.push({
          kind: 'POST',
          body,
          resolve: () => {
            const id = nextId++;
            db.set(id, body);
            resolve({ id });
          },
        });
      });
    },
    update(id: number, body: SaveBody) {
      return new Promise<void>((resolve) => {
        pending.push({
          kind: 'PUT',
          body,
          resolve: () => {
            db.set(id, body); // last writer wins, as the real route does
            resolve();
          },
        });
      });
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function harness(initialId: number | null) {
  const server = fakeServer();
  let current: SaveBody = { markup: 'v1', theme: 't' };
  const shown: SaveBody[] = [];
  const queue = createSaveQueue(
    {
      read: () => current,
      create: (b) => server.create(b),
      update: (id, b) => server.update(id, b),
      onStart: () => undefined,
      onSaved: (body) => shown.push(body),
      onError: (e) => {
        throw e;
      },
    },
    initialId,
  );
  return { server, queue, shown, edit: (markup: string) => (current = { markup, theme: 't' }) };
}

describe('createSaveQueue', () => {
  it('two rapid saves on a new post make exactly one POST, then a PUT', async () => {
    const { server, queue, edit } = harness(null);
    const first = queue.save();
    edit('v2');
    const second = queue.save();
    await flush();
    expect(server.posts()).toBe(1);
    expect(server.pending).toHaveLength(1);
    server.pending[0]!.resolve();
    await flush();
    expect(server.pending.map((p) => p.kind)).toEqual(['POST', 'PUT']);
    server.pending[1]!.resolve();
    await Promise.all([first, second]);
    expect(server.posts()).toBe(1);
    expect([...server.db.values()]).toEqual([{ markup: 'v2', theme: 't' }]);
  });

  it('overlapping edits on an existing post: the DB ends on the last edit, and so does the UI', async () => {
    const { server, queue, shown, edit } = harness(5);
    const a = queue.save(); // sends v1
    edit('v2');
    void queue.save(); // queued, not sent
    edit('v3');
    const c = queue.save(); // coalesces with the queued one
    await flush();
    expect(server.pending).toHaveLength(1); // never two PUTs in flight
    server.pending[0]!.resolve();
    await flush();
    expect(server.pending).toHaveLength(2);
    expect(server.pending[1]!.body.markup).toBe('v3'); // reads content at send time
    server.pending[1]!.resolve();
    await Promise.all([a, c]);
    expect(server.db.get(5)?.markup).toBe('v3');
    expect(shown.map((b) => b.markup)).toEqual(['v1', 'v3']); // in order; v1 never after v3
  });

  it('a failed save ends the run and the next save tries again', async () => {
    let calls = 0;
    const errors: unknown[] = [];
    const queue = createSaveQueue(
      {
        read: () => ({ markup: 'x', theme: 't' }),
        create: async () => ({ id: 1 }),
        update: async () => {
          calls += 1;
          if (calls === 1) throw new Error('boom');
        },
        onStart: () => undefined,
        onSaved: () => undefined,
        onError: (e) => errors.push(e),
      },
      1,
    );
    await queue.save();
    expect(errors).toHaveLength(1);
    expect(queue.saving).toBe(false);
    await queue.save();
    expect(calls).toBe(2);
  });
});
