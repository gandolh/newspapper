/**
 * Publishing: the manual state change that means "ready to post," and the
 * optimization pass that runs once, the first time a render is published.
 */

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

  let reencoded = 0;
  let finalRender = render;
  if (!render.optimized) {
    reencoded = await optimizeOutputDir(render.outputDir, PUBLISH_JPEG_QUALITY);
    finalRender = markRenderOptimized(db, render.id) ?? render;
  }

  const publishedPost = setPostStatus(db, postId, 'published') ?? post;
  return { post: publishedPost, render: finalRender, reencoded };
}
