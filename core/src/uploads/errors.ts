export type UploadRejectionCode =
  | 'empty_upload'
  | 'file_too_large'
  | 'unsupported_format'
  | 'unreadable_image'
  | 'image_too_large';

/** A caller-facing rejection: the request was bad, not the server. */
export class UploadRejected extends Error {
  readonly code: UploadRejectionCode;
  readonly statusCode: number;

  constructor(code: UploadRejectionCode, statusCode: number, message: string) {
    super(message);
    this.name = 'UploadRejected';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isUploadRejected(err: unknown): err is UploadRejected {
  return err instanceof UploadRejected;
}
