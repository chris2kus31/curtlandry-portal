/**
 * Typed client for the portal-side event-application review widget.
 *
 * Mirrors the routes registered in curtlandryApi/routes/api.php under
 *   /api/portal/events/*
 *
 * Auth + base-URL handling is delegated to the shared `httpClient`.
 */
import { httpClient } from "./http-client";

/* ----------------------------- Status enum ----------------------------- */

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "info_requested"
  | "accepted"
  | "paid"
  | "confirmed"
  | "waitlisted"
  | "declined"
  | "cancelled"
  | "refunded"
  | "expired";

/** Event lifecycle status (separate from application status). */
export type EventLifecycleStatus = "draft" | "open" | "closed" | "archived";

/** Full event entity returned by the management endpoints. */
export interface AdminEvent {
  id: string;
  site_id: number;
  site: { id: number; slug: string; name: string } | null;

  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;

  hero_image_url: string | null;
  gallery_image_urls: string[];

  start_date: string | null;
  end_date: string | null;
  timezone: string;

  location: {
    venue: string | null;
    street_1: string | null;
    street_2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };

  format: string | null;
  group_size_label: string | null;
  length_label: string | null;
  inclusions: string[];

  capacity: number;
  show_capacity_publicly: boolean;

  currency: string;
  price_cents: number;
  collect_tax: boolean;
  collect_shipping: boolean;

  refund_full_until: string | null;
  refund_partial_until: string | null;
  refund_partial_pct: number | null;

  application_status: EventLifecycleStatus;
  application_schema: ApplicationSchema | null;

  theme: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Payload for creating an event (server fills `created_by`). */
export interface CreateEventPayload {
  site_id: number;
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;

  hero_image_url?: string | null;
  gallery_image_urls?: string[];

  start_date: string;
  end_date: string;
  timezone: string;

  location_venue_name?: string | null;
  location_street_1?: string | null;
  location_street_2?: string | null;
  location_city: string;
  location_state: string;
  location_postal_code?: string | null;
  location_country?: string;

  format?: string | null;
  group_size_label?: string | null;
  length_label?: string | null;
  inclusions?: string[];

  capacity: number;
  show_capacity_publicly?: boolean;

  currency: string;
  price_cents: number;
  collect_tax?: boolean;
  collect_shipping?: boolean;

  refund_full_until?: string | null;
  refund_partial_until?: string | null;
  refund_partial_pct?: number | null;

  application_status?: EventLifecycleStatus;
  application_schema?: ApplicationSchema | null;
  theme?: Record<string, unknown> | null;
}

export type UpdateEventPayload = Partial<Omit<CreateEventPayload, "site_id">>;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Needs Review",
  info_requested: "Info Requested",
  accepted: "Accepted",
  paid: "Paid",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  declined: "Declined",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

/* ----------------------------- Shapes ---------------------------------- */

export interface AdminEventSummary {
  id: string;
  name: string;
  slug: string;
  site: { slug: string | null; name: string | null };
  start_date: string | null;
  end_date: string | null;
  application_status: string;
  capacity: { max_attendees?: number | null } | null;
  capacity_remaining: number | null;
  counts: {
    total: number;
    needs_review: number;
    awaiting_payment: number;
    by_status: Partial<Record<ApplicationStatus, number>>;
  };
}

export interface AdminApplicationSummary {
  id: string;
  reference_number: string;
  status: ApplicationStatus;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  event: {
    id: string;
    name: string;
    slug: string;
    start_date: string | null;
    end_date: string | null;
  } | null;
  submitted_at: string | null;
  last_activity_at: string | null;
}

export interface AdminApplicationNote {
  id: string;
  body: string;
  is_pinned: boolean;
  created_at: string | null;
  author: { id: number | string; name: string | null; email: string | null } | null;
}

export interface AllowedTransition {
  value: ApplicationStatus;
  label: string;
}

export interface AdminApplicationDetail extends AdminApplicationSummary {
  form_data: Record<string, unknown>;
  event:
    | (AdminApplicationSummary["event"] & {
        timezone: string | null;
        location: {
          venue: string | null;
          street_1: string | null;
          street_2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
        } | null;
        capacity: unknown;
        application_schema: ApplicationSchema | null;

        // Pricing + refund policy + Stripe linkage. Drives conditional
        // rendering of "Send payment link" vs "Confirm registration" and
        // the refund-window preview in the refund modal.
        currency: string;
        price_cents: number;
        stripe_price_id: string | null;
        refund_full_until: string | null;
        refund_partial_until: string | null;
        refund_partial_pct: number | null;
      })
    | null;
  allowed_transitions: AllowedTransition[];
  notes: AdminApplicationNote[];
  timestamps: {
    submitted_at: string | null;
    reviewed_at: string | null;
    decided_at: string | null;
    paid_at: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    refunded_at: string | null;
  };
  payment: {
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
    stripe_charge_id: string | null;
    amount_paid_cents: number | null;
    paid_currency: string | null;
    amount_refunded_cents: number | null;
    // Payment-link lifecycle, surfaced for badges + re-send affordance.
    payment_link_sent_count: number;
    payment_link_expired_at: string | null;
    stripe_recovery_url: string | null;
  };
}

export interface AdminApplicationStats {
  total: number;
  needs_review: number;
  info_requested: number;
  accepted: number;
  paid: number;
  waitlisted: number;
  declined: number;
  cancelled: number;
  by_status: Partial<Record<ApplicationStatus, number>>;
}

export interface AdminTimelineEntry {
  id: string;
  event: string | null;
  description: string | null;
  properties: Record<string, unknown>;
  causer: { id: number | string; name: string | null; email: string | null } | null;
  created_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

/* --- Application schema (v2) — shared with curtlandry-sites ----------- */
export type SchemaFieldType =
  | "text"
  | "textarea"
  | "tel"
  | "email"
  | "select"
  | "radio"
  | "checkbox"
  | "checkbox_group"
  | "number"
  | "info_callout";

export interface SchemaOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  placeholder?: string;
  helpText?: string;
  description?: string;
  maxLength?: number;
  options?: (string | SchemaOption)[];
  maxSelect?: number;
  columnSpan?: 1 | 2;
  icon?: string;
  body?: string;
  variant?: "info" | "warn" | "success";
  mapped?: "first_name" | "last_name" | "email" | "phone";
}

export interface SchemaSection {
  key?: string;
  label?: string;
  fields: SchemaField[];
}

export interface SchemaStep {
  key: string;
  title: string;
  subtitle?: string;
  navLabel?: string;
  navHint?: string;
  sections?: SchemaSection[];
  fields?: SchemaField[];
}

export interface ApplicationSchema {
  version: number;
  steps: SchemaStep[];
}

/* ----------------------------- Request shapes -------------------------- */

export interface QueueFilters {
  event_id?: string;
  status?: ApplicationStatus | ApplicationStatus[];
  q?: string;
  page?: number;
  per_page?: number;
}

export interface ChangeStatusPayload {
  to: ApplicationStatus;
  note?: string;
  payment_url?: string;
  send_email?: boolean;
}

export interface AddNotePayload {
  body: string;
  is_pinned?: boolean;
}

export interface SendEmailPayload {
  subject: string;
  body: string;
}

/**
 * Response from POST /portal/events/applications/{id}/send-payment-link.
 * Same shape on first send and re-send; sent_count distinguishes them.
 */
export interface SendPaymentLinkResponse {
  session_url: string;
  stripe_checkout_session_id: string;
  payment_link_sent_count: number;
  payment_link_expired_at: string | null;
}

/**
 * Response from POST /portal/events/applications/{id}/confirm.
 * Free-event terminal transition (price_cents=0).
 */
export interface ConfirmFreeRegistrationResponse {
  id: string;
  status: ApplicationStatus;
  confirmed_at: string | null;
}

/**
 * Optional fields on POST /portal/events/applications/{id}/refund.
 * All are optional — default is full policy-driven refund.
 */
export interface IssueRefundPayload {
  amount_cents?: number;
  override_policy_window?: boolean;
  reason?: string;
}

export interface IssueRefundResponse {
  refund_id: string;
  amount_cents: number;
  is_full_refund: boolean;
  total_refunded_cents: number;
  application_status: ApplicationStatus;
}

/* ============================== Service =============================== */

class AdminApplicationsService {
  /** List of events (used by the queue filter dropdown). */
  async listEvents(): Promise<AdminEventSummary[]> {
    const res = await httpClient.get<{ data: AdminEventSummary[] }>(
      "/portal/events",
    );
    return res.data;
  }

  /** Paginated application queue. */
  async listApplications(
    filters: QueueFilters = {},
  ): Promise<PaginatedResponse<AdminApplicationSummary>> {
    const params: Record<string, string | number> = {};
    if (filters.event_id) params.event_id = filters.event_id;
    if (filters.q) params.q = filters.q;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;
    if (filters.status) {
      params.status = Array.isArray(filters.status)
        ? filters.status.join(",")
        : filters.status;
    }

    return httpClient.get<PaginatedResponse<AdminApplicationSummary>>(
      "/portal/events/applications",
      { params },
    );
  }

  async getStats(eventId?: string): Promise<AdminApplicationStats> {
    const res = await httpClient.get<{ data: AdminApplicationStats }>(
      "/portal/events/applications/stats",
      { params: eventId ? { event_id: eventId } : undefined },
    );
    return res.data;
  }

  async getApplication(id: string): Promise<AdminApplicationDetail> {
    const res = await httpClient.get<{ data: AdminApplicationDetail }>(
      `/portal/events/applications/${id}`,
    );
    return res.data;
  }

  async changeStatus(
    id: string,
    payload: ChangeStatusPayload,
  ): Promise<AdminApplicationDetail> {
    const res = await httpClient.post<{ data: AdminApplicationDetail }>(
      `/portal/events/applications/${id}/status`,
      payload,
    );
    return res.data;
  }

  async addNote(
    id: string,
    payload: AddNotePayload,
  ): Promise<AdminApplicationNote> {
    const res = await httpClient.post<{ data: AdminApplicationNote }>(
      `/portal/events/applications/${id}/notes`,
      payload,
    );
    return res.data;
  }

  async deleteNote(id: string, noteId: string): Promise<void> {
    await httpClient.delete(
      `/portal/events/applications/${id}/notes/${noteId}`,
    );
  }

  async getTimeline(id: string): Promise<AdminTimelineEntry[]> {
    const res = await httpClient.get<{ data: AdminTimelineEntry[] }>(
      `/portal/events/applications/${id}/timeline`,
    );
    return res.data;
  }

  async sendEmail(id: string, payload: SendEmailPayload): Promise<void> {
    await httpClient.post(`/portal/events/applications/${id}/email`, payload);
  }

  /**
   * Create (or re-send) a Stripe Checkout Session for an ACCEPTED
   * application on a PAID event. The applicant receives an email with
   * the URL; this response also returns the URL so the portal can show
   * a "copy link" affordance.
   */
  async sendPaymentLink(id: string): Promise<SendPaymentLinkResponse> {
    const res = await httpClient.post<{ data: SendPaymentLinkResponse }>(
      `/portal/events/applications/${id}/send-payment-link`,
      {},
    );
    return res.data;
  }

  /**
   * Terminal confirm for FREE events (event.price_cents === 0). No Stripe
   * involved; transitions ACCEPTED → CONFIRMED via the state machine.
   */
  async confirmFreeRegistration(
    id: string,
  ): Promise<ConfirmFreeRegistrationResponse> {
    const res = await httpClient.post<{ data: ConfirmFreeRegistrationResponse }>(
      `/portal/events/applications/${id}/confirm`,
      {},
    );
    return res.data;
  }

  /**
   * Issue a Stripe refund. Default is policy-driven full refund. Use
   * `amount_cents` to issue a custom partial; `override_policy_window` to
   * bypass refund_full_until / refund_partial_until window checks.
   */
  async issueRefund(
    id: string,
    payload: IssueRefundPayload = {},
  ): Promise<IssueRefundResponse> {
    const res = await httpClient.post<{ data: IssueRefundResponse }>(
      `/portal/events/applications/${id}/refund`,
      payload,
    );
    return res.data;
  }

  /* ----------------------- Event management ---------------------------- */

  async getEvent(id: string): Promise<AdminEvent> {
    const res = await httpClient.get<{ data: AdminEvent }>(
      `/portal/events/${id}`,
    );
    return res.data;
  }

  async createEvent(payload: CreateEventPayload): Promise<AdminEvent> {
    const res = await httpClient.post<{ data: AdminEvent }>(
      "/portal/events",
      payload,
    );
    return res.data;
  }

  async updateEvent(id: string, payload: UpdateEventPayload): Promise<AdminEvent> {
    const res = await httpClient.patch<{ data: AdminEvent }>(
      `/portal/events/${id}`,
      payload,
    );
    return res.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await httpClient.delete(`/portal/events/${id}`);
  }
}

export const adminApplicationsService = new AdminApplicationsService();
