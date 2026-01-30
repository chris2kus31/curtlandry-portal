// src/lib/api/admin-service.ts
import { httpClient } from "./http-client";

// Types
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  hire_date?: string;
  employment_type?: string;
  weekly_hours?: number;
  is_active: boolean;
  is_manager?: boolean;
  reports_to?: number | null;
  manager?: {
    id: number;
    name: string;
    email: string;
  } | null;
  roles: string[]; // Always returned from API
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  users_count: number;
}

export interface Balance {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    department?: string;
    job_title?: string;
  } | null;
  type: {
    id: number;
    code: string;
    name: string;
  } | null;
  tier: {
    id: number;
    name: string;
    accrual_rate: number;
  } | null;
  year: number;
  accrued_hours: number;
  used_hours: number;
  pending_hours: number;
  adjustment_hours: number;
  carry_over_hours: number;
  available_hours: number;
  max_negative: number;
  current_accrual_rate: number;
  last_accrual_date: string | null;
  next_accrual_date: string | null;
  notes: string | null;
}

export interface TimeOffType {
  id: number;
  code: string;
  name: string;
  color: string;
  uses_accrual: boolean;
  is_active: boolean;
  accrual_tiers?: AccrualTier[];
}

export interface AccrualTier {
  id: number;
  name: string;
  min_tenure_years: number;
  max_tenure_years: number | null;
  accrual_rate: number;
  annual_hours: number;
  max_negative: number;
}

export interface BlackoutPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  departments?: string[];
  is_active: boolean;
}

export interface GeneralSettings {
  hours_per_day: number;
  accrual_period_days: number;
  max_balance: number;
  max_carry_over: number;
  min_increment: number;
  part_time_min_hours?: number;
  full_time_hours?: number;
  transition_enabled: boolean;
  transition_start_date?: string | null;
  transition_end_date?: string | null;
}

export interface AdminSettings {
  types: TimeOffType[];
  blackout_periods: BlackoutPeriod[];
  general: GeneralSettings;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  job_title?: string;
  hire_date?: string;
  employment_type?: string;
  weekly_hours?: number;
  reports_to?: number | null;
  is_manager?: boolean;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  job_title?: string;
  hire_date?: string;
  employment_type?: string;
  weekly_hours?: number;
  reports_to?: number | null;
  is_manager?: boolean;
  roles?: string[];
  initial_pto_balance?: number;
}

export interface BalanceAdjustment {
  hours: number;
  reason: string;
}

export interface BlackoutPeriodData {
  name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  departments?: string[];
  is_active?: boolean;
}

// Admin Service
export const adminService = {
  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  async getUsers(perPage = 500): Promise<User[]> {
    const response = await httpClient.get<{ data: User[] }>(
      `/portal/admin/users?per_page=${perPage}`,
    );
    return response.data || [];
  },

  async getUser(userId: number): Promise<User> {
    const response = await httpClient.get<{ data: User }>(
      `/portal/admin/users/${userId}`,
    );
    return response.data;
  },

  async updateUser(userId: number, data: UpdateUserData): Promise<User> {
    const response = await httpClient.patch<{ data: User }>(
      `/portal/admin/users/${userId}`,
      data,
    );
    return response.data;
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await httpClient.post<{ data: User }>(
      "/portal/admin/users",
      data,
    );
    return response.data;
  },

  async deactivateUser(userId: number): Promise<void> {
    await httpClient.post(`/portal/admin/users/${userId}/deactivate`);
  },

  async reactivateUser(userId: number): Promise<void> {
    await httpClient.post(`/portal/admin/users/${userId}/reactivate`);
  },

  async updateUserRoles(userId: number, roles: string[]): Promise<void> {
    await httpClient.put(`/portal/admin/users/${userId}/roles`, { roles });
  },

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  async getRoles(): Promise<Role[]> {
    const response = await httpClient.get<{ data: Role[] }>(
      "/portal/admin/roles",
    );
    return response.data || [];
  },

  // -------------------------------------------------------------------------
  // Departments
  // -------------------------------------------------------------------------

  async getDepartments(): Promise<string[]> {
    const response = await httpClient.get<{ data: string[] }>(
      "/portal/admin/departments",
    );
    return response.data || [];
  },

  async getManagers(): Promise<User[]> {
    const response = await httpClient.get<{ data: User[] }>(
      "/portal/admin/managers",
    );
    return response.data || [];
  },

  // -------------------------------------------------------------------------
  // Balances
  // -------------------------------------------------------------------------

  async getBalances(): Promise<Balance[]> {
    const response = await httpClient.get<{ data: Balance[] }>(
      "/portal/admin/balances",
    );
    return response.data || [];
  },

  async adjustBalance(
    balanceId: number,
    adjustment: BalanceAdjustment,
  ): Promise<Balance> {
    const response = await httpClient.post<{ data: Balance }>(
      `/portal/admin/balances/${balanceId}/adjust`,
      adjustment,
    );
    return response.data;
  },

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  async getSettings(): Promise<AdminSettings> {
    return await httpClient.get<AdminSettings>("/portal/admin/settings");
  },

  async updateGeneralSettings(
    settings: Partial<GeneralSettings>,
  ): Promise<void> {
    await httpClient.patch("/portal/admin/settings/general", settings);
  },

  // -------------------------------------------------------------------------
  // Blackout Periods
  // -------------------------------------------------------------------------

  async createBlackoutPeriod(
    data: BlackoutPeriodData,
  ): Promise<BlackoutPeriod> {
    const response = await httpClient.post<{ data: BlackoutPeriod }>(
      "/portal/admin/settings/blackout-periods",
      data,
    );
    return response.data;
  },

  async updateBlackoutPeriod(
    periodId: number,
    data: BlackoutPeriodData,
  ): Promise<BlackoutPeriod> {
    const response = await httpClient.patch<{ data: BlackoutPeriod }>(
      `/portal/admin/settings/blackout-periods/${periodId}`,
      data,
    );
    return response.data;
  },

  async deleteBlackoutPeriod(periodId: number): Promise<void> {
    await httpClient.delete(
      `/portal/admin/settings/blackout-periods/${periodId}`,
    );
  },

  // -------------------------------------------------------------------------
  // Approvals (Admin - sees all requests)
  // -------------------------------------------------------------------------

  async getPendingApprovals(): Promise<PendingRequest[]> {
    const response = await httpClient.get<{ data: PendingRequest[] }>(
      "/portal/admin/approvals/pending",
    );
    return response.data || [];
  },

  async getApprovalHistory(): Promise<PendingRequest[]> {
    const response = await httpClient.get<{ data: PendingRequest[] }>(
      "/portal/admin/approvals/history",
    );
    return response.data || [];
  },
};

// Request type for approvals (matches what admin page expects)
export interface PendingRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    department?: string;
    avatar_url?: string;
  };
  type: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  start_date: string;
  end_date: string;
  total_hours: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  reason?: string;
  submitted_at: string;
  created_at: string;
  // Manager who will approve/has approved
  approver?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  // Review info
  reviewed_by?: {
    id: number;
    name: string;
  } | null;
  review_notes?: string | null;
  // Cancellation info
  cancelled_by?: {
    id: number;
    name: string;
  } | null;
  cancellation_reason?: string | null;
}
