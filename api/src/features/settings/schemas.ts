import { z } from "zod";

/** `GET` and `PUT /api/settings`: the app-wide settings. */
export const settingsSchema = z.object({ defaultTheme: z.string() });

/**
 * `PUT /api/settings`: a patch. Whether `defaultTheme` names a theme on disk is the handler's check,
 * since the list is read from disk. The messages are the ones the handler sent before the schema. Any
 * other key is dropped: `saveSettings` stores every key it is given.
 */
export const settingsPatchSchema = z.object(
  {
    defaultTheme: z.string({ error: (issue) => `Unknown theme: "${String(issue.input)}"` }).optional(),
  },
  { error: "body must be an object" },
);
