import type { User } from "@/types/auth";

export const DEV_AUTH_TOKEN = "dev-local-token";

export function isDevAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

export function isDevAuthToken(token: string | null | undefined): boolean {
  return isDevAuthEnabled() && token === DEV_AUTH_TOKEN;
}

/** Local preview user — enough to browse the portal UI without Google/Laravel. */
export const DEV_MANAGER_USER: User = {
  id: 1,
  first_name: "Dev",
  last_name: "Admin",
  name: "Dev Admin",
  full_name: "Dev Admin",
  email: "dev.admin@curtlandry.com",
  department: "People Ops",
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
];
export const DEV_PERMISSIONS = [
  "onboarding.manage",
  "assets.manage",
  "software.manage",
  "offboarding.submit",
  "applications.review",
];
