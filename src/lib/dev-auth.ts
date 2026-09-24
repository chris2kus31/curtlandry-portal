import type { User } from "@/types/auth";

export const DEV_AUTH_TOKEN = "dev-local-token";

export function isDevAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

export function isDevAuthToken(token: string | null | undefined): boolean {
  return isDevAuthEnabled() && token === DEV_AUTH_TOKEN;
}

/** Local preview user — Zach, so Meetings mock items + Asana create target him. */
export const DEV_MANAGER_USER: User = {
  id: 4,
  first_name: "Zach",
  last_name: "Lionsentry",
  name: "Zach",
  full_name: "Zach Lionsentry",
  email: "zach@lionsentry.com",
  department: "Engineering",
  job_title: "Portal Preview",
  is_active: true,
  is_manager: true,
  has_direct_reports: true,
  hire_date: "2024-01-15",
  tenure_years: 2,
};

// Includes admin/event roles so nested sidebar groups (Admin, Sites) are
// visible in local preview. Not used against a real API.
export const DEV_ROLES = [
  "manager",
  "employee",
  "admin",
  "super_admin",
  "event_manager",
  "fireflies_admin",
];
export const DEV_PERMISSIONS = [
  "onboarding.manage",
  "assets.manage",
  "software.manage",
  "offboarding.submit",
  "applications.review",
  "meetings.view",
  "meetings.manage",
];
