import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardTitle,
  Button,
  Card,
  ChipRow,
  ConfirmDialog,
  CropMarks,
  DocBar,
  Icon,
  Input,
  Mark,
  ProgressBar,
  Select,
  Skeleton,
  Stamp,
  TissueCorner,
  ToastProvider,
  useToast,
} from "../ui";
import { api, sse } from "@/lib/api";
import { withBase } from "@/lib/base";
import type { PostStatus, PostSummary } from "@/lib/types";
// The flat file: a grid of boards, not a list (DESIGN.md section 5). Every board is the same board: the artwork
// waxed at the top inside crop marks, then one rigid label block under it, and the marks do all the differentiating.

/**
 * The editor URL for a post. A plain `<a>`, not the router's `<Link>`: the
 * editor reads `?post=` when it mounts, so this is a full page load. It still
 * has to carry the base, or under `/newspapper/` it leaves the app for the
 * origin root. Thumbnails (`/output/…`) need the base for the same reason.
 */
export function postHref(id: number): string {
  return withBase(`/?post=${id}`);
}

/** The latest render of one post, as `GET /api/renders` reports it. */
interface RenderSummary {
  id: number;
  postId: number;
  slideCount: number;
  optimized: boolean;
  createdAt: string;
  files: string[];
  /** A small thumbnail, or the first slide for older runs. */
  thumb: string | null;
}

type StatusFilter = "all" | PostStatus;

/** The keyword row's "no filter" chip. Not a keyword — `null` on the wire. */
const ALL_KEYWORDS = "\u0000all";

const STATUS_OPTIONS = [
  { value: "all", label: "All posts" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PostsPage() {
  const { addToast } = useToast();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [renders, setRenders] = useState<Map<number, RenderSummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState<string | null>(null);

  const [renderingId, setRenderingId] = useState<number | null>(null);
  const [renderProgress, setRenderProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<PostSummary | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<PostSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      if (keyword) params.set("keyword", keyword);
      const qs = params.toString();

      const [postList, renderList] = await Promise.all([
        api<PostSummary[]>(`/api/posts${qs ? `?${qs}` : ""}`),
        api<RenderSummary[]>("/api/renders").catch(() => [] as RenderSummary[]),
      ]);
      setPosts(postList);
      setRenders(new Map(renderList.map((r) => [r.postId, r])));
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [status, search, keyword, addToast]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 200);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const allKeywords = useMemo(() => {
    const seen = new Set<string>();
    for (const p of posts) for (const k of p.keywords) seen.add(k);
    return [...seen].sort();
  }, [posts]);

  async function handleRender(post: PostSummary) {
    if (renderingId !== null) return;
    setRenderingId(post.id);
    setRenderProgress(null);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      await sse(
        `/api/posts/${post.id}/render`,
        {},
        {
          signal: abort.signal,
          onEvent: (event, data) => {
            if (event === "progress") setRenderProgress(data as { done: number; total: number });
          },
        },
      );
      addToast(`Rendered “${post.title}”`, "success");
      await load();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setRenderingId(null);
      setRenderProgress(null);
      abortRef.current = null;
    }
  }

  async function handlePublish(post: PostSummary) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}/publish`, { method: "POST" });
      addToast(`Published “${post.title}”`, "success");
      await load();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBusyId(null);
      setConfirmPublish(null);
    }
  }

  async function handleUnpublish(post: PostSummary) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}/status`, {
        method: "PUT",
        json: { status: "draft" },
      });
      addToast(`“${post.title}” is a draft again`, "success");
      await load();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(post: PostSummary) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      addToast(`Deleted “${post.title}”`, "success");
      await load();
    } catch (err) {
      addToast((err as Error).message, "error");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }

  const filtered = Boolean(search || keyword || status !== "all");

  return (
    <>
      <DocBar>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[2px] phone:flex-none">
          <BoardTitle>Posts</BoardTitle>
          <p className="text-body leading-body font-medium text-graphite-soft">
            Everything you have written. Open one to keep editing, or render it out.
          </p>
        </div>
        <Button
          className="self-center max-[599px]:h-(--target) max-[599px]:self-stretch min-[600px]:max-[859px]:self-end"
          onClick={() => window.location.assign(withBase("/"))}
        >
          <Icon name="plus" />
          New post
        </Button>
      </DocBar>

      <div className="mx-auto flex w-full max-w-content flex-col gap-card px-gutter pt-card pb-[40px] phone:px-card phone:pt-snug phone:pb-[24px]">
        <section
          aria-label="Filters"
          className="flex flex-wrap items-end gap-card bg-paper px-card pt-snug pb-[14px] shadow-waxed phone:flex-col phone:items-stretch phone:gap-snug"
        >
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
            wrapperClassName="min-w-[190px]"
            className="w-full"
          />
          <Input
            label="Search"
            placeholder="Title, description or markup"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-[36px]"
            wrapperClassName="min-w-0 flex-[1_1_300px] phone:flex-none"
            leading={<Icon name="search" className="text-graphite-soft" />}
          />
          {allKeywords.length > 0 && (
            <ChipRow
              kind="filter"
              className="basis-full"
              ariaLabel="Filter by keyword"
              wrap
              pad="hair"
              options={[{ value: ALL_KEYWORDS, label: "All keywords" }, ...allKeywords.map((k) => ({ value: k }))]}
              value={keyword ?? ALL_KEYWORDS}
              onValueChange={(v) => setKeyword(v === ALL_KEYWORDS ? null : v)}
            />
          )}
        </section>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-card phone:gap-snug">
            <Skeleton height={312} />
            <Skeleton height={312} />
            <Skeleton height={312} />
          </div>
        ) : posts.length === 0 ? (
          <Card padding="none" className="flex flex-col items-start gap-tight p-[20px]">
            <h2 className="font-chrome text-head leading-head font-extrabold text-graphite-deep wdth-head">
              {filtered ? "Nothing matches" : "No posts yet"}
            </h2>
            <p className="text-body leading-body text-graphite-soft">
              {filtered ? "Try a wider filter." : "Start writing and the first save lands here."}
            </p>
            <Button onClick={() => window.location.assign(withBase("/"))}>
              <Icon name="plus" />
              New post
            </Button>
          </Card>
        ) : (
          <ul
            className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-card phone:gap-snug [&>li]:flex [&>li]:min-w-0"
            role="list"
          >
            {posts.map((post) => {
              const render = renders.get(post.id);
              // The render's 220 px thumbnail, not the full 1080 px slide.
              const thumb = render?.thumb ?? null;
              const rendered = (render?.files.length ?? 0) > 0;
              const isRendering = renderingId === post.id;
              const busy = busyId === post.id;

              return (
                <li key={post.id}>
                  <Card
                    padding="none"
                    className="flex min-w-0 flex-1 flex-col gap-[14px] overflow-hidden p-card phone:p-[14px]"
                  >
                    {post.status !== "published" && <TissueCorner />}
                    <div className="flex items-start gap-card pr-[14px]">
                      <a
                        className="relative m-[6px] grid size-[104px] shrink-0 place-items-center bg-board no-underline shadow-[0_0_0_1px_var(--color-hairline)]"
                        href={postHref(post.id)}
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {thumb ? (
                          <img className="block size-full object-cover" src={withBase(thumb)} alt="" loading="lazy" />
                        ) : (
                          <span className="font-chrome text-label leading-label font-semibold text-graphite-soft">
                            Not set
                          </span>
                        )}
                        <CropMarks small />
                      </a>

                      <div className="flex min-w-0 flex-col gap-tight">
                        <h2 className="font-chrome text-section leading-[20px] font-extrabold text-graphite-deep wdth-head">
                          <a
                            className="text-graphite-deep no-underline hover:underline hover:underline-offset-[3px]"
                            href={postHref(post.id)}
                          >
                            {post.title}
                          </a>
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[4px]">
                          {post.status === "published" ? (
                            <Stamp>Published</Stamp>
                          ) : (
                            <Mark icon="pencil" className="[&>svg]:size-[14px]">
                              Draft
                            </Mark>
                          )}
                          {rendered ? (
                            <Mark icon="layers" className="[&>svg]:size-[14px]">
                              {render?.slideCount} slides
                            </Mark>
                          ) : (
                            <Mark className="[&>svg]:size-[14px]">
                              <Icon name="box" dashed size={14} />
                              Not rendered
                            </Mark>
                          )}
                        </div>

                        {post.description && (
                          <p className="line-clamp-2 overflow-hidden text-hint leading-hint text-graphite-soft">
                            {post.description}
                          </p>
                        )}

                        <p className="font-chrome text-label leading-label font-medium text-graphite-soft tabular-nums">
                          Updated {formatDate(post.updatedAt)}
                          {post.publishedAt ? ` · published ${formatDate(post.publishedAt)}` : ""}
                        </p>

                        {post.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-x-snug gap-y-[2px]">
                            {post.keywords.map((k) => (
                              <Mark key={k}>{k}</Mark>
                            ))}
                          </div>
                        )}

                        {isRendering && (
                          <div className="mt-hair">
                            <ProgressBar
                              value={
                                renderProgress && renderProgress.total > 0
                                  ? (renderProgress.done / renderProgress.total) * 100
                                  : 0
                              }
                              label={
                                renderProgress
                                  ? `Rendering slide ${renderProgress.done} of ${renderProgress.total}`
                                  : "Starting Chromium…"
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-tight border-t border-hairline pt-snug phone:grid phone:grid-cols-2">
                      <Button variant="secondary" onClick={() => window.location.assign(postHref(post.id))}>
                        Open
                      </Button>
                      <Button
                        variant="secondary"
                        loading={isRendering}
                        disabled={renderingId !== null && !isRendering}
                        onClick={() => void handleRender(post)}
                      >
                        <Icon name="layers" />
                        Render
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!rendered}
                        onClick={() => window.location.assign(withBase(`/api/posts/${post.id}/export.zip`))}
                      >
                        <Icon name="download" />
                        Export ZIP
                      </Button>
                      {post.status === "published" ? (
                        <Button variant="secondary" loading={busy} onClick={() => void handleUnpublish(post)}>
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={!rendered}
                          loading={busy}
                          onClick={() => setConfirmPublish(post)}
                        >
                          <Icon name="send" />
                          Publish
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="ml-auto phone:col-start-2 phone:ml-0"
                        onClick={() => setConfirmDelete(post)}
                      >
                        <Icon name="trash" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmPublish !== null}
        onClose={() => setConfirmPublish(null)}
        onConfirm={() => confirmPublish && void handlePublish(confirmPublish)}
        title="Publish this post?"
        message={
          confirmPublish
            ? `“${confirmPublish.title}” will be marked published and its slides re-encoded at publish quality. This is not automatic and it does not post anywhere — it is the record that you are done.`
            : ""
        }
        confirmLabel="Publish"
        variant="primary"
        loading={busyId !== null}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && void handleDelete(confirmDelete)}
        title="Delete this post?"
        message={
          confirmDelete
            ? `“${confirmDelete.title}” and its render records go for good. The markup is not recoverable.`
            : ""
        }
        confirmLabel="Delete"
        loading={busyId !== null}
      />
    </>
  );
}

export function PostsIsland() {
  return (
    <ToastProvider>
      <PostsPage />
    </ToastProvider>
  );
}
