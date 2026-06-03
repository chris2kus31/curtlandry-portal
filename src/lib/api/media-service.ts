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
