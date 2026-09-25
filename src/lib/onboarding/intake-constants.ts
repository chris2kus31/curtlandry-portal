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

/**
 * Group assets by Asset Tiger category. A category option's `value` is the
 * stringified asset_categories id, so this is an exact id match against the
 * asset's `asset_category_id` — never a guess against types, labels, or names.
 */
export function assetsInCategory<
  T extends { asset_category_id: number | null },
>(assets: T[], categoryValue: string): T[] {
  return assets.filter(
    (asset) =>
      asset.asset_category_id !== null &&
      String(asset.asset_category_id) === categoryValue,
  );
}

/** Lucide icon key for a device category. Display only — never used for matching. */
export type DeviceCategoryIconKey =
  | "laptop"
  | "desktop"
  | "tablet"
  | "phone"
  | "other";

/**
 * Categories are free-form Asset Tiger names, so the icon is picked from the
 * label. An unrecognised name just gets the generic package icon.
 */
export function deviceCategoryIconKey(label: string): DeviceCategoryIconKey {
  const name = label.toLowerCase();

  if (name.includes("laptop") || name.includes("notebook")) return "laptop";
  if (
    name.includes("desktop") ||
    name.includes("monitor") ||
    name.includes("workstation") ||
    name.includes("imac")
  ) {
    return "desktop";
  }
  if (name.includes("tablet") || name.includes("ipad")) return "tablet";
  if (name.includes("phone") || name.includes("mobile")) return "phone";

  return "other";
}
