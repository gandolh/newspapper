// @vitest-environment happy-dom
/**
 * Opening `/?post=<id>` for a post that no longer exists must fetch it once,
 * say the post is gone, and leave the editor on a blank document. Fetching it
 * again whenever the failure toast appeared froze the page.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EditorIsland } from "./EditorIsland";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("EditorIsland with a missing post's link", () => {
  it("fetches the post once and shows the not-found message", async () => {
    window.history.replaceState({}, "", "/?post=999");
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input);
      if (url.includes("/api/posts/999")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "not_found", message: "Post not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    container = document.createElement("div");
    document.body.appendChild(container);
    const mounted = createRoot(container);
    root = mounted;
    await act(async () => mounted.render(<EditorIsland />));
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }

    const postFetches = fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/posts/999"));
    expect(postFetches).toHaveLength(1);
    expect(document.body.textContent).toContain("no longer exists");
  }, 15000);
});
