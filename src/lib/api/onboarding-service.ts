// src/lib/api/onboarding-service.ts
import { httpClient } from "./http-client";

// ---------------------------------------------------------------------------
// Types (mirror the Laravel API resources under app/Http/Resources/Portal/Onboarding)
// ---------------------------------------------------------------------------

export type OnboardingStatus =
  | "submitted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OnboardingTaskStatus =
  | "pending"
  | "in_progress"
  | "waiting_on"
  | "completed";

export interface OnboardingChecklistItem {
  label: string;
  done: boolean;
}

export interface OnboardingAsset {
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
}

export interface SoftwareCatalogItem {
  id: number;
  name: string;
  department: string | null;
  is_active: boolean;
  requires_approval: boolean;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Snapshot stored on a case for the software a manager selected at intake. */
export interface OnboardingCaseSoftware {
  id: number;
  name: string;
  requires_approval: boolean;
}

export interface OnboardingTask {
  id: number;
  onboarding_case_id: number;
  type: string;
  title: string;
  assigned_role: string | null;
  assigned_user_id: number | null;
  status: OnboardingTaskStatus | null;
  status_label: string | null;
  status_color: string | null;
  checklist: OnboardingChecklistItem[];
  waiting_on: string | null;
  completion_note: string | null;
  completed_at: string | null;
  locked_at: string | null;
  is_locked: boolean;
  created_at: string | null;
  updated_at: string | null;
  assigned_user?: { id: number; name: string; email: string } | null;
  completed_by_user?: { id: number; name: string } | null;
}

export interface OnboardingNote {
  id: number;
  onboarding_case_id: number;
  body: string;
  created_at: string | null;
  author?: { id: number; name: string } | null;
}

export interface OnboardingCase {
  id: number;
  user_id: number;
  submitted_by: number | null;
  department: string | null;
  work_location: string | null;
  work_location_label: string | null;
  start_date: string | null;
  status: OnboardingStatus | null;
  status_label: string | null;
  status_color: string | null;
  device_needed: boolean;
  requested_asset_id: number | null;
  purchase_needed: boolean;
  requested_device_note: string | null;
  service_setup: unknown[];
  software: OnboardingCaseSoftware[] | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  new_hire?: {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    job_title: string | null;
  };
  submitted_by_user?: { id: number; name: string };
  requested_asset?: OnboardingAsset;
  tasks?: OnboardingTask[];
  notes?: OnboardingNote[];
}

export interface OnboardingManager {
  id: number;
  name?: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string | null;
}

export interface OnboardingFormOptions {
  // { value: label } maps for dropdowns
  departments: Record<string, string>;
  work_locations: Record<string, string>;
  employment_types: string[];
  managers: OnboardingManager[];
  assignable_assets: OnboardingAsset[];
  software_catalog: SoftwareCatalogItem[];
}

export interface IntakePayload {
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department?: string;
  work_location?: string;
  start_date: string;
  reports_to?: number;
  employment_type?: string;
  weekly_hours?: number;
  device_needed?: boolean;
  requested_asset_id?: number;
  purchase_needed?: boolean;
  requested_device_note?: string;
  service_setup?: unknown[];
  /** Catalog item IDs the manager selected. */
  software?: number[];
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

export interface OnboardingListFilters {
  status?: OnboardingStatus;
  active?: boolean;
  department?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  per_page?: number;
}

export interface UpdateTaskPayload {
  status?: OnboardingTaskStatus;
  waiting_on?: string | null;
  completion_note?: string | null;
  checklist?: OnboardingChecklistItem[];
}

export const onboardingService = {
  /**
   * Options to populate the intake form (managers, departments, devices).
   */
  async getOptions(): Promise<OnboardingFormOptions> {
    const response = await httpClient.get<ApiResponse<OnboardingFormOptions>>(
      "/portal/onboarding/cases/options",
    );
    return response.data;
  },

  /**
   * List onboarding cases (requires onboarding.manage).
   */
  async list(
    filters: OnboardingListFilters = {},
  ): Promise<PaginatedResponse<OnboardingCase>> {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.active) params.append("active", "1");
    if (filters.department) params.append("department", filters.department);
    if (filters.search) params.append("search", filters.search);
    if (filters.sort_by) params.append("sort_by", filters.sort_by);
    if (filters.sort_dir) params.append("sort_dir", filters.sort_dir);
    if (filters.per_page) params.append("per_page", String(filters.per_page));

    const qs = params.toString();
    return await httpClient.get<PaginatedResponse<OnboardingCase>>(
      `/portal/onboarding/cases${qs ? `?${qs}` : ""}`,
    );
  },

  /**
   * Get a single case with tasks + notes (requires onboarding.manage).
   */
  async get(id: number): Promise<OnboardingCase> {
    const response = await httpClient.get<ApiResponse<OnboardingCase>>(
      `/portal/onboarding/cases/${id}`,
    );
    return response.data;
  },

  /**
   * Submit a new-hire intake (managers + onboarding.manage).
   */
  async submitIntake(payload: IntakePayload): Promise<OnboardingCase> {
    const response = await httpClient.post<ApiResponse<OnboardingCase>>(
      "/portal/onboarding/cases",
      payload,
    );
    return response.data;
  },

  /**
   * Add an internal note to a case (requires onboarding.manage).
   */
  async addNote(id: number, body: string): Promise<OnboardingNote> {
    const response = await httpClient.post<ApiResponse<OnboardingNote>>(
      `/portal/onboarding/cases/${id}/notes`,
      { body },
    );
    return response.data;
  },

  /**
   * Update a task on a case — checklist toggles, status, notes
   * (requires onboarding.manage).
   */
  async updateTask(
    caseId: number,
    taskId: number,
    payload: UpdateTaskPayload,
  ): Promise<OnboardingTask> {
    const response = await httpClient.patch<ApiResponse<OnboardingTask>>(
      `/portal/onboarding/cases/${caseId}/tasks/${taskId}`,
      payload,
    );
    return response.data;
  },

  /**
   * Cancel an onboarding case (requires onboarding.manage).
   */
  async cancel(id: number): Promise<OnboardingCase> {
    const response = await httpClient.post<ApiResponse<OnboardingCase>>(
      `/portal/onboarding/cases/${id}/cancel`,
    );
    return response.data;
  },
};
