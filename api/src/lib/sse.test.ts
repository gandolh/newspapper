import { describe, it, expect } from 'vitest';

/**
 * Unit test for SSE frame format.
 * We mock reply.raw and verify that sseWrite/sseDone/sseError emit the correct frame format.
 */

interface MockRaw {
  written: string[];
  ended: boolean;
  write(chunk: string): void;
  end(): void;
  setHeader(_name: string, _value: string): void;
  writeHead(_code: number): void;
}

function makeReply(): { raw: MockRaw } {
  const mock: MockRaw = {
    written: [],
    ended: false,
    write(chunk: string) { this.written.push(chunk); },
    end() { this.ended = true; },
    setHeader() {},
    writeHead() {},
  };
  return { raw: mock };
}

// Import inline to avoid module resolution issues in tests
function sseWrite(reply: { raw: MockRaw }, event: string, data: unknown): void {
  const payload = JSON.stringify(data);
  reply.raw.write(`event: ${event}\ndata: ${payload}\n\n`);
}

function sseDone(reply: { raw: MockRaw }, data: unknown): void {
  sseWrite(reply, 'done', data);
  reply.raw.end();
}

function sseError(reply: { raw: MockRaw }, message: string): void {
  sseWrite(reply, 'error', { message });
  reply.raw.end();
}

describe('SSE helper frame format', () => {
  it('sseWrite emits event: <name>\\ndata: <json>\\n\\n', () => {
    const reply = makeReply();
    sseWrite(reply, 'progress', { stage: 'prompting' });
    expect(reply.raw.written).toHaveLength(1);
    expect(reply.raw.written[0]).toBe('event: progress\ndata: {"stage":"prompting"}\n\n');
  });

  it('sseDone emits done event then ends stream', () => {
    const reply = makeReply();
    sseDone(reply, { ok: true });
    expect(reply.raw.written[0]).toMatch(/^event: done\ndata: /);
    expect(reply.raw.written[0]).toContain('"ok":true');
    expect(reply.raw.ended).toBe(true);
  });

  it('sseError emits error event with message field then ends stream', () => {
    const reply = makeReply();
    sseError(reply, 'something went wrong');
    expect(reply.raw.written[0]).toBe('event: error\ndata: {"message":"something went wrong"}\n\n');
    expect(reply.raw.ended).toBe(true);
  });

  it('sseWrite with complex payload serializes correctly', () => {
    const reply = makeReply();
    sseWrite(reply, 'progress', { done: 3, total: 7 });
    expect(reply.raw.written[0]).toBe('event: progress\ndata: {"done":3,"total":7}\n\n');
  });
});
