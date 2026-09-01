import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  ChipRow,
  ConfirmDialog,
  CropMarks,
  EmptyState,
  Input,
  Mark,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  Stamp,
  TissueCorner,
  ToastProvider,
  useToast,
} from '../ui';
import { api, sse } from '@/lib/api';
import type { Post, PostStatus } from '@/lib/types';
import styles from './PostsIsland.module.css';

/** The latest render of one post, as `GET /api/renders` reports it. */
interface RenderSummary {
  id: number;
  postId: number;
  slideCount: number;
  optimized: boolean;
  createdAt: string;
  files: string[];
}

type StatusFilter = 'all' | PostStatus;

/** The keyword row's "no filter" chip. Not a keyword — `null` on the wire. */
const ALL_KEYWORDS = '\u0000all';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All posts' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function PostsPage() {
  const { addToast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [renders, setRenders] = useState<Map<number, RenderSummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState<string | null>(null);

  const [renderingId, setRenderingId] = useState<number | null>(null);
  const [renderProgress, setRenderProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Post | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<Post | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      if (keyword) params.set('keyword', keyword);
      const qs = params.toString();

      const [postList, renderList] = await Promise.all([
        api<Post[]>(`/api/posts${qs ? `?${qs}` : ''}`),
        api<RenderSummary[]>('/api/renders').catch(() => [] as RenderSummary[]),
      ]);
      setPosts(postList);
      setRenders(new Map(renderList.map((r) => [r.postId, r])));
    } catch (err) {
      addToast((err as Error).message, 'error');
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

  async function handleRender(post: Post) {
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
            if (event === 'progress') setRenderProgress(data as { done: number; total: number });
          },
        },
      );
      addToast(`Rendered “${post.title}”`, 'success');
      await load();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setRenderingId(null);
      setRenderProgress(null);
      abortRef.current = null;
    }
  }

  async function handlePublish(post: Post) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}/publish`, { method: 'POST' });
      addToast(`Published “${post.title}”`, 'success');
      await load();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
      setConfirmPublish(null);
    }
  }

  async function handleUnpublish(post: Post) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}/status`, {
        method: 'PUT',
        json: { status: 'draft' },
      });
      addToast(`“${post.title}” is a draft again`, 'success');
      await load();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(post: Post) {
    setBusyId(post.id);
    try {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
      addToast(`Deleted “${post.title}”`, 'success');
      await load();
    } catch (err) {
      addToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Posts"
        subtitle="Everything you have written. Open one to keep editing, or render it out."
        actions={<Button onClick={() => window.location.assign('/')}>New post</Button>}
      />

      <div className={styles.filters}>
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
          className={styles.statusSelect}
        />
        <Input
          label="Search"
          placeholder="Title, description or markup"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allKeywords.length > 0 && (
        <ChipRow
          className={styles.keywords}
          ariaLabel="Filter by keyword"
          wrap
          pad="hair"
          options={[
            { value: ALL_KEYWORDS, label: 'All keywords' },
            ...allKeywords.map((k) => ({ value: k })),
          ]}
          value={keyword ?? ALL_KEYWORDS}
          onValueChange={(v) => setKeyword(v === ALL_KEYWORDS || v === keyword ? null : v)}
        />
      )}

      {loading ? (
        <div className={styles.list}>
          <Skeleton height={312} />
          <Skeleton height={312} />
          <Skeleton height={312} />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title={search || keyword || status !== 'all' ? 'Nothing matches' : 'No posts yet'}
          hint={
            search || keyword || status !== 'all'
              ? 'Try a wider filter.'
              : 'Start writing and the first save lands here.'
          }
          action={<Button onClick={() => window.location.assign('/')}>New post</Button>}
        />
      ) : (
        <ul className={styles.list} role="list">
          {posts.map((post) => {
            const render = renders.get(post.id);
            const thumb = render?.files[0] ?? null;
            const rendered = (render?.files.length ?? 0) > 0;
            const isRendering = renderingId === post.id;
            const busy = busyId === post.id;

            return (
              <li key={post.id}>
                <Card className={styles.board}>
                  {post.status !== 'published' && <TissueCorner />}
                  <a
                    className={styles.thumbLink}
                    href={`/?post=${post.id}`}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    {thumb ? (
                      <img className={styles.thumb} src={thumb} alt="" loading="lazy" />
                    ) : (
                      <span className={styles.thumbEmpty}>Not set</span>
                    )}
                    <CropMarks />
                  </a>

                  <div className={styles.meta}>
                    <div className={styles.titleLine}>
                      <a className={styles.title} href={`/?post=${post.id}`}>
                        {post.title}
                      </a>
                      {post.status === 'published' ? <Stamp>Published</Stamp> : <Mark>Draft</Mark>}
                      {rendered ? (
                        <Mark bare>{render?.slideCount} slides</Mark>
                      ) : (
                        <Mark bare>Not rendered</Mark>
                      )}
                    </div>

                    {post.description && <p className={styles.description}>{post.description}</p>}

                    <p className={styles.dates}>
                      Updated {formatDate(post.updatedAt)}
                      {post.publishedAt ? ` · published ${formatDate(post.publishedAt)}` : ''}
                    </p>

                    {post.keywords.length > 0 && (
                      <div className={styles.tagRow}>
                        {post.keywords.map((k) => (
                          <Mark key={k}>{k}</Mark>
                        ))}
                      </div>
                    )}

                    {isRendering && (
                      <div className={styles.progress}>
                        <ProgressBar
                          value={
                            renderProgress && renderProgress.total > 0
                              ? (renderProgress.done / renderProgress.total) * 100
                              : 0
                          }
                          label={
                            renderProgress
                              ? `Rendering slide ${renderProgress.done} of ${renderProgress.total}`
                              : 'Starting Chromium…'
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.location.assign(`/?post=${post.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={isRendering}
                      disabled={renderingId !== null && !isRendering}
                      onClick={() => void handleRender(post)}
                    >
                      Render
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!rendered}
                      onClick={() => window.location.assign(`/api/posts/${post.id}/export.zip`)}
                    >
                      Export ZIP
                    </Button>
                    {post.status === 'published' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy}
                        onClick={() => void handleUnpublish(post)}
                      >
                        Unpublish
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!rendered}
                        loading={busy}
                        onClick={() => setConfirmPublish(post)}
                      >
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => setConfirmDelete(post)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmPublish !== null}
        onClose={() => setConfirmPublish(null)}
        onConfirm={() => confirmPublish && void handlePublish(confirmPublish)}
        title="Publish this post?"
        message={
          confirmPublish
            ? `“${confirmPublish.title}” will be marked published and its slides re-encoded at publish quality. This is not automatic and it does not post anywhere — it is the record that you are done.`
            : ''
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
            : ''
        }
        confirmLabel="Delete"
        loading={busyId !== null}
      />
    </>
  );
}

export default function PostsIsland() {
  return (
    <ToastProvider>
      <PostsPage />
    </ToastProvider>
  );
}
