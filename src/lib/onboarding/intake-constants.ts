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
 * asset_categories id (integer from the API), matched against the asset's
 * `asset_category_id` — never a guess against types, labels, or names.
 */
export function assetsInCategory<
  T extends { asset_category_id: number | null },
>(assets: T[], categoryValue: number | string): T[] {
  const id = Number(categoryValue);
  return assets.filter(
    (asset) =>
      asset.asset_category_id !== null && asset.asset_category_id === id,
  );
}

/** Lucide icon key for a device category. Prefer API `icon_key`; never match on labels for business logic. */
export type DeviceCategoryIconKey =
  | "laptop"
  | "desktop"
  | "tablet"
  | "ipad"
  | "phone"
  | "device"
  | "other";

/**
 * Map the API icon_key onto a known Lucide token. Unknown keys fall back to
 * the generic package icon — the API owns the mapping from category → key.
 */
export function resolveCategoryIconKey(
  iconKey: string | null | undefined,
): DeviceCategoryIconKey {
  switch ((iconKey ?? "").toLowerCase()) {
    case "laptop":
      return "laptop";
    case "desktop":
      return "desktop";
    case "tablet":
    case "ipad":
      return "tablet";
    case "phone":
      return "phone";
    case "device":
    case "other":
      return "other";
    default:
      return "other";
  }
}
