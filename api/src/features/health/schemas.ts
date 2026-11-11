import { z } from "zod";

/** `GET /api/health`: the container's health check reads only the status. */
export const healthSchema = z.object({ ok: z.literal(true) });
