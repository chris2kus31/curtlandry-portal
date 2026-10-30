// src/lib/api/asset-service.ts
import { httpClient } from "./http-client";

// ---------------------------------------------------------------------------
// Types (mirror app/Http/Resources/Portal/Onboarding/AssetResource + options)
// ---------------------------------------------------------------------------

export interface AssetAssignmentHistory {
  id: number;
  user_id: number;
  user_name: string | null;
  onboarding_case_id: number | null;
  offboarding_case_id: number | null;
  assigned_at: string | null;
  released_at: string | null;
  note: string | null;
}

export interface Asset {
  id: number;
  asset_tag: string | null;
  serial_number: string | null;
  type: string | null;
  type_label: string | null;
  /** Asset Tiger category this device belongs to; links a device to a device category option. */
  asset_category_id: number | null;
  /** Only present when the API eager-loads the category relation. */
  asset_category_name?: string | null;
  name: string;
  status: string | null;
  status_label: string | null;
  status_color: string | null;
  is_assignable: boolean;
  /** Portal-only assets may be hard-deleted; AT-linked must be retired. */
  can_delete?: boolean;
  /** Server-rendered "who has this" line (assignee, Asset Tiger holder, or status help). */
  holder_label: string | null;
  image_url?: string | null;
  asset_tiger_ref_id?: number | null;
  is_out_of_sync?: boolean;
  assigned_user_id: number | null;
  purchase_date: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_user?: { id: number; name: string; email: string };
  assignments?: AssetAssignmentHistory[];
}

/**
 * A device category offered in the new-hire picker, driven by
 * `asset_categories.show_in_intake` on the API.
 *
 * `value` is the asset_categories id. `icon_key` is resolved server-side so
 * renaming a category in Asset Tiger does not break portal icons.
 */
export interface DeviceCategoryOption {
  /** asset_categories.id — integer from the API. */
  value: number;
  label: string;
  icon_key?: string;
  asset_tiger_ref_id: number | null;
  /** Assignable devices in this category at the time options were fetched. */
  assignable_count: number;
}

/** Status / assignable filter chip supplied by GET assets/options. */
export interface AssetStatusFilterOption {
  value: string;
  label: string;
  description?: string;
  /** When true, list with assignable=1 instead of status=. */
  assignable?: boolean;
}

/** An Asset Tiger category plus the portal-owned settings People Ops controls. */
export interface AssetCategory {
  id: number;
  name: string;
  asset_tiger_ref_id: number | null;
  parent_asset_tiger_ref_id: number | null;
  show_in_intake: boolean;
  is_tracked: boolean;
  sort_order: number;
  asset_tiger_synced_at: string | null;
  assets_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Only the portal-owned settings are writable — Asset Tiger owns the rest. */
export interface AssetCategoryPayload {
  show_in_intake?: boolean;
  is_tracked?: boolean;
  sort_order?: number;
}

export interface AssetInventoryCounts {
  total: number;
  assignable: number;
  by_status: Record<string, number>;
}

export interface AssetOptions {
  types: Record<string, string>;
  statuses: Record<string, string>;
  status_colors: Record<string, string>;
  /** Plain-language explanation per status value, for filter hints and row copy. */
  status_descriptions: Record<string, string>;
  transitions: Record<string, string[]>;
  assignable_statuses: string[];
  /** Preferred filter list from the API (includes assignable pool). */
  status_filters?: AssetStatusFilterOption[];
  device_categories: DeviceCategoryOption[];
}

export interface AssetPayload {
  asset_tag?: string | null;
  serial_number?: string | null;
  type: string;
  name: string;
  status?: string | null;
  purchase_date?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export interface AssetListFilters {
  status?: string;
  type?: string;
  asset_category_id?: number;
  assignable?: boolean;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  links?: unknown;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const assetService = {
  async list(filters: AssetListFilters = {}): Promise<PaginatedResponse<Asset>> {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.type) params.append("type", filters.type);
    if (filters.asset_category_id)
      params.append("asset_category_id", String(filters.asset_category_id));
    if (filters.assignable) params.append("assignable", "1");
    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_dir) params.append("sort_dir", filters.sort_dir);
    if (filters.per_page) params.append("per_page", String(filters.per_page));
    if (filters.page) params.append("page", String(filters.page));

    const qs = params.toString();
    return await httpClient.get<PaginatedResponse<Asset>>(
      `/portal/onboarding/assets${qs ? `?${qs}` : ""}`,
    );
  },

  async get(id: number): Promise<Asset> {
    const response = await httpClient.get<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}`,
    );
    return response.data;
  },

  async getOptions(): Promise<AssetOptions> {
    const response = await httpClient.get<ApiResponse<AssetOptions>>(
      "/portal/onboarding/assets/options",
    );
    return response.data;
  },

  /** Full-inventory counters (not filter-scoped). Same numbers as people-ops stats.assets. */
  async getStats(): Promise<AssetInventoryCounts> {
    const response = await httpClient.get<ApiResponse<AssetInventoryCounts>>(
      "/portal/onboarding/assets/stats",
    );
    return response.data;
  },

  /** Asset Tiger categories with the portal settings People Ops controls. */
  async listCategories(): Promise<AssetCategory[]> {
    const response = await httpClient.get<ApiResponse<AssetCategory[]>>(
      "/portal/onboarding/assets/categories",
    );
    return response.data;
  },

  async updateCategory(
    id: number,
    payload: AssetCategoryPayload,
  ): Promise<AssetCategory> {
    const response = await httpClient.patch<ApiResponse<AssetCategory>>(
      `/portal/onboarding/assets/categories/${id}`,
      payload,
    );
    return response.data;
  },

  async create(payload: AssetPayload): Promise<Asset> {
    const response = await httpClient.post<ApiResponse<Asset>>(
      "/portal/onboarding/assets",
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: Partial<AssetPayload>): Promise<Asset> {
    const response = await httpClient.patch<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}`,
      payload,
    );
    return response.data;
  },

  async changeStatus(id: number, status: string, note?: string): Promise<Asset> {
    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/status`,
      { status, ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async assign(id: number, userId: number, note?: string): Promise<Asset> {
    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/assign`,
      { user_id: userId, ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async release(id: number, status?: string, note?: string): Promise<Asset> {
    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/release`,
      { ...(status ? { status } : {}), ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await httpClient.delete<ApiResponse<null>>(
      `/portal/onboarding/assets/${id}`,
    );
  },
};
