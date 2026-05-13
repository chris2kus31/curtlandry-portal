import { httpClient } from "./http-client";

// Types
export interface Site {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  logo_url: string | null;
  status: "active" | "inactive";
  settings: Record<string, unknown> | null;
  pages_count: number;
  created_at: string;
  updated_at: string;
}

export interface SitePage {
  id: number;
  site_id: number;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  sections_count: number;
  created_at: string;
  updated_at: string;
}

export interface SchemaField {
  key: string;
  type: "text" | "textarea" | "rich_text" | "image" | "url" | "color" | "select" | "list";
  label: string;
  item_fields?: SchemaField[];
}

export interface SectionSchema {
  fields: SchemaField[];
}

export interface SitePageSection {
  id: number;
  site_page_id: number;
  key: string;
  label: string;
  schema: SectionSchema | null;
  content: Record<string, unknown> | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: number;
  site_id: number | null;
  original_filename: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  uploaded_by: number | null;
  created_at: string;
}

export interface CreateSiteData {
  name: string;
  slug?: string;
  domain?: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface CreatePageData {
  title: string;
  slug?: string;
  is_published?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface CreateSectionData {
  key: string;
  label: string;
  schema?: SectionSchema;
  content?: Record<string, unknown>;
  is_visible?: boolean;
}

export const siteService = {
  // Sites
  async getSites(): Promise<Site[]> {
    const response = await httpClient.get<{ data: Site[] }>("/portal/admin/sites");
    return response.data || [];
  },

  async getSite(id: number): Promise<Site> {
    const response = await httpClient.get<{ data: Site }>(`/portal/admin/sites/${id}`);
    return response.data;
  },

  async createSite(data: CreateSiteData): Promise<Site> {
    const response = await httpClient.post<{ data: Site }>("/portal/admin/sites", data);
    return response.data;
  },

  async updateSite(id: number, data: Partial<CreateSiteData>): Promise<Site> {
    const response = await httpClient.put<{ data: Site }>(`/portal/admin/sites/${id}`, data);
    return response.data;
  },

  // Pages
  async getPages(siteId: number): Promise<SitePage[]> {
    const response = await httpClient.get<{ data: SitePage[] }>(`/portal/admin/sites/${siteId}/pages`);
    return response.data || [];
  },

  async createPage(siteId: number, data: CreatePageData): Promise<SitePage> {
    const response = await httpClient.post<{ data: SitePage }>(`/portal/admin/sites/${siteId}/pages`, data);
    return response.data;
  },

  async updatePage(siteId: number, pageId: number, data: Partial<CreatePageData & { is_published: boolean; sort_order: number }>): Promise<SitePage> {
    const response = await httpClient.put<{ data: SitePage }>(`/portal/admin/sites/${siteId}/pages/${pageId}`, data);
    return response.data;
  },

  async deletePage(siteId: number, pageId: number): Promise<void> {
    await httpClient.delete(`/portal/admin/sites/${siteId}/pages/${pageId}`);
  },

  // Sections
  async getSections(pageId: number): Promise<SitePageSection[]> {
    const response = await httpClient.get<{ data: SitePageSection[] }>(`/portal/admin/sites/pages/${pageId}/sections`);
    return response.data || [];
  },

  async createSection(pageId: number, data: CreateSectionData): Promise<SitePageSection> {
    const response = await httpClient.post<{ data: SitePageSection }>(`/portal/admin/sites/pages/${pageId}/sections`, data);
    return response.data;
  },

  async updateSection(sectionId: number, data: { content?: Record<string, unknown>; label?: string; schema?: SectionSchema; is_visible?: boolean }): Promise<SitePageSection> {
    const response = await httpClient.put<{ data: SitePageSection }>(`/portal/admin/sites/sections/${sectionId}`, data);
    return response.data;
  },

  async deleteSection(sectionId: number): Promise<void> {
    await httpClient.delete(`/portal/admin/sites/sections/${sectionId}`);
  },

  async reorderSections(pageId: number, order: number[]): Promise<void> {
    await httpClient.put(`/portal/admin/sites/pages/${pageId}/sections/reorder`, { order });
  },

  // Media
  async getMedia(params?: { site_id?: number; per_page?: number }): Promise<{ data: MediaAsset[]; meta: { total: number } }> {
    const response = await httpClient.get<{ data: MediaAsset[]; meta: { total: number } }>("/portal/admin/media", { params });
    return response;
  },

  async uploadMedia(file: File, siteId?: number, altText?: string): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append("file", file);
    if (siteId) formData.append("site_id", String(siteId));
    if (altText) formData.append("alt_text", altText);

    const response = await httpClient.post<{ data: MediaAsset }>("/portal/admin/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async deleteMedia(id: number): Promise<void> {
    await httpClient.delete(`/portal/admin/media/${id}`);
  },
};
