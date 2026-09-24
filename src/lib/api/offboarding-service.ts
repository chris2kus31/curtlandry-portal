// src/lib/api/offboarding-service.ts
import { httpClient } from "./http-client";
import type { OnboardingAsset } from "./onboarding-service";

// ---------------------------------------------------------------------------
// Types (mirror app/Http/Resources/Portal/Onboarding/OffboardingCaseResource)
// ---------------------------------------------------------------------------

export type OffboardingStatus =
  | "submitted"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface OffboardingRecoveredDevice {
  id: number;
  asset_id: number;
  asset_name: string | null;
  asset_status: string | null;
  released_at: string | null;
  note: string | null;
}

export interface OffboardingCase {
  id: number;
  user_id: number;
  submitted_by: number | null;
  last_day: string | null;
  reason_note: string | null;
  status: OffboardingStatus | null;
  status_label: string | null;
  status_color: string | null;
  account_deactivated_at: string | null;
  device_recovered_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  new_hire?: {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    job_title: string | null;
    department: string | null;
  };
  submitted_by_user?: { id: number; name: string };
  assigned_devices?: OnboardingAsset[];
  recovered_devices?: OffboardingRecoveredDevice[];
}

export interface OffboardingEmployeeOption {
  id: number;
  name: string;
  email: string;
  department: string | null;
  job_title: string | null;
}

export interface OffboardingFormOptions {
  employees: OffboardingEmployeeOption[];
}

export interface ResignationPayload {
  user_id: number;
  last_day?: string;
  reason_note?: string;
}

export interface OffboardingListFilters {
  status?: OffboardingStatus;
  active?: boolean;
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

export const offboardingService = {
  /**
   * Options to populate the resignation form (active employees to pick from).
   */
  async getOptions(): Promise<OffboardingFormOptions> {
    const response = await httpClient.get<ApiResponse<OffboardingFormOptions>>(
      "/portal/offboarding/cases/options",
    );
    return response.data;
  },

  /**
   * List offboarding cases (requires onboarding.manage).
   */
  async list(
    filters: OffboardingListFilters = {},
  ): Promise<PaginatedResponse<OffboardingCase>> {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.active) params.append("active", "1");
    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_dir) params.append("sort_dir", filters.sort_dir);
    if (filters.per_page) params.append("per_page", String(filters.per_page));

    const qs = params.toString();
    return await httpClient.get<PaginatedResponse<OffboardingCase>>(
      `/portal/offboarding/cases${qs ? `?${qs}` : ""}`,
    );
  },

  /**
   * Get a single case with devices + recovery history (requires onboarding.manage).
   */
  async get(id: number): Promise<OffboardingCase> {
    const response = await httpClient.get<ApiResponse<OffboardingCase>>(
      `/portal/offboarding/cases/${id}`,
    );
    return response.data;
  },

  /**
   * Submit a resignation (HR via offboarding.submit + onboarding.manage).
   */
  async submit(payload: ResignationPayload): Promise<OffboardingCase> {
    const response = await httpClient.post<ApiResponse<OffboardingCase>>(
      "/portal/offboarding/cases",
      payload,
    );
    return response.data;
  },

  /**
   * Recover all devices still assigned to the departing employee
   * (requires onboarding.manage).
   */
  async recoverDevices(id: number, note?: string): Promise<OffboardingCase> {
    const response = await httpClient.post<ApiResponse<OffboardingCase>>(
      `/portal/offboarding/cases/${id}/recover-devices`,
      note ? { note } : {},
    );
    return response.data;
  },

  /**
   * Deactivate the departing employee's account (requires onboarding.manage).
   */
  async deactivate(id: number): Promise<OffboardingCase> {
    const response = await httpClient.post<ApiResponse<OffboardingCase>>(
      `/portal/offboarding/cases/${id}/deactivate`,
    );
    return response.data;
  },

  /**
   * Cancel an offboarding case (requires onboarding.manage).
   */
  async cancel(id: number): Promise<OffboardingCase> {
    const response = await httpClient.post<ApiResponse<OffboardingCase>>(
      `/portal/offboarding/cases/${id}/cancel`,
    );
    return response.data;
  },
};
