// src/lib/api/approval-service.ts
import { httpClient } from "./http-client";

// Types
export interface TeamMember {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
}

export interface TimeOffType {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface TimeOffRequest {
  id: number;
  user: TeamMember;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  total_hours: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  reason: string | null;
  submitted_at: string;
  created_at: string;
  // Cancellation info
  cancelled_by?: {
    id: number;
    name: string;
  } | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  // Review info
  reviewed_by?: {
    id: number;
    name: string;
  } | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

export interface ApprovalFilters {
  is_urgent?: boolean;
  department?: string;
  per_page?: number;
  status?: string | string[];
  year?: number;
}

// Approval Service (for Team page - manager's direct reports only)
export const approvalService = {
  /**
   * Get pending approvals for the current manager's direct reports
   */
  async getPendingApprovals(
    filters?: ApprovalFilters,
  ): Promise<TimeOffRequest[]> {
    const params = new URLSearchParams();
    if (filters?.is_urgent !== undefined)
      params.append("is_urgent", String(filters.is_urgent));
    if (filters?.department) params.append("department", filters.department);
    if (filters?.per_page) params.append("per_page", String(filters.per_page));

    const queryString = params.toString();
    const url = `/portal/approvals/pending${queryString ? `?${queryString}` : ""}`;

    const response = await httpClient.get<{ data: TimeOffRequest[] }>(url);
    return response.data || [];
  },

  /**
   * Get approval history for the current manager's direct reports
   */
  async getApprovalHistory(
    filters?: ApprovalFilters,
  ): Promise<TimeOffRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      statuses.forEach((s) => params.append("status[]", s));
    }
    if (filters?.year) params.append("year", String(filters.year));
    if (filters?.per_page) params.append("per_page", String(filters.per_page));

    const queryString = params.toString();
    const url = `/portal/approvals/history${queryString ? `?${queryString}` : ""}`;

    const response = await httpClient.get<{ data: TimeOffRequest[] }>(url);
    return response.data || [];
  },

  /**
   * Get count of pending approvals
   */
  async getPendingCount(): Promise<number> {
    const response = await httpClient.get<{ data: { count: number } }>(
      "/portal/approvals/count",
    );
    return response.data?.count || 0;
  },

  /**
   * Approve a time-off request
   */
  async approve(requestId: number, notes?: string): Promise<TimeOffRequest> {
    const response = await httpClient.post<{ data: TimeOffRequest }>(
      `/portal/approvals/${requestId}/approve`,
      { notes },
    );
    return response.data;
  },

  /**
   * Deny a time-off request
   */
  async deny(requestId: number, notes?: string): Promise<TimeOffRequest> {
    const response = await httpClient.post<{ data: TimeOffRequest }>(
      `/portal/approvals/${requestId}/deny`,
      { notes },
    );
    return response.data;
  },

  /**
   * Bulk approve multiple requests
   */
  async bulkApprove(
    requestIds: number[],
    notes?: string,
  ): Promise<{
    approved: number;
    failed: number;
    errors: string[];
  }> {
    const response = await httpClient.post<{
      data: { approved: number; failed: number; errors: string[] };
    }>("/portal/approvals/bulk-approve", {
      request_ids: requestIds,
      notes,
    });
    return response.data;
  },
};
