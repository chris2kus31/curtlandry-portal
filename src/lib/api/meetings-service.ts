import { httpClient } from "./http-client";
import { isDevAuthToken } from "@/lib/dev-auth";

export type MeetingActionStatus =
  | "open"
  | "ready"
  | "synced"
  | "needs_approval";

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
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

function isoDaysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Local preview corpus until /portal/meetings exists.
 * Scoped to the signed-in person's name/email when possible.
 */
export function getMockMeetingsInbox(options: {
  userId: number;
  firstName: string;
  email: string;
  isFirefliesAdmin: boolean;
}): MeetingsInboxResponse {
  const { userId, firstName, email, isFirefliesAdmin } = options;
  const me = firstName || "You";

  const corpus: Meeting[] = [
    {
      id: "mtg_leadership",
      title: "Weekly Leadership Sync",
      started_at: isoDaysAgo(2, 9),
      duration_minutes: 42,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        { name: "Sarah Chen", email: "sarah.chen@curtlandry.com", user_id: null },
        { name: "Marcus Lee", email: "marcus.lee@curtlandry.com", user_id: null },
        {
          name: isFirefliesAdmin ? "Zach" : "Shauna",
          email: isFirefliesAdmin
            ? "zach@curtlandry.com"
            : "shauna@curtlandry.com",
          user_id: null,
        },
      ],
      action_items: [
        {
          id: "ai_me_1",
          assignee_name: me,
          assignee_email: email,
          assignee_user_id: userId,
          is_mine: true,
          action: "Send follow-up notes to the board packet owners",
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
          id: "ai_marcus_1",
          assignee_name: "Marcus Lee",
          assignee_email: "marcus.lee@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Update donor follow-up list from last week’s calls",
          status: "needs_approval",
        },
        {
          id: "ai_sarah_1",
          assignee_name: "Sarah Chen",
          assignee_email: "sarah.chen@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Draft Q2 budget summary and share with leadership",
          status: "needs_approval",
        },
      ],
    },
    {
      id: "mtg_creative",
      title: "Creative Team Standup",
      started_at: isoDaysAgo(3, 11),
      duration_minutes: 28,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        { name: "Ava Brooks", email: "ava.brooks@curtlandry.com", user_id: null },
        { name: "Marcus Lee", email: "marcus.lee@curtlandry.com", user_id: null },
      ],
      action_items: [
        {
          id: "ai_me_3",
          assignee_name: me,
          assignee_email: email,
          assignee_user_id: userId,
          is_mine: true,
          action: "Approve final thumbnail set for Friday livestream",
          status: "synced",
          asana_task_id: "mock_asana_1",
        },
        {
          id: "ai_ava_1",
          assignee_name: "Ava Brooks",
          assignee_email: "ava.brooks@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Send caption draft for social clips",
          status: "open",
        },
      ],
    },
    {
      id: "mtg_donor",
      title: "Donor Care Huddle",
      started_at: isoDaysAgo(4, 14),
      duration_minutes: 35,
      source: "fireflies",
      attendees: [
        { name: me, email, user_id: userId },
        { name: "Sarah Chen", email: "sarah.chen@curtlandry.com", user_id: null },
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
          id: "ai_sarah_2",
          assignee_name: "Sarah Chen",
          assignee_email: "sarah.chen@curtlandry.com",
          assignee_user_id: null,
          is_mine: false,
          action: "Log donor thank-you calls in the CRM",
          status: "needs_approval",
        },
      ],
    },
  ];

  if (!isFirefliesAdmin) {
    // Member inbox: only meetings they attended (all of corpus includes them),
    // and only their own action items.
    return {
      is_fireflies_admin: false,
      using_mock: true,
      meetings: corpus.map((meeting) => ({
        ...meeting,
        action_items: meeting.action_items.filter((item) => item.is_mine),
      })),
    };
  }

  // Fireflies admin: meetings they were on + everyone's items on those calls.
  return {
    is_fireflies_admin: true,
    using_mock: true,
    meetings: corpus,
  };
}

export const meetingsService = {
  /**
   * Load the signed-in user's meetings inbox.
   * Falls back to mock data until the portal API ships.
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
        using_mock: false,
      };
    } catch {
      return getMockMeetingsInbox(context);
    }
  },

  async createAsanaTask(actionItemId: string): Promise<{ asana_task_id: string }> {
    if (isDevAuthToken(getStoredToken())) {
      return { asana_task_id: `mock_${actionItemId}` };
    }
    try {
      return await httpClient.post<{ asana_task_id: string }>(
        `/portal/meetings/action-items/${actionItemId}/asana`,
      );
    } catch {
      return { asana_task_id: `local_${actionItemId}` };
    }
  },

  async approveActionItem(
    actionItemId: string,
  ): Promise<{ asana_task_id: string }> {
    if (isDevAuthToken(getStoredToken())) {
      return { asana_task_id: `mock_approved_${actionItemId}` };
    }
    try {
      return await httpClient.post<{ asana_task_id: string }>(
        `/portal/meetings/action-items/${actionItemId}/approve`,
      );
    } catch {
      return { asana_task_id: `local_approved_${actionItemId}` };
    }
  },
};

/** Fireflies account admins (e.g. Shauna) can review others' items on their meetings. */
export function isFirefliesMeetingsAdmin(
  roles: string[],
  permissions: string[],
): boolean {
  if (permissions.includes("meetings.manage")) return true;
  if (roles.includes("super_admin")) return true;
  return false;
}
