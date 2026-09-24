/**
 * Shared onboarding/intake constants (importable, not inline magic strings).
 */

export interface IntakeFormState {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  work_location: string;
  start_date: string;
  reports_to: string;
  employment_type: string;
  weekly_hours: string;
  device_needed: boolean;
  requested_asset_id: string;
  purchase_needed: boolean;
  requested_device_note: string;
}

/** Fresh intake form defaults — call as a factory so each drawer gets its own object. */
export function createEmptyIntakeForm(): IntakeFormState {
  return {
    email: "",
    first_name: "",
    last_name: "",
    job_title: "",
    department: "",
    work_location: "",
    start_date: "",
    reports_to: "",
    employment_type: "full_time",
    weekly_hours: "40",
    device_needed: false,
    requested_asset_id: "",
    purchase_needed: false,
    requested_device_note: "",
  };
}

/** API device category value → Lucide icon key for display only. */
export type DeviceCategoryIconKey =
  | "laptop"
  | "desktop"
  | "tablet"
  | "phone"
  | "other";

export function deviceCategoryIconKey(value: string): DeviceCategoryIconKey {
  switch (value) {
    case "laptop":
      return "laptop";
    case "desktop":
    case "monitor":
      return "desktop";
    case "tablet":
      return "tablet";
    case "phone":
      return "phone";
    default:
      return "other";
  }
}
