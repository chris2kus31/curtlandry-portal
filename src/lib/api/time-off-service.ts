// src/lib/api/time-off-service.ts
import { httpClient } from "./http-client";

export interface TimeOffType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string;
  requires_approval: boolean;
  requires_documentation: boolean;
  uses_accrual: boolean;
  uses_tenure_tiers: boolean;
  min_increment_hours: number;
  max_consecutive_days: number | null;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface TimeOffBalance {
  id: number;
  type: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  year: number;
  accrued_hours: number;
  used_hours: number;
  pending_hours: number;
  adjustment_hours: number;
  carry_over_hours: number;
  available_hours: number;
  available_days: number;
  tier: {
    name: string;
    accrual_rate: number;
    annual_days: number;
  } | null;
  current_accrual_rate: number;
  proration_factor: number;
  next_accrual_date: string | null;
  max_balance: number;
  max_carry_over: number;
  min_allowed: number;
  // Aliases for backward compatibility
  balance: number;
  used: number;
  pending: number;
  available: number;
  accrued_ytd: number;
  carry_over: number;
}

export interface TimeOffRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
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
  status: "draft" | "pending" | "approved" | "denied" | "cancelled";
  notes: string | null;
  approver: {
    id: number;
    name: string;
  } | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Review fields (for approved/denied requests)
  reviewed_by?: {
    id: number;
    name: string;
  } | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  // Cancellation fields
  cancelled_by?: {
    id: number;
    name: string;
  } | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const timeOffService = {
  /**
   * Get available time-off types
   */
  async getTypes(): Promise<TimeOffType[]> {
    const response = await httpClient.get<ApiResponse<TimeOffType[]>>(
      "/portal/time-off/types",
    );
    return response.data;
  },

  /**
   * Get user's PTO balances
   */
  async getBalances(year?: number): Promise<TimeOffBalance[]> {
    const params = year ? `?year=${year}` : "";
    const response = await httpClient.get<
      ApiResponse<
        Omit<
          TimeOffBalance,
          | "balance"
          | "used"
          | "pending"
          | "available"
          | "accrued_ytd"
          | "carry_over"
        >[]
      >
    >(`/portal/time-off/balances${params}`);
    // Add aliases for backward compatibility
    return response.data.map((b) => ({
      ...b,
      balance: b.accrued_hours + b.carry_over_hours + b.adjustment_hours,
      used: b.used_hours,
      pending: b.pending_hours,
      available: b.available_hours,
      accrued_ytd: b.accrued_hours,
      carry_over: b.carry_over_hours,
    }));
  },

  /**
   * Get user's time-off requests
   */
  async getRequests(filters?: {
    status?: string | string[];
    type_id?: number;
    year?: number;
    per_page?: number;
  }): Promise<{ data: TimeOffRequest[]; meta?: unknown }> {
    const params = new URLSearchParams();
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach((s) => params.append("status[]", s));
      } else {
        params.append("status", filters.status);
      }
    }
    if (filters?.type_id) params.append("type_id", String(filters.type_id));
    if (filters?.year) params.append("year", String(filters.year));
    if (filters?.per_page) params.append("per_page", String(filters.per_page));

    const queryString = params.toString();
    return await httpClient.get<{ data: TimeOffRequest[]; meta?: unknown }>(
      `/portal/time-off/requests${queryString ? `?${queryString}` : ""}`,
    );
  },

  /**
   * Get upcoming approved time off
   */
  async getUpcoming(limit?: number): Promise<TimeOffRequest[]> {
    const params = limit ? `?limit=${limit}` : "";
    const response = await httpClient.get<ApiResponse<TimeOffRequest[]>>(
      `/portal/time-off/upcoming${params}`,
    );
    return response.data;
  },

  /**
   * Create a new time-off request
   */
  async createRequest(data: {
    time_off_type_id: number;
    start_date: string;
    end_date: string;
    start_time?: string; // HH:mm format for partial day
    end_time?: string; // HH:mm format for partial day
    total_hours?: number;
    notes?: string;
    submit?: boolean;
  }): Promise<TimeOffRequest> {
    // Transform notes to reason for API compatibility
    const { notes, ...rest } = data;
    const payload = {
      ...rest,
      reason: notes, // Backend expects 'reason' field for employee notes
    };
    const response = await httpClient.post<ApiResponse<TimeOffRequest>>(
      "/portal/time-off/requests",
      payload,
    );
    return response.data;
  },

  /**
   * Cancel a time-off request
   */
  async cancelRequest(id: number, reason?: string): Promise<TimeOffRequest> {
    const response = await httpClient.post<ApiResponse<TimeOffRequest>>(
      `/portal/time-off/requests/${id}/cancel`,
      { reason },
    );
    return response.data;
  },

  /**
   * Get stats/counts for the user's requests (lightweight for badge counts)
   */
  async getStats(): Promise<{ pending_count: number; total_count: number }> {
    const response = await httpClient.get<
      ApiResponse<{ pending_count: number; total_count: number }>
    >("/portal/time-off/stats");
    return response.data;
  },
};
