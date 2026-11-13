/**
 * Choosing what an `<Image>` points at.
 *
 * `src` carries a bare upload ref, never a path — the compiler is what turns
 * it into a URL, so the same markup renders correctly in the browser and in
 * headless Chromium. The list's `url` is a same-origin relative path, and
 * `width`/`height` describe the normalized copy, so the aspect ratio is right
 * without measuring anything.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EmptyState, Modal, Skeleton } from "../ui";
import { api, ApiError } from "@/lib/api";
import { withBase } from "@/lib/base";

/** An upload's thumbnail URL. `upload.url` is the server's origin-relative
 * `/uploads/<ref>`; the browser resolves it, so it needs the base. */
export function uploadThumbSrc(url: string): string {
  return withBase(url);
}

export interface UploadSummary {
  id: number;
  ref: string;
  filename: string;
  width: number | null;
  height: number | null;
  bytes: number;
  src: string;
  url: string;
}

export interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onChoose: (ref: string) => void;
}

export function ImagePicker({ open, onClose, onChoose }: ImagePickerProps) {
  const [uploads, setUploads] = useState<UploadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setUploads(await api<UploadSummary[]>("/api/uploads?limit=200"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not list uploads.");
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    // Kept as an effect. Opening the picker is an event, but not one this
    // component sees: `open` is flipped by three separate call sites in
    // `EditorIsland` (the palette's Image button, the inspector's Choose, and a
    // drop). The prop flip is the one place that sees all of them, and the list
    // must be re-read on each open or a just-finished upload is missing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void load();
  }, [open, load]);

  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const created = await api<UploadSummary>("/api/uploads", { method: "POST", body });
      onChoose(created.src);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" width={680}>
      <div className="mb-half flex items-center gap-hair">
        <Button size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
          Upload an image
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="absolute -m-px size-px overflow-hidden border-0 p-0 whitespace-nowrap [clip-path:inset(50%)]"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      {error && (
        <p
          className="mb-snug border-l-2 border-grease pl-snug font-chrome text-hint leading-hint font-medium text-grease"
          role="alert"
        >
          {error}
        </p>
      )}

      {uploads === null && <Skeleton height={120} />}

      {uploads !== null && uploads.length === 0 && !error && (
        <EmptyState title="No uploads yet" hint="Upload an image and it will appear here." />
      )}

      {uploads !== null && uploads.length > 0 && (
        <ul // Every thumbnail at one fixed scale on a shared baseline, so the grid is a true comparison (The Fixed Scale Rule).
          className="grid max-h-[50vh] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-snug overflow-auto"
        >
          {uploads.map((upload) => (
            <li key={upload.id}>
              <Button
                variant="ghost"
                className="h-auto w-full flex-col items-stretch gap-[4px] p-[4px] text-left"
                onClick={() => {
                  onChoose(upload.src);
                  onClose();
                }}
              >
                <img
                  src={uploadThumbSrc(upload.url)}
                  alt={upload.filename}
                  width={upload.width ?? undefined}
                  height={upload.height ?? undefined}
                  className="h-[104px] w-full bg-board object-cover shadow-[0_0_0_1px_var(--color-hairline)]"
                  loading="lazy"
                />
                <span className="max-w-full overflow-hidden text-label leading-label font-semibold text-ellipsis whitespace-nowrap text-graphite-soft">
                  {upload.filename}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
