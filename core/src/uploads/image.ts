import sharp from 'sharp';
import { UploadRejected } from './errors.js';

export type UploadFormat = 'jpeg' | 'png' | 'webp';

export const ACCEPTED_FORMATS: readonly UploadFormat[] = ['jpeg', 'png', 'webp'];

export const ACCEPTED_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Largest file the API will accept, in bytes. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Largest decoded bitmap, in pixels — a small file can decode enormous. */
export const MAX_SOURCE_PIXELS = 40_000_000;

/** Largest decoded edge, in pixels. */
export const MAX_SOURCE_DIMENSION = 12_000;

/** Longest edge of the normalized copy: 2x the 1080 canvas. */
export const MAX_NORMALIZED_DIMENSION = 2160;

export const FORMAT_EXTENSION: Readonly<Record<UploadFormat, string>> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export const FORMAT_MIME: Readonly<Record<UploadFormat, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export interface ProbedImage {
  format: UploadFormat;
  width: number;
  height: number;
}

export interface NormalizedImage {
  data: Buffer;
  format: UploadFormat;
  width: number;
  height: number;
}

function isAcceptedFormat(format: string | undefined): format is UploadFormat {
  return format !== undefined && (ACCEPTED_FORMATS as readonly string[]).includes(format);
}

/**
 * Read the real format and dimensions out of the bytes. The declared
 * Content-Type and the filename extension are ignored entirely.
 */
export async function probeImage(data: Buffer): Promise<ProbedImage> {
  let metadata;
  try {
    metadata = await sharp(data, { limitInputPixels: false }).metadata();
  } catch {
    throw new UploadRejected(
      'unreadable_image',
      415,
      'That file could not be decoded as an image.',
    );
  }

  if (!isAcceptedFormat(metadata.format)) {
    const seen = metadata.format ? ` (got ${metadata.format})` : '';
    throw new UploadRejected(
      'unsupported_format',
      415,
      `Only JPEG, PNG, and WebP images are accepted${seen}.`,
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 1 || height < 1) {
    throw new UploadRejected('unreadable_image', 415, 'That image reports no usable dimensions.');
  }
  if (width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION) {
    throw new UploadRejected(
      'image_too_large',
      413,
      `Image is ${width}x${height}; the longest edge may be at most ${MAX_SOURCE_DIMENSION}px.`,
    );
  }
  if (width * height > MAX_SOURCE_PIXELS) {
    throw new UploadRejected(
      'image_too_large',
      413,
      `Image decodes to ${width * height} pixels; the limit is ${MAX_SOURCE_PIXELS}.`,
    );
  }

  return { format: metadata.format, width, height };
}

/**
 * Auto-orient, downscale to fit MAX_NORMALIZED_DIMENSION, and re-encode in the
 * source format. Re-encoding drops every metadata block, EXIF included.
 */
export async function normalizeImage(data: Buffer, format: UploadFormat): Promise<NormalizedImage> {
  const pipeline = sharp(data, { limitInputPixels: MAX_SOURCE_PIXELS }).rotate().resize({
    width: MAX_NORMALIZED_DIMENSION,
    height: MAX_NORMALIZED_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const encoded =
    format === 'jpeg'
      ? pipeline.jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
      : format === 'png'
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.webp({ quality: 90 });

  try {
    const { data: out, info } = await encoded.toBuffer({ resolveWithObject: true });
    return { data: out, format, width: info.width, height: info.height };
  } catch {
    throw new UploadRejected(
      'unreadable_image',
      415,
      'That image could not be decoded — it may be truncated or corrupt.',
    );
  }
}
