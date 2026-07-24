import { httpClient } from "./http-client";

export interface MediaAsset {
  id: number;
  site_id: number | null;
  original_filename: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  uploaded_by: number | null;
  created_at: string | null;
}

interface UploadOptions {
  siteId?: number | null;
  altText?: string;
  onProgress?: (percent: number) => void;
}

export const mediaService = {
  async upload(file: File, opts: UploadOptions = {}): Promise<MediaAsset> {
    const form = new FormData();
    form.append("file", file);
    if (opts.siteId != null) form.append("site_id", String(opts.siteId));
    if (opts.altText) form.append("alt_text", opts.altText);

    const res = await httpClient.post<{ data: MediaAsset }>(
      "/portal/admin/media/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (opts.onProgress && e.total) {
            opts.onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      },
    );

    return res.data;
  },

  async delete(id: number): Promise<void> {
    await httpClient.delete(`/portal/admin/media/${id}`);
  },
};

/**
 * Pulls a human-readable message out of whatever the upload threw. The
 * httpClient rejects with a plain ApiError object ({ message, errors }),
 * NOT an Error instance — so `err.message` alone (guarded by
 * `instanceof Error`) silently drops the real reason. This prefers the
 * field-level validation message (e.g. the mimes error), then the top-level
 * message, then a generic fallback.
 */
export function extractUploadErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      errors?: Record<string, unknown>;
    };
    if (e.errors && typeof e.errors === "object") {
      const first = Object.values(e.errors)[0];
      if (Array.isArray(first) && typeof first[0] === "string") {
        return first[0];
      }
    }
    if (typeof e.message === "string" && e.message.trim()) {
      return e.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong uploading the image. Please try again.";
}
