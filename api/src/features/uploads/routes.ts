import { createReadStream, statSync } from "node:fs";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { FastifyReply } from "fastify";
import multipart from "@fastify/multipart";
import {
  MAX_UPLOAD_BYTES,
  UploadRejected,
  deleteUpload,
  findUpload,
  findUploadByRef,
  listUploads,
  saveUpload,
  uploadFiles,
  uploadOriginalPath,
  uploadPublicPath,
  uploadRef,
} from "@newspapper/core";
import type { Upload } from "@newspapper/core";
import { db } from "../../lib/db.js";
import { errorSchema } from "../../lib/schemas.js";
import {
  deletedSchema,
  refParamsSchema,
  storedUploadSchema,
  uploadErrorSchema,
  uploadListSchema,
  uploadParamsSchema,
  uploadQuerySchema,
  uploadSchema,
} from "./schemas.js";

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

interface UploadResponse {
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

function toUploadResponse(upload: Upload): UploadResponse {
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

/** A rejection's status, as one the route declares: core rejects with 400, 413 or 415. */
function rejectionStatus(status: number): 400 | 413 | 415 {
  return status === 413 || status === 415 ? status : 400;
}

function isFileTooLarge(err: unknown): boolean {
  return (err as { code?: string })?.code === "FST_REQ_FILE_TOO_LARGE";
}

function sendFile(reply: FastifyReply, path: string, mime: string) {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return reply.status(404).send({ error: "Upload file is missing from the store." });
  }
  return reply
    .header("Content-Length", String(size))
    .header("Cache-Control", IMMUTABLE_CACHE)
    .header("X-Content-Type-Options", "nosniff")
    .type(mime)
    .send(createReadStream(path));
}

export const uploadsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 8, parts: 12, headerPairs: 200 },
  });

  /**
   * POST /api/uploads — multipart/form-data with a single file part.
   *
   * The body is multipart, which no body schema reads (scripts/conventions.json records the
   * exception); `req.file()` and the plugin's limits take its place. The reply is JSON, and declares
   * each status the handler sends.
   */
  const postSchema = {
    response: { 201: storedUploadSchema, 400: uploadErrorSchema, 413: uploadErrorSchema, 415: uploadErrorSchema },
  };
  fastify.post("/api/uploads", { schema: postSchema }, async (req, reply) => {
    if (!req.isMultipart()) {
      return reply.status(415).send({ error: "Expected multipart/form-data with a single file part." });
    }

    let data: Buffer;
    let filename: string;
    try {
      const part = await req.file();
      if (!part) return reply.status(400).send({ error: "No file part was provided." });
      filename = part.filename ?? "upload";
      data = await part.toBuffer();
    } catch (err) {
      if (isFileTooLarge(err)) {
        return reply.status(413).send({
          error: `That file is larger than the ${MAX_UPLOAD_BYTES} byte (10 MB) limit.`,
          code: "file_too_large",
        });
      }
      throw err;
    }

    try {
      const stored = await saveUpload(db(), { filename, data });
      return reply.status(201).send({ ...toUploadResponse(stored.upload), original: stored.original });
    } catch (err) {
      if (err instanceof UploadRejected) {
        return reply.status(rejectionStatus(err.statusCode)).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  /**
   * GET /api/uploads?limit=&offset=
   */
  fastify.get(
    "/api/uploads",
    { schema: { querystring: uploadQuerySchema, response: { 200: uploadListSchema } } },
    async (req, reply) => {
      const { limit, offset } = req.query;
      return reply.send(listUploads(db(), { limit, offset }).map(toUploadResponse));
    },
  );

  /**
   * GET /api/uploads/:id
   */
  fastify.get(
    "/api/uploads/:id",
    { schema: { params: uploadParamsSchema, response: { 200: uploadSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      const upload = findUpload(db(), id);
      if (!upload) return reply.status(404).send({ error: `Upload ${id} not found` });
      return reply.send(toUploadResponse(upload));
    },
  );

  /**
   * DELETE /api/uploads/:id — removes both files and the row.
   */
  fastify.delete(
    "/api/uploads/:id",
    { schema: { params: uploadParamsSchema, response: { 200: deletedSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      const removed = deleteUpload(db(), id);
      if (!removed) return reply.status(404).send({ error: `Upload ${id} not found` });
      return reply.send({ id, deleted: true });
    },
  );

  /**
   * GET /uploads/:ref — normalized bytes. **Guarded**, as of the Ward cutover.
   *
   * This route used to be `config: { public: true }`, because the headless
   * Chromium that renders slides fetches images mid-render and carries no
   * session cookie. While newspapper was loopback-only that exposure was
   * bounded by the ref's entropy **and by an unreachable port**; moving to the
   * shared VPS would have left only the entropy.
   *
   * It is closed now because the renderer stopped making the request:
   * `core/src/render/uploads-route.ts` intercepts `/uploads/*` inside the
   * browser context and fulfils it from disk — the same mechanism `fonts.ts`
   * already used, and chosen over a render-scoped token because it removes the
   * request rather than authorising it. **If rendering ever starts producing
   * blank images, that interception is what broke**, and the fix is there
   * rather than reopening this route.
   *
   * A file stream, so no response schema (scripts/conventions.json records the exception). The ref
   * is parsed by its params schema; one that isn't a ref is the handler's 404.
   */
  fastify.get("/uploads/:ref", { schema: { params: refParamsSchema } }, async (req, reply) => {
    const { ref } = req.params;
    const upload = ref ? findUploadByRef(db(), ref) : undefined;
    if (!upload) return reply.status(404).send({ error: "Upload not found" });
    return sendFile(reply, uploadFiles(upload).served, upload.mime);
  });

  /**
   * GET /uploads/:ref/original — the untouched upload. Guarded, same as above.
   *
   * The render interception deliberately does **not** serve this variant: the
   * renderer only ever wants the normalized bytes, and widening it would be a
   * second decision hiding inside a performance change.
   */
  fastify.get("/uploads/:ref/original", { schema: { params: refParamsSchema } }, async (req, reply) => {
    const { ref } = req.params;
    const upload = ref ? findUploadByRef(db(), ref) : undefined;
    if (!upload) return reply.status(404).send({ error: "Upload not found" });
    return sendFile(reply, uploadFiles(upload).original, upload.mime);
  });
};
