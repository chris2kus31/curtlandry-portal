// src/lib/api/asset-service.ts
import { httpClient } from "./http-client";
import {
  findDevAsset,
  getDevAssetOptions,
  getDevAssets,
  getDevEmployees,
  isDevAuthToken,
  removeDevAsset,
  upsertDevAsset,
} from "@/lib/dev-auth";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

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
  image_url?: string | null;
  asset_tiger_ref_id?: number | null;
  at_ready_for_reassignment?: boolean;
  at_assigned_person_name?: string | null;
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
    if (isDevAuthToken(getStoredToken())) {
      let assets = getDevAssets();
      if (filters.assignable) {
        assets = assets.filter((a) => a.is_assignable);
      }
      if (filters.type) {
        assets = assets.filter((a) => a.type === filters.type);
      }
      if (filters.status) {
        assets = assets.filter((a) => a.status === filters.status);
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        assets = assets.filter(
          (a) =>
            a.name.toLowerCase().includes(term) ||
            a.asset_tag?.toLowerCase().includes(term) ||
            a.serial_number?.toLowerCase().includes(term),
        );
      }
      return {
        data: assets,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: filters.per_page ?? assets.length,
          total: assets.length,
        },
      };
    }

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
    if (isDevAuthToken(getStoredToken())) {
      const asset = findDevAsset(id);
      if (!asset) throw new Error("Asset not found");
      return { ...asset, assignments: asset.assignments ? [...asset.assignments] : [] };
    }

    const response = await httpClient.get<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}`,
    );
    return response.data;
  },

  async getOptions(): Promise<AssetOptions> {
    if (isDevAuthToken(getStoredToken())) {
      return getDevAssetOptions();
    }

    const response = await httpClient.get<ApiResponse<AssetOptions>>(
      "/portal/onboarding/assets/options",
    );
    return response.data;
  },

  async create(payload: AssetPayload): Promise<Asset> {
    if (isDevAuthToken(getStoredToken())) {
      const options = getDevAssetOptions();
      const status = payload.status ?? "available";
      const created: Asset = {
        id: Math.floor(Math.random() * 100000) + 10000,
        asset_tag: payload.asset_tag ?? null,
        serial_number: payload.serial_number ?? null,
        type: payload.type,
        type_label: options.types[payload.type] ?? payload.type,
        name: payload.name,
        status,
        status_label: options.statuses[status] ?? status,
        status_color: options.status_colors[status] ?? "gray",
        is_assignable: options.assignable_statuses.includes(status),
        image_url:
          payload.type === "desktop"
            ? "/devices/desktop.svg"
            : payload.type === "tablet"
              ? "/devices/tablet.svg"
              : "/devices/laptop.svg",
        assigned_user_id: null,
        purchase_date: payload.purchase_date ?? null,
        cost: payload.cost ?? null,
        notes: payload.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignments: [],
      };
      return upsertDevAsset(created);
    }

    const response = await httpClient.post<ApiResponse<Asset>>(
      "/portal/onboarding/assets",
      payload,
    );
    return response.data;
  },

  async update(id: number, payload: Partial<AssetPayload>): Promise<Asset> {
    if (isDevAuthToken(getStoredToken())) {
      const existing = findDevAsset(id);
      if (!existing) throw new Error("Asset not found");
      const options = getDevAssetOptions();
      const status = payload.status ?? existing.status ?? "available";
      const type = payload.type ?? existing.type ?? "other";
      return upsertDevAsset({
        ...existing,
        ...payload,
        type,
        type_label: options.types[type] ?? existing.type_label,
        status,
        status_label: options.statuses[status] ?? existing.status_label,
        status_color: options.status_colors[status] ?? existing.status_color,
        is_assignable: options.assignable_statuses.includes(status),
      });
    }

    const response = await httpClient.patch<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}`,
      payload,
    );
    return response.data;
  },

  async changeStatus(id: number, status: string, note?: string): Promise<Asset> {
    if (isDevAuthToken(getStoredToken())) {
      const existing = findDevAsset(id);
      if (!existing) throw new Error("Asset not found");
      if (status === "assigned") {
        throw new Error("Use Assign to employee to mark a device as assigned");
      }
      const options = getDevAssetOptions();
      const allowed = existing.status
        ? options.transitions[existing.status] ?? []
        : [];
      if (!allowed.includes(status)) {
        throw new Error("That status change isn’t allowed from the current status");
      }
      return upsertDevAsset({
        ...existing,
        status,
        status_label: options.statuses[status] ?? status,
        status_color: options.status_colors[status] ?? "gray",
        is_assignable: options.assignable_statuses.includes(status),
        assigned_user_id:
          status === "available" ? null : existing.assigned_user_id,
        assigned_user:
          status === "available" ? undefined : existing.assigned_user,
        notes: note
          ? [existing.notes, note].filter(Boolean).join("\n")
          : existing.notes,
      });
    }

    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/status`,
      { status, ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async assign(id: number, userId: number, note?: string): Promise<Asset> {
    if (isDevAuthToken(getStoredToken())) {
      if (!userId) {
        throw new Error("Select an employee before assigning");
      }
      const existing = findDevAsset(id);
      if (!existing) throw new Error("Asset not found");
      if (!existing.is_assignable) {
        throw new Error("This device isn’t available to assign");
      }
      const employee = getDevEmployees().find((e) => e.id === userId);
      if (!employee) {
        throw new Error("Select a valid employee before assigning");
      }
      const options = getDevAssetOptions();
      const history = {
        id: Math.floor(Math.random() * 100000) + 1,
        user_id: employee.id,
        user_name: employee.name,
        onboarding_case_id: null,
        offboarding_case_id: null,
        assigned_at: new Date().toISOString(),
        released_at: null,
        note: note ?? null,
      };
      return upsertDevAsset({
        ...existing,
        status: "assigned",
        status_label: options.statuses.assigned,
        status_color: options.status_colors.assigned,
        is_assignable: false,
        assigned_user_id: employee.id,
        assigned_user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
        },
        assignments: [...(existing.assignments ?? []), history],
      });
    }

    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/assign`,
      { user_id: userId, ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async release(id: number, status?: string, note?: string): Promise<Asset> {
    if (isDevAuthToken(getStoredToken())) {
      const existing = findDevAsset(id);
      if (!existing) throw new Error("Asset not found");
      const nextStatus = status || "available";
      const options = getDevAssetOptions();
      const assignments = (existing.assignments ?? []).map((entry) =>
        entry.released_at
          ? entry
          : {
              ...entry,
              released_at: new Date().toISOString(),
              note: note ?? entry.note,
            },
      );
      return upsertDevAsset({
        ...existing,
        status: nextStatus,
        status_label: options.statuses[nextStatus] ?? nextStatus,
        status_color: options.status_colors[nextStatus] ?? "gray",
        is_assignable: options.assignable_statuses.includes(nextStatus),
        assigned_user_id: null,
        assigned_user: undefined,
        assignments,
      });
    }

    const response = await httpClient.post<ApiResponse<Asset>>(
      `/portal/onboarding/assets/${id}/release`,
      { ...(status ? { status } : {}), ...(note ? { note } : {}) },
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    if (isDevAuthToken(getStoredToken())) {
      removeDevAsset(id);
      return;
    }

    await httpClient.delete<ApiResponse<null>>(
      `/portal/onboarding/assets/${id}`,
    );
  },
};
