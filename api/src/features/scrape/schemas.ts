import { z } from "zod";

const keywords = "keywords must be a list of strings";

/**
 * `POST /api/scrape  { keywords, maxPerSource? }`. No body, or no keyword left after trimming, is still
 * the stream's own `error` event, as the UI and the tests expect; a body of the wrong shape is a JSON 400
 * before the stream opens.
 */
export const scrapeSchema = z
  .object(
    {
      keywords: z.array(z.string({ error: keywords }), { error: keywords }).optional(),
      maxPerSource: z
        .number({ error: "maxPerSource must be a positive integer" })
        .int({ error: "maxPerSource must be a positive integer" })
        .positive({ error: "maxPerSource must be a positive integer" })
        .optional(),
    },
    { error: "body must be an object" },
  )
  .nullish();
