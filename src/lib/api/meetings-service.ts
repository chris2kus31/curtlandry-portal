import { httpClient } from "./http-client";
import { isDevAuthToken } from "@/lib/dev-auth";

export type MeetingActionStatus =
  | "open"
  | "ready"
  | "synced"
  | "needs_approval"
  | "dismissed";

export interface MeetingActionItem {
  id: string;
  assignee_name: string;
  assignee_email: string | null;
  assignee_user_id: number | null;
  /** True when assigned to the signed-in user */
  is_mine: boolean;
  action: string;
  status: MeetingActionStatus;
  asana_task_id?: string | null;
  slack_notified_at?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  started_at: string;
  duration_minutes: number;
  source: "fireflies";
  attendees: Array<{
    name: string;
    email: string | null;
    user_id: number | null;
  }>;
  action_items: MeetingActionItem[];
}

export interface MeetingsInboxResponse {
  is_fireflies_admin: boolean;
  meetings: Meeting[];
  using_mock?: boolean;
  asana_enabled?: boolean;
  fireflies_enabled?: boolean;
  source?: string;
  week?: {
    start: string;
    end: string;
    label: string;
    timezone: string;
  };
  error?: string;
}

export type MeetingActionPayload = {
  action: string;
  assignee_email?: string | null;
  assignee_name?: string | null;
  meeting_id?: string;
  meeting_title?: string;
  due_on?: string | null;
};

export interface MeetingsStatusResponse {
  is_fireflies_admin: boolean;
  is_super_admin: boolean;
  has_meetings_manage: boolean;
  email_on_admin_allowlist: boolean;
  email_on_member_roster: boolean;
}

/** Fireflies workspace admins (portal allowlist mirror). */
export const FIREFLIES_ADMIN_EMAILS = [
  "media@curtlandry.com",
  "bkelly@curtlandry.com",
  "dtannous@curtlandry.com",
  "tdunlavey@curtlandry.com",
  "sdunlavey@curtlandry.com",
] as const;

/**
 * Temporary production preview lock — mirrors API FIREFLIES_PREVIEW_EMAILS.
 * When non-empty, only these emails plus portal super_admins see Meetings.
 * Empty array = open to normal Fireflies roles/permissions.
 * Shauna Dunlavey (Qualls) for staged testing.
 */
export const FIREFLIES_PREVIEW_EMAILS = [
  "sdunlavey@curtlandry.com",
] as const;

/** True when the signed-in user may open Meetings during the preview lock. */
export function canAccessMeetingsTab(
  email?: string | null,
  roles: string[] = [],
): boolean {
  if (roles.includes("super_admin")) {
    return true;
  }
  if (FIREFLIES_PREVIEW_EMAILS.length === 0) {
    return true;
  }
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return (FIREFLIES_PREVIEW_EMAILS as readonly string[]).includes(normalized);
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

/**
 * Dev Login uses a fake browser token. Asana create goes through a same-origin
 * Next route that mints Zach's JWT server-side (avoids CORS / Failed to fetch).
 */
async function postDevMeetingsAsana<T>(
  actionItemId: string,
  action: "asana" | "approve",
  payload: MeetingActionPayload | (MeetingActionPayload & { reason?: string }),
): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/dev/meetings-asana", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionItemId, action, payload }),
    });
  } catch {
    throw new Error(
      "Could not reach the portal API route. Is Next.js running on port 3000?",
    );
  }

  const body = (await res.json().catch(() => null)) as
    | (T & { message?: string })
    | { message?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (body && "message" in body && body.message) ||
        `Request failed (${res.status})`,
    );
  }

  return body as T;
}

function isoDaysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const ZACH_EMAIL = "zach@lionsentry.com";

/**
 * Local preview corpus until /portal/meetings responds.
 * Scoped to the signed-in person's name/email when possible.
 * Items that mention Zach are always assigned to zach@lionsentry.com.
 */
export function getMockMeetingsInbox(options: {
  userId: number;
  firstName: string;
  email: string;
  isFirefliesAdmin: boolean;
}): MeetingsInboxResponse {
  const { userId, firstName, email, isFirefliesAdmin } = options;
  const me = firstName || "You";
  const isZach =
    email.trim().toLowerCase() === ZACH_EMAIL ||
    me.toLowerCase().startsWith("zach");

  const zachMine = isZach;
  const zachUserId = isZach ? userId : null;

  const corpus: Meeting[] = [
    {
      id: "mtg_leadership",
      title: "Weekly Leadership Sync",
      started_at: isoDaysAgo(2, 9),
      duration_minutes: 42,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        {
          name: "Zach",
          email: ZACH_EMAIL,
          user_id: zachUserId,
        },
        {
          name: "Shauna Dunlavey",
          email: "sdunlavey@curtlandry.com",
          user_id: null,
        },
        {
          name: "Tucker Dunlavey",
          email: "tdunlavey@curtlandry.com",
          user_id: null,
        },
        { name: "Bob Kelly", email: "bkelly@curtlandry.com", user_id: null },
        {
          name: "Paul Marcellino",
          email: "paul@curtlandry.com",
          user_id: null,
        },
      ],
      action_items: [
        {
          id: "ai_asana_test_1",
          assignee_name: "Zach",
          assignee_email: ZACH_EMAIL,
          assignee_user_id: zachUserId,
          is_mine: zachMine,
          action:
            "TEST: Create this Asana task from Portal Meetings (safe to delete)",
          status: "ready",
        },
        {
          id: "ai_zach_1",
          assignee_name: "Zach",
          assignee_email: ZACH_EMAIL,
          assignee_user_id: zachUserId,
          is_mine: zachMine,
          action: "Zach: send follow-up notes to the board packet owners",
          status: "ready",
        },
        {
          id: "ai_me_2",
          assignee_name: me,
          assignee_email: email,
          assignee_user_id: userId,
          is_mine: true,
          action: "Confirm next week’s agenda owners before Friday",
          status: "open",
        },
        {
          id: "ai_paul_1",
          assignee_name: "Paul Marcellino",
          assignee_email: "paul@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Update donor follow-up list from last week’s calls",
          status: "needs_approval",
        },
        {
          id: "ai_bob_1",
          assignee_name: "Bob Kelly",
          assignee_email: "bkelly@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Draft Q2 budget summary and share with leadership",
          status: "needs_approval",
        },
      ],
    },
    {
      id: "mtg_creative",
      title: "Creative / Media Standup",
      started_at: isoDaysAgo(3, 11),
      duration_minutes: 28,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        {
          name: "Zach",
          email: ZACH_EMAIL,
          user_id: zachUserId,
        },
        {
          name: "Aaron Reeves",
          email: "areeves@curtlandry.com",
          user_id: null,
        },
        { name: "Clay Harper", email: "charper@curtlandry.com", user_id: null },
        { name: "Toni Hill", email: "thill@curtlandry.com", user_id: null },
      ],
      action_items: [
        {
          id: "ai_zach_2",
          assignee_name: "Zach",
          assignee_email: ZACH_EMAIL,
          assignee_user_id: zachUserId,
          is_mine: zachMine,
          action: "Zach: approve final thumbnail set for Friday livestream",
          status: "open",
        },
        {
          id: "ai_aaron_1",
          assignee_name: "Aaron Reeves",
          assignee_email: "areeves@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Send caption draft for social clips",
          status: "open",
        },
        {
          id: "ai_clay_1",
          assignee_name: "Clay Harper",
          assignee_email: "charper@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Publish cutdown to Asana review column",
          status: "needs_approval",
        },
      ],
    },
    {
      id: "mtg_ops",
      title: "Ops Huddle",
      started_at: isoDaysAgo(4, 14),
      duration_minutes: 35,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        {
          name: "Shauna Dunlavey",
          email: "sdunlavey@curtlandry.com",
          user_id: null,
        },
        { name: "Toni Hill", email: "thill@curtlandry.com", user_id: null },
      ],
      action_items: [
        {
          id: "ai_me_4",
          assignee_name: me,
          assignee_email: email,
          assignee_user_id: userId,
          is_mine: true,
          action: "Route two high-touch follow-ups to pastoral care",
          status: "open",
        },
        {
          id: "ai_toni_1",
          assignee_name: "Toni Hill",
          assignee_email: "thill@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Log donor thank-you calls in the CRM",
          status: "needs_approval",
        },
      ],
    },
  ];

  if (!isFirefliesAdmin) {
    return {
      is_fireflies_admin: false,
      using_mock: true,
      asana_enabled: true,
      meetings: corpus
        .map((meeting) => ({
          ...meeting,
          action_items: meeting.action_items.filter((item) => item.is_mine),
        }))
        .filter((meeting) => meeting.action_items.length > 0),
    };
  }

  return {
    is_fireflies_admin: true,
    using_mock: true,
    asana_enabled: true,
    meetings: corpus,
  };
}

export const meetingsService = {
  /**
   * Load the signed-in user's meetings inbox.
   * Prefers API; falls back to mock when offline / local-dev.
   */
  async getInbox(context: {
    userId: number;
    firstName: string;
    email: string;
    isFirefliesAdmin: boolean;
  }): Promise<MeetingsInboxResponse> {
    if (isDevAuthToken(getStoredToken())) {
      return getMockMeetingsInbox(context);
    }

    try {
      const response = await httpClient.get<MeetingsInboxResponse>(
        "/portal/meetings",
      );
      return {
        ...response,
        using_mock: response.using_mock ?? false,
      };
    } catch {
      return getMockMeetingsInbox(context);
    }
  },

  async getStatus(): Promise<MeetingsStatusResponse | null> {
    if (isDevAuthToken(getStoredToken())) {
      return null;
    }
    try {
      return await httpClient.get<MeetingsStatusResponse>(
        "/portal/meetings/status",
      );
    } catch {
      return null;
    }
  },

  async createAsanaTask(
    actionItemId: string,
    payload: MeetingActionPayload,
  ): Promise<{ asana_task_id: string; permalink_url?: string | null }> {
    if (isDevAuthToken(getStoredToken())) {
      return postDevMeetingsAsana(
        actionItemId,
        "asana",
        payload,
      );
    }
    return await httpClient.post<{
      asana_task_id: string;
      permalink_url?: string | null;
    }>(`/portal/meetings/action-items/${actionItemId}/asana`, payload);
  },

  async approveActionItem(
    actionItemId: string,
    payload: MeetingActionPayload,
  ): Promise<{ asana_task_id: string; permalink_url?: string | null }> {
    if (isDevAuthToken(getStoredToken())) {
      return postDevMeetingsAsana(
        actionItemId,
        "approve",
        payload,
      );
    }
    return await httpClient.post<{
      asana_task_id: string;
      permalink_url?: string | null;
    }>(`/portal/meetings/action-items/${actionItemId}/approve`, payload);
  },

  async dismissActionItem(
    actionItemId: string,
    payload: MeetingActionPayload & { reason?: string },
  ): Promise<{ ok: boolean; status: string }> {
    if (isDevAuthToken(getStoredToken())) {
      try {
        return await httpClient.post<{ ok: boolean; status: string }>(
          `/portal/meetings/action-items/${actionItemId}/dismiss`,
          payload,
        );
      } catch {
        return { ok: true, status: "dismissed" };
      }
    }
    return await httpClient.post<{ ok: boolean; status: string }>(
      `/portal/meetings/action-items/${actionItemId}/dismiss`,
      payload,
    );
  },

  async reviseActionItem(
    actionItemId: string,
    payload: MeetingActionPayload,
  ): Promise<{ ok: boolean; status: string; action: string }> {
    if (isDevAuthToken(getStoredToken())) {
      try {
        return await httpClient.post<{
          ok: boolean;
          status: string;
          action: string;
        }>(`/portal/meetings/action-items/${actionItemId}/revise`, payload);
      } catch {
        return { ok: true, status: "ready", action: payload.action };
      }
    }
    return await httpClient.post<{
      ok: boolean;
      status: string;
      action: string;
    }>(`/portal/meetings/action-items/${actionItemId}/revise`, payload);
  },
};

/**
 * Fireflies admin view for Meetings.
 * - meetings.manage / fireflies_admin role
 * - portal super_admin (Zach verification path)
 * - Fireflies admin email allowlist
 */
export function isFirefliesMeetingsAdmin(
  roles: string[],
  permissions: string[],
  email?: string | null,
): boolean {
  if (permissions.includes("meetings.manage")) return true;
  if (roles.includes("super_admin")) return true;
  if (roles.includes("fireflies_admin")) return true;
  if (email) {
    const normalized = email.trim().toLowerCase();
    if (
      (FIREFLIES_ADMIN_EMAILS as readonly string[]).includes(normalized)
    ) {
      return true;
    }
  }
  return false;
}
