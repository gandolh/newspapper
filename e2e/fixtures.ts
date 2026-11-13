/**
 * The API, stubbed. Every `/api/*` request the app makes is answered here, from made-up data about "Sample City":
 * the demo posts of docs/images/shots.md and a small Reader (four feeds, 24 items, 19 of them unread).
 *
 * Nothing leaves the machine. The Reader's refresh, a live search and a feed ping are aborted, not answered, and a
 * request with no stub gets a 404 and is listed in `stub.unhandled` so a spec can assert there were none.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

export const SAMPLE_MARKUP = `<head>
  <title>Sample City's trams will run all night</title>
  <caption>Sample City's trams will run all night.</caption>
</head>

<body>
  <Slide>
    <Kicker>Transport</Kicker>
    <Heading size="xl">Trams run all night</Heading>
  </Slide>
  <Slide>
    <Heading>What changes</Heading>
    <List size="lg">
      <Item>Night trams every 20 minutes</Item>
      <Item emphasis="strong">Fares stay the same</Item>
      <Item>Three new stops</Item>
    </List>
  </Slide>
  <Slide>
    <Quote size="lg" by="The Mayor">The city never sleeps.</Quote>
    <Source emphasis="muted">Council statement</Source>
  </Slide>
</body>
`;

const LIBRARY_MARKUP = `<head>
  <title>The central library opens on Sundays</title>
</head>

<body>
  <Slide>
    <Kicker>Culture</Kicker>
    <Heading size="xl">The library opens on Sundays</Heading>
  </Slide>
  <Slide>
    <Heading>Hours</Heading>
    <Text>Sundays from 10 to 16.</Text>
  </Slide>
</body>
`;

const PARK_MARKUP = `<head>
  <title>Riverside Park reopens after flood repairs</title>
</head>

<body>
  <Slide>
    <Kicker>City</Kicker>
    <Heading size="xl">Riverside Park reopens</Heading>
  </Slide>
  <Slide>
    <Heading>What was repaired</Heading>
    <Text>Paths, benches and the lower bridge.</Text>
  </Slide>
</body>
`;

const DAY = "2026-11-12T09:00:00.000Z";

function post(id: number, markup: string, theme: string, title: string) {
  return {
    id,
    title,
    description: "",
    markup,
    theme,
    status: "draft" as "draft" | "published",
    keywords: [] as string[],
    createdAt: DAY,
    updatedAt: DAY,
    publishedAt: null as string | null,
  };
}

export const POSTS = [
  post(3, PARK_MARKUP, "warm-industrial-3", "Riverside Park reopens after flood repairs"),
  post(2, LIBRARY_MARKUP, "warm-industrial-2", "The central library opens on Sundays"),
  post(1, SAMPLE_MARKUP, "warm-industrial-1", "Sample City's trams will run all night"),
];

export const SOURCES = [
  { id: "harbour", name: "Harbour Post", rss: "https://feeds.example.test/harbour.xml", category: "City" },
  { id: "metro", name: "Metro Times", rss: "https://feeds.example.test/metro.xml", category: "City" },
  { id: "tech", name: "Tech Weekly", rss: "https://feeds.example.test/tech.xml", category: "Tech" },
  { id: "bbc", name: "BBC World", rss: "https://feeds.example.test/bbc.xml", category: null },
  { id: "context", name: "Context.ro", rss: "https://feeds.example.test/context.xml", category: null },
  { id: "factual", name: "Factual.ro", rss: "https://feeds.example.test/factual.xml", category: null },
  { id: "g4", name: "G4Media.ro", rss: "https://feeds.example.test/g4.xml", category: null },
  { id: "hotnews", name: "HotNews.ro", rss: "https://feeds.example.test/hotnews.xml", category: null },
  { id: "loose", name: "Loose Feed", rss: "https://feeds.example.test/loose.xml", category: null },
  { id: "politica", name: "Politica la Minut", rss: "https://feeds.example.test/politica.xml", category: null },
].map((s) => ({ ...s, enabled: true, lastFetchedAt: "2026-11-13T08:00:00.000Z", lastError: null as string | null }));

const ITEM_SOURCES = ["harbour", "tech", "loose", "metro"];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
/** Items 1 and 6 and four more are read: 24 in all, 19 unread (Harbour 5, Metro 4, Tech 5, Loose 5). */
const READ = new Set([1, 6, 11, 16, 21]);

function sourceName(id: string): string {
  return SOURCES.find((s) => s.id === id)!.name;
}

export interface Item {
  id: number;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  sortAt: string;
  read: boolean;
  saved: boolean;
  excerpt: string;
}

export const ITEMS: Item[] = HOURS.map((h, i) => {
  const id = i + 1;
  const sourceId = ITEM_SOURCES[i % ITEM_SOURCES.length];
  const at = new Date(Date.parse("2026-11-13T09:00:00.000Z") - h * 3_600_000).toISOString();
  return {
    id,
    sourceId,
    sourceName: sourceName(sourceId),
    title: `Item ${id}: the night tram plan and what it means for the harbour district`,
    url: `https://news.example.test/item-${id}`,
    author: null,
    publishedAt: at,
    sortAt: at,
    read: READ.has(id),
    saved: false,
    excerpt: "The night tram plan puts a car on the harbour line every twenty minutes after midnight.",
  };
});

const ITEM_HTML = `<p>The night tram plan puts a car on the harbour line every twenty minutes after midnight, with three new stops by the old market.</p><h2>What changes</h2><ul><li>Night trams every 20 minutes</li><li>Fares stay the same</li><li>Three new stops</li></ul><blockquote>The city never sleeps, so its trams should not either.</blockquote><p>The council votes on the plan next month.</p>`;

const unreadBy = (id: string): number => ITEMS.filter((i) => i.sourceId === id && !i.read).length;
const unreadCounts = {
  unread: ITEMS.filter((i) => !i.read).length,
  all: ITEMS.length,
  unreadBySource: Object.fromEntries(SOURCES.map((s) => [s.id, unreadBy(s.id)])),
};

export interface StubOptions {
  /** No session: `/api/auth/session` answers signed out. */
  signedOut?: boolean;
  /** Posts to list; none gives the empty state. */
  posts?: typeof POSTS;
  /** The post a new save returns the id of. */
  failReader?: boolean;
}

export interface Stub {
  /** `METHOD /path` of every request answered, in order. */
  requests: string[];
  /** Requests no stub covers; a spec asserts this is empty. */
  unhandled: string[];
  /** Requests that would have reached the outside and were aborted. */
  blocked: string[];
}

const json = (route: Route, body: unknown, status = 200): Promise<void> =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

export async function stubApi(page: Page, options: StubOptions = {}): Promise<Stub> {
  const stub: Stub = { requests: [], unhandled: [], blocked: [] };
  const posts = (options.posts ?? POSTS).map((p) => ({ ...p }));
  const items = ITEMS.map((i) => ({ ...i }));
  const themes = ["warm-industrial-1", "warm-industrial-2", "warm-industrial-3"].map((name) => ({
    name,
    tokens: JSON.parse(readFileSync(here(`../assets/design-systems/${name}.json`), "utf8")) as unknown,
  }));

  await page.route(/\/(api|uploads|output|assets)\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (!path.startsWith("/api/")) return route.fulfill({ status: 404, body: "" });
    stub.requests.push(`${method} ${path}`);

    if (path === "/api/health") return json(route, { ok: true });
    if (path === "/api/auth/session") {
      if (options.signedOut) return json(route, { user: null, session: null, ward: { enabled: false, linked: false } });
      return json(route, {
        user: { id: "tester-1", username: "tester", role: "editor", hasPassword: true },
        session: { origin: "local", expiresAt: 4_102_444_800_000 },
        ward: { enabled: false, linked: false },
      });
    }
    if (path === "/api/themes") return json(route, themes);
    if (path === "/api/settings") return json(route, { defaultTheme: "warm-industrial-1" });
    if (path === "/api/renders") return json(route, []);
    if (path === "/api/uploads") return json(route, []);
    if (path === "/api/articles") return json(route, []);

    if (path === "/api/posts" && method === "GET") {
      const status = url.searchParams.get("status");
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const list = posts
        .filter((p) => !status || p.status === status)
        .filter((p) => !q || `${p.title} ${p.markup}`.toLowerCase().includes(q))
        .map(({ markup: _markup, ...rest }) => rest);
      return json(route, list);
    }
    const postMatch = /^\/api\/posts\/(\d+)$/.exec(path);
    if (postMatch) {
      const found = posts.find((p) => p.id === Number(postMatch[1]));
      if (!found) return json(route, { error: "Not found" }, 404);
      if (method === "PUT") {
        const body = request.postDataJSON() as { markup: string; theme?: string };
        Object.assign(found, { markup: body.markup, theme: body.theme ?? found.theme });
      }
      return json(route, found);
    }
    if (/^\/api\/posts\/\d+\/render$/.test(path)) {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'event: done\ndata: {"ok":true}\n\n',
      });
    }

    if (options.failReader && path.startsWith("/api/reader")) return json(route, { error: "Failed to load." }, 500);
    if (path === "/api/sources" && method === "GET") return json(route, SOURCES);
    if (path === "/api/reader/counts") return json(route, unreadCounts);
    if (path === "/api/reader/items" && method === "GET") {
      const scope = url.searchParams.get("scope");
      const sourceId = url.searchParams.get("sourceId");
      const category = url.searchParams.get("category");
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const list = items
        .filter((i) => scope === "all" || !i.read)
        .filter((i) => !sourceId || i.sourceId === sourceId)
        .filter((i) => {
          if (category === null) return true;
          const cat = SOURCES.find((s) => s.id === i.sourceId)!.category ?? "";
          return cat === category;
        })
        .filter((i) => !q || i.title.toLowerCase().includes(q));
      return json(route, { items: list, nextCursor: null });
    }
    const itemMatch = /^\/api\/reader\/items\/(\d+)$/.exec(path);
    if (itemMatch) {
      const found = items.find((i) => i.id === Number(itemMatch[1]));
      if (!found) return json(route, { error: "Not found" }, 404);
      if (method === "PATCH") found.read = (request.postDataJSON() as { read: boolean }).read;
      return json(route, {
        ...found,
        guid: found.url,
        contentHtml: ITEM_HTML,
        contentText: "The night tram plan.",
        fetchedAt: found.sortAt,
        readAt: found.read ? found.sortAt : null,
        articleId: null,
      });
    }

    // Anything that would reach a feed or the outside is refused, not answered.
    if (path === "/api/reader/refresh" || path === "/api/scrape" || /\/api\/sources\/[^/]+\/ping$/.test(path)) {
      stub.blocked.push(`${method} ${path}`);
      return route.abort();
    }

    stub.unhandled.push(`${method} ${path}`);
    return json(route, { error: "No stub" }, 404);
  });

  return stub;
}

/** Waits until the web fonts are in, so a measurement or a shot is of the final type. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}
