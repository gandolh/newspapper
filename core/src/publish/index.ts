/**
 * Publishing: the manual state change that means "ready to post," and the
 * optimization pass that runs once, the first time a render is published.
 */

import { existsSync } from 'node:fs';
import { findPost, latestRender, markRenderOptimized, setPostStatus } from '../storage/index.js';
import type { DB } from '../storage/index.js';
import type { Post, RenderRecord } from '../types.js';
import { optimizeOutputDir, PUBLISH_JPEG_QUALITY } from './optimize.js';

export {
  optimizeOutputDir,
  optimizeSlideFile,
  slideFilesIn,
  PUBLISH_JPEG_QUALITY,
} from './optimize.js';

/**
 * The render's output directory is gone (manual cleanup, disk pruning). Its own
 * class so the route can answer a clean 404 without echoing a filesystem path,
 * the way the export route already does for the same case.
 */
export class OutputDirMissingError extends Error {
  constructor() {
    super('Output directory no longer exists');
    this.name = 'OutputDirMissingError';
  }
}

export interface PublishResult {
  post: Post;
  render: RenderRecord;
  /** Slides re-encoded by this call. 0 means the render was already optimized. */
  reencoded: number;
}

/**
 * Mark a post published. The first time this runs for a given render it
 * re-encodes the rendered JPEGs down to publish quality and flags the render
 * `optimized`; every call after that is a no-op re-encode (idempotent) so a
 * repeat publish never degrades the image further.
 */
export async function publishPost(db: DB, postId: number): Promise<PublishResult> {
  const post = findPost(db, postId);
  if (!post) {
    throw new Error(`Post ${postId} not found`);
  }

  const render = latestRender(db, postId);
  if (!render) {
    throw new Error(`Post ${postId} has not been rendered yet`);
  }

  // Checked up front, before the re-encode scans the directory: otherwise the
  // scan's ENOENT carried the absolute path out to the caller.
  if (!existsSync(render.outputDir)) {
    throw new OutputDirMissingError();
  }

  let reencoded = 0;
  let finalRender = render;
  if (!render.optimized) {
    reencoded = await optimizeOutputDir(render.outputDir, PUBLISH_JPEG_QUALITY);
    finalRender = markRenderOptimized(db, render.id) ?? render;
  }

  const publishedPost = setPostStatus(db, postId, 'published') ?? post;
  return { post: publishedPost, render: finalRender, reencoded };
}
