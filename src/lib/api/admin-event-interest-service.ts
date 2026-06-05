/**
 * Typed client for the portal-side event-interest browsing widget.
 *
 * Mirrors GET /api/portal/events/interest in curtlandryApi (gated by the
 * `applications.review` permission). Sibling to admin-applications-service:
 * decoupled so future endpoints (export CSV, delete signup, etc.) land here
 * without bloating the applications service.
 */
import { httpClient } from "./http-client";
import type { PaginatedResponse } from "./admin-applications-service";

export interface EventInterestSummary {
  id: number;
  event_id: string | null;
  event_name: string | null;
  event_slug: string | null;
  email: string | null;
  source: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface EventInterestFilters {
  event_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

class AdminEventInterestService {
  /** Paginated list of "Prefer to stay informed?" signups. */
  async listEventInterest(
    filters: EventInterestFilters = {},
  ): Promise<PaginatedResponse<EventInterestSummary>> {
    const params: Record<string, string | number> = {};
    if (filters.event_id) params.event_id = filters.event_id;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    return httpClient.get<PaginatedResponse<EventInterestSummary>>(
      "/portal/events/interest",
      { params },
    );
  }
}

export const adminEventInterestService = new AdminEventInterestService();
