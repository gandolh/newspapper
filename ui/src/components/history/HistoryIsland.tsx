import { useEffect, useState, useCallback } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ToastProvider,
  useToast,
  ConfirmDialog,
  Spinner,
} from '../ui';
import { api } from '@/lib/api';
import type { PostRow } from '@/lib/types';
import styles from './HistoryIsland.module.css';

// ---------------------------------------------------------------------------
// Helper: relative time (no date-lib)
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// ---------------------------------------------------------------------------
// Helper: month label from YYYY-MM-DD
// ---------------------------------------------------------------------------

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Helper: group posts by month
// ---------------------------------------------------------------------------

function groupByMonth(posts: PostRow[]): Array<{ month: string; posts: PostRow[] }> {
  const map = new Map<string, PostRow[]>();
  for (const p of posts) {
    const key = monthLabel(p.date);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(p);
    } else {
      map.set(key, [p]);
    }
  }
  return Array.from(map.entries()).map(([month, ps]) => ({ month, posts: ps }));
}

// ---------------------------------------------------------------------------
// Helper: derive thumbnail URL
// ---------------------------------------------------------------------------

function thumbnailUrl(post: PostRow): string | null {
  if (post.status !== 'rendered' || !post.outputDir) return null;
  const parts = post.outputDir.replace(/\\/g, '/').split('/');
  const dirName = parts[parts.length - 1];
  return `/output/${dirName}/1.png`;
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: PostRow;
  onDelete: (post: PostRow) => void;
}

function PostCard({ post, onDelete }: PostCardProps) {
  const thumb = thumbnailUrl(post);
  const slideCount = post.payload?.slides?.length ?? 0;
  const isRendered = post.status === 'rendered';

  return (
    <Card className={styles.postCard} padding="none">
      <div className={styles.cardInner}>
        {/* Thumbnail */}
        <div className={styles.thumb}>
          {thumb ? (
            <img src={thumb} alt={`First slide of ${post.title}`} className={styles.thumbImg} loading="lazy" />
          ) : (
            <div className={styles.thumbPlaceholder} aria-hidden="true">▦</div>
          )}
        </div>

        {/* Content */}
        <div className={styles.cardBody}>
          <div className={styles.cardTop}>
            <p className={styles.cardDate}>{post.date}</p>
            <div className={styles.badgeRow}>
              <Badge variant="muted">{post.theme}</Badge>
              <Badge variant={isRendered ? 'success' : 'warning'}>
                {isRendered ? 'rendered' : 'draft'}
              </Badge>
            </div>
          </div>

          <h3 className={styles.cardTitle}>{post.title}</h3>

          <p className={styles.cardMeta}>
            {slideCount} slide{slideCount !== 1 ? 's' : ''} · updated {relativeTime(post.updatedAt)}
          </p>

          {/* Actions */}
          <div className={styles.cardActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = `/?post=${post.id}`;
              }}
            >
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = `/?post=${post.id}&step=4`;
              }}
            >
              Export
            </Button>
            {isRendered && (
              <a
                href={`/api/posts/${post.id}/export.zip`}
                download
                className={styles.downloadLink}
              >
                <Button variant="ghost" size="sm">
                  Download ZIP
                </Button>
              </a>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(post)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// HistoryIslandInner
// ---------------------------------------------------------------------------

function HistoryIslandInner() {
  const { addToast } = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PostRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load posts
  useEffect(() => {
    async function load() {
      try {
        const data = await api<PostRow[]>('/api/posts');
        // newest first (API returns newest first already, but ensure)
        setPosts(data);
      } catch (err) {
        addToast(`Failed to load posts: ${(err as Error).message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [addToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/posts/${deleteTarget.id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      addToast('Post deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      addToast(`Delete failed: ${(err as Error).message}`, 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, addToast]);

  if (loading) {
    return (
      <div className={styles.loadingCenter}>
        <Spinner size={32} color="var(--primary)" />
        <span className={styles.loadingText}>Loading history…</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="◷"
        title="No posts yet"
        hint="Run the pipeline to generate your first slide post."
        action={
          <Button onClick={() => { window.location.href = '/'; }}>
            Create your first post
          </Button>
        }
      />
    );
  }

  const groups = groupByMonth(posts);

  return (
    <>
      <div className={styles.listRoot}>
        {groups.map((group) => (
          <section key={group.month} className={styles.monthGroup}>
            <h2 className={styles.monthHeading}>{group.month}</h2>
            <div className={styles.postList}>
              {group.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={(p) => setDeleteTarget(p)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
        title="Delete post?"
        message={`This will permanently remove "${deleteTarget?.title}" and its output folder. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        loading={deleting}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported island (wrapped in ToastProvider)
// ---------------------------------------------------------------------------

export default function HistoryIsland() {
  return (
    <ToastProvider>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>History</h1>
          <p className={styles.pageSubtitle}>All posts generated by newspapper.</p>
        </div>
        <HistoryIslandInner />
      </div>
    </ToastProvider>
  );
}
