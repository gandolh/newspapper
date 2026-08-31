/**
 * Choosing what an `<Image>` points at.
 *
 * `src` carries a bare upload ref, never a path — the compiler is what turns
 * it into a URL, so the same markup renders correctly in the browser and in
 * headless Chromium. The list's `url` is a same-origin relative path, and
 * `width`/`height` describe the normalized copy, so the aspect ratio is right
 * without measuring anything.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, EmptyState, Modal, Skeleton } from '../ui';
import { api, ApiError } from '@/lib/api';
import styles from './ImagePicker.module.css';

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

export default function ImagePicker({ open, onClose, onChoose }: ImagePickerProps) {
  const [uploads, setUploads] = useState<UploadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setUploads(await api<UploadSummary[]>('/api/uploads?limit=200'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not list uploads.');
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const created = await api<UploadSummary>('/api/uploads', { method: 'POST', body });
      onChoose(created.src);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose an image" width={680}>
      <div className={styles.toolbar}>
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
          className={styles.file}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void upload(file);
          }}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {uploads === null && <Skeleton height={120} />}

      {uploads !== null && uploads.length === 0 && !error && (
        <EmptyState title="No uploads yet" hint="Upload an image and it will appear here." />
      )}

      {uploads !== null && uploads.length > 0 && (
        <ul className={styles.grid}>
          {uploads.map((upload) => (
            <li key={upload.id}>
              <Button
                variant="ghost"
                className={styles.tile}
                onClick={() => {
                  onChoose(upload.src);
                  onClose();
                }}
              >
                <img
                  src={upload.url}
                  alt={upload.filename}
                  width={upload.width ?? undefined}
                  height={upload.height ?? undefined}
                  className={styles.thumb}
                  loading="lazy"
                />
                <span className={styles.name}>{upload.filename}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
