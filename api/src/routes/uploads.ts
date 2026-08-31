import { createReadStream, statSync } from 'node:fs';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import {
  MAX_UPLOAD_BYTES,
  UploadRejected,
  deleteUpload,
  findUpload,
  findUploadByRef,
  listUploads,
  parseUploadRef,
  saveUpload,
  uploadFiles,
  uploadOriginalPath,
  uploadPublicPath,
  uploadRef,
} from '@newspapper/core';
import type { Upload } from '@newspapper/core';
import { db } from '../lib/db.js';

const MAX_LIST_LIMIT = 500;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export interface UploadResponse {
  id: number;
  ref: string;
  filename: string;
  mime: string;
  width: number | null;
  height: number | null;
  bytes: number;
  createdAt: string;
  /** The value to write into `<Image src="...">`. */
  src: string;
  /** Normalized bytes — what the renderer and the picker load. */
  url: string;
  /** The untouched upload. */
  originalUrl: string;
}

export function toUploadResponse(upload: Upload): UploadResponse {
  const ref = uploadRef(upload);
  return {
    id: upload.id,
    ref,
    filename: upload.filename,
    mime: upload.mime,
    width: upload.width,
    height: upload.height,
    bytes: upload.bytes,
    createdAt: upload.createdAt,
    src: ref,
    url: uploadPublicPath(ref),
    originalUrl: uploadOriginalPath(ref),
  };
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function isFileTooLarge(err: unknown): boolean {
  return (err as { code?: string })?.code === 'FST_REQ_FILE_TOO_LARGE';
}

function sendFile(reply: FastifyReply, path: string, mime: string) {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return reply.status(404).send({ error: 'Upload file is missing from the store.' });
  }
  return reply
    .header('Content-Length', String(size))
    .header('Cache-Control', IMMUTABLE_CACHE)
    .header('X-Content-Type-Options', 'nosniff')
    .type(mime)
    .send(createReadStream(path));
}

const uploadsRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 8, parts: 12, headerPairs: 200 },
  });

  /**
   * POST /api/uploads — multipart/form-data with a single file part.
   */
  fastify.post('/api/uploads', async (req, reply) => {
    if (!req.isMultipart()) {
      return reply
        .status(415)
        .send({ error: 'Expected multipart/form-data with a single file part.' });
    }

    let data: Buffer;
    let filename: string;
    try {
      const part = await req.file();
      if (!part) return reply.status(400).send({ error: 'No file part was provided.' });
      filename = part.filename ?? 'upload';
      data = await part.toBuffer();
    } catch (err) {
      if (isFileTooLarge(err)) {
        return reply.status(413).send({
          error: `That file is larger than the ${MAX_UPLOAD_BYTES} byte (10 MB) limit.`,
          code: 'file_too_large',
        });
      }
      throw err;
    }

    try {
      const stored = await saveUpload(db(), { filename, data });
      return reply
        .status(201)
        .send({ ...toUploadResponse(stored.upload), original: stored.original });
    } catch (err) {
      if (err instanceof UploadRejected) {
        return reply.status(err.statusCode).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  /**
   * GET /api/uploads?limit=&offset=
   */
  fastify.get('/api/uploads', async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = positiveInt(query.limit, 100, MAX_LIST_LIMIT);
    const offset = positiveInt(query.offset, 0, Number.MAX_SAFE_INTEGER);
    return reply.send(listUploads(db(), { limit, offset }).map(toUploadResponse));
  });

  /**
   * GET /api/uploads/:id
   */
  fastify.get('/api/uploads/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.status(400).send({ error: 'id must be an integer' });
    const upload = findUpload(db(), id);
    if (!upload) return reply.status(404).send({ error: `Upload ${id} not found` });
    return reply.send(toUploadResponse(upload));
  });

  /**
   * DELETE /api/uploads/:id — removes both files and the row.
   */
  fastify.delete('/api/uploads/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.status(400).send({ error: 'id must be an integer' });
    const removed = deleteUpload(db(), id);
    if (!removed) return reply.status(404).send({ error: `Upload ${id} not found` });
    return reply.send({ id, deleted: true });
  });

  /**
   * GET /uploads/:ref — normalized bytes. Public: headless Chromium fetches
   * this at render time and carries no session cookie.
   */
  fastify.get('/uploads/:ref', { config: { public: true } }, async (req, reply) => {
    const ref = parseUploadRef((req.params as { ref: string }).ref);
    const upload = ref ? findUploadByRef(db(), ref) : undefined;
    if (!upload) return reply.status(404).send({ error: 'Upload not found' });
    return sendFile(reply, uploadFiles(upload).served, upload.mime);
  });

  /**
   * GET /uploads/:ref/original — the untouched upload.
   */
  fastify.get('/uploads/:ref/original', { config: { public: true } }, async (req, reply) => {
    const ref = parseUploadRef((req.params as { ref: string }).ref);
    const upload = ref ? findUploadByRef(db(), ref) : undefined;
    if (!upload) return reply.status(404).send({ error: 'Upload not found' });
    return sendFile(reply, uploadFiles(upload).original, upload.mime);
  });
};

export default uploadsRoutes;
