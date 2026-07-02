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
  name: string;
  status: string | null;
  status_label: string | null;
  status_color: string | null;
  is_assignable: boolean;
  assigned_user_id: number | null;
  purchase_date: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  assigned_user?: { id: number; name: string; email: string };
  assignments?: AssetAssignmentHistory[];
}

export interface AssetOptions {
  types: Record<string, string>;
  statuses: Record<string, string>;
  status_colors: Record<string, string>;
  transitions: Record<string, string[]>;
  assignable_statuses: string[];
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
  assignable?: boolean;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  per_page?: number;
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
    if (filters.assignable) params.append("assignable", "1");
    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_dir) params.append("sort_dir", filters.sort_dir);
    if (filters.per_page) params.append("per_page", String(filters.per_page));

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
