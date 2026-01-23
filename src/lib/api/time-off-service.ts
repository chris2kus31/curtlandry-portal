// src/lib/api/time-off-service.ts
import {httpClient} from "./http-client";

export interface TimeOffType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string;
  requires_approval: boolean;
  min_increment_hours: number;
  max_consecutive_days: number | null;
}

export interface TimeOffBalance {
  type: {
    id: number;
    code: string;
    name: string;
    color: string;
  };
  year: number;
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
      "/portal/time-off/types"
    );
    return response.data;
  },

  /**
   * Get user's PTO balances
   */
  async getBalances(year?: number): Promise<TimeOffBalance[]> {
    const params = year ? `?year=${year}` : "";
    const response = await httpClient.get<ApiResponse<TimeOffBalance[]>>(
      `/portal/time-off/balances${params}`
    );
    return response.data;
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
        `/portal/time-off/requests${queryString ? `?${queryString}` : ""}`
    );
  },

  /**
   * Get upcoming approved time off
   */
  async getUpcoming(limit?: number): Promise<TimeOffRequest[]> {
    const params = limit ? `?limit=${limit}` : "";
    const response = await httpClient.get<ApiResponse<TimeOffRequest[]>>(
      `/portal/time-off/upcoming${params}`
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
    total_hours: number;
    notes?: string;
    submit?: boolean;
  }): Promise<TimeOffRequest> {
    const response = await httpClient.post<ApiResponse<TimeOffRequest>>(
      "/portal/time-off/requests",
      data
    );
    return response.data;
  },

  /**
   * Cancel a time-off request
   */
  async cancelRequest(id: number, reason?: string): Promise<TimeOffRequest> {
    const response = await httpClient.post<ApiResponse<TimeOffRequest>>(
      `/portal/time-off/requests/${id}/cancel`,
      { reason }
    );
    return response.data;
  },
};
