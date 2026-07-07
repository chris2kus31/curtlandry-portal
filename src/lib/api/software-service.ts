// src/lib/api/software-service.ts
import { httpClient } from "./http-client";
import type { SoftwareCatalogItem } from "./onboarding-service";

// ---------------------------------------------------------------------------
// Types (mirror app/Http/Resources/Portal/Onboarding/SoftwareItemResource)
// ---------------------------------------------------------------------------

export type { SoftwareCatalogItem };

export interface SoftwareItemPayload {
  name: string;
  department?: string | null;
  is_active?: boolean;
  requires_approval?: boolean;
  notes?: string | null;
}

export interface SoftwareListFilters {
  is_active?: boolean;
  department?: string;
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

export const softwareService = {
  /**
   * List catalog items (requires software.manage).
   */
  async list(
    filters: SoftwareListFilters = {},
  ): Promise<PaginatedResponse<SoftwareCatalogItem>> {
    const params = new URLSearchParams();
    if (filters.is_active !== undefined)
      params.append("is_active", filters.is_active ? "1" : "0");
    if (filters.department) params.append("department", filters.department);
    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_dir) params.append("sort_dir", filters.sort_dir);
    if (filters.per_page) params.append("per_page", String(filters.per_page));

    const qs = params.toString();
    return await httpClient.get<PaginatedResponse<SoftwareCatalogItem>>(
      `/portal/onboarding/software${qs ? `?${qs}` : ""}`,
    );
  },

  /**
   * Create a catalog item (requires software.manage).
   */
  async create(payload: SoftwareItemPayload): Promise<SoftwareCatalogItem> {
    const response = await httpClient.post<ApiResponse<SoftwareCatalogItem>>(
      "/portal/onboarding/software",
      payload,
    );
    return response.data;
  },

  /**
   * Update a catalog item (requires software.manage).
   */
  async update(
    id: number,
    payload: Partial<SoftwareItemPayload>,
  ): Promise<SoftwareCatalogItem> {
    const response = await httpClient.patch<ApiResponse<SoftwareCatalogItem>>(
      `/portal/onboarding/software/${id}`,
      payload,
    );
    return response.data;
  },

  /**
   * Delete a catalog item (requires software.manage).
   */
  async remove(id: number): Promise<void> {
    await httpClient.delete<ApiResponse<null>>(
      `/portal/onboarding/software/${id}`,
    );
  },
};
