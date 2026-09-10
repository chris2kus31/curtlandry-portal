import type { User } from "@/types/auth";
import type { TimeOffRequest } from "@/lib/api/approval-service";
import type { CalendarEvent } from "@/lib/api/calendar-service";
import type {
  OnboardingAsset,
  OnboardingCase,
  OnboardingFormOptions,
  SoftwareCatalogItem,
} from "@/lib/api/onboarding-service";
import type { Asset, AssetOptions } from "@/lib/api/asset-service";

export const DEV_AUTH_TOKEN = "dev-local-token";

export function isDevAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

export function isDevAuthToken(token: string | null | undefined): boolean {
  return isDevAuthEnabled() && token === DEV_AUTH_TOKEN;
}

export const DEV_MANAGER_USER: User = {
  id: 1,
  first_name: "Dev",
  last_name: "Manager",
  name: "Dev Manager",
  full_name: "Dev Manager",
  email: "dev.manager@curtlandry.com",
  department: "People Ops",
  job_title: "Team Lead",
  is_active: true,
  is_manager: true,
  has_direct_reports: true,
};

export const DEV_ROLES = ["manager"];
export const DEV_PERMISSIONS = [
  "onboarding.manage",
  "assets.manage",
  "software.manage",
  "offboarding.submit",
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getDevPendingApprovals(): TimeOffRequest[] {
  return [
    {
      id: 101,
      user: {
        id: 11,
        first_name: "Alex",
        last_name: "Rivera",
        name: "Alex Rivera",
        email: "alex.rivera@curtlandry.com",
        department: "Operations",
        job_title: "Coordinator",
      },
      type: {
        id: 1,
        code: "PTO",
        name: "Paid Time Off",
        color: "#00BC8B",
      },
      start_date: daysFromNow(5),
      end_date: daysFromNow(7),
      total_hours: 24,
      status: "pending",
      reason: "Family trip",
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      user: {
        id: 12,
        first_name: "Jordan",
        last_name: "Lee",
        name: "Jordan Lee",
        email: "jordan.lee@curtlandry.com",
        department: "Media",
        job_title: "Producer",
      },
      type: {
        id: 2,
        code: "SICK",
        name: "Sick Leave",
        color: "#CD2907",
      },
      start_date: daysFromNow(1),
      end_date: daysFromNow(1),
      total_hours: 8,
      status: "pending",
      reason: "Doctor appointment",
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
}

export function getDevApprovalHistory(): TimeOffRequest[] {
  return [
    {
      id: 201,
      user: {
        id: 11,
        first_name: "Alex",
        last_name: "Rivera",
        name: "Alex Rivera",
        email: "alex.rivera@curtlandry.com",
        department: "Operations",
        job_title: "Coordinator",
      },
      type: {
        id: 1,
        code: "PTO",
        name: "Paid Time Off",
        color: "#00BC8B",
      },
      start_date: daysFromNow(-20),
      end_date: daysFromNow(-18),
      total_hours: 24,
      status: "approved",
      reason: "Long weekend",
      submitted_at: daysFromNow(-25) + "T12:00:00.000Z",
      created_at: daysFromNow(-25) + "T12:00:00.000Z",
      reviewed_by: { id: 1, name: "Dev Manager" },
      reviewed_at: daysFromNow(-24) + "T09:00:00.000Z",
      review_notes: "Approved — enjoy!",
    },
    {
      id: 202,
      user: {
        id: 12,
        first_name: "Jordan",
        last_name: "Lee",
        name: "Jordan Lee",
        email: "jordan.lee@curtlandry.com",
        department: "Media",
        job_title: "Producer",
      },
      type: {
        id: 1,
        code: "PTO",
        name: "Paid Time Off",
        color: "#00BC8B",
      },
      start_date: daysFromNow(-10),
      end_date: daysFromNow(-9),
      total_hours: 16,
      status: "denied",
      reason: "Conflicting shoot week",
      submitted_at: daysFromNow(-14) + "T12:00:00.000Z",
      created_at: daysFromNow(-14) + "T12:00:00.000Z",
      reviewed_by: { id: 1, name: "Dev Manager" },
      reviewed_at: daysFromNow(-13) + "T11:00:00.000Z",
      review_notes: "Please reschedule after the event.",
    },
  ];
}

export function getDevCalendarEvents(
  startDate: string,
  endDate: string,
): CalendarEvent[] {
  return [
    {
      id: "cal-1",
      title: "Alex Rivera — PTO",
      description: "Paid Time Off",
      start: daysFromNow(5),
      end: daysFromNow(8),
      all_day: true,
    },
    {
      id: "cal-2",
      title: "Jordan Lee — Sick Leave",
      description: "Sick Leave",
      start: daysFromNow(1),
      end: daysFromNow(2),
      all_day: true,
    },
  ].filter((event) => event.start <= endDate && event.end >= startDate);
}

/**
 * Mock Asset Tiger inventory shaped like portal OnboardingAsset / Asset.
 * Later this will be replaced by Laravel syncing from Asset Tiger's API.
 */
export function getDevAssignableAssets(): OnboardingAsset[] {
  return [
    {
      id: 9001,
      asset_tag: "AT-MBP-14-001",
      serial_number: "C02Y1ABCD123",
      type: "laptop",
      type_label: "Laptop",
      name: 'MacBook Pro 14" (M3)',
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: "/devices/laptop.svg",
    },
    {
      id: 9002,
      asset_tag: "AT-MBP-16-004",
      serial_number: "C02Y2EFGH456",
      type: "laptop",
      type_label: "Laptop",
      name: 'MacBook Pro 16" (M2)',
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: "/devices/laptop.svg",
    },
    {
      id: 9003,
      asset_tag: "AT-DELL-7420-012",
      serial_number: "5CG1234ABCD",
      type: "laptop",
      type_label: "Laptop",
      name: "Dell Latitude 7420",
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: "/devices/laptop.svg",
    },
    {
      id: 9004,
      asset_tag: "AT-IMAC-001",
      serial_number: "C02Z9WXYZ789",
      type: "desktop",
      type_label: "Desktop",
      name: 'iMac 24" (M1)',
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: "/devices/desktop.svg",
    },
    {
      id: 9005,
      asset_tag: "AT-IPAD-PRO-003",
      serial_number: "DMPX2ABCD001",
      type: "tablet",
      type_label: "Tablet",
      name: 'iPad Pro 12.9"',
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: "/devices/tablet.svg",
    },
  ];
}

function getDevSoftwareCatalog(): SoftwareCatalogItem[] {
  return [
    {
      id: 1,
      name: "Microsoft 365",
      department: null,
      is_active: true,
      requires_approval: false,
      notes: null,
    },
    {
      id: 2,
      name: "Slack",
      department: null,
      is_active: true,
      requires_approval: false,
      notes: null,
    },
    {
      id: 3,
      name: "Adobe Creative Cloud",
      department: "Media",
      is_active: true,
      requires_approval: true,
      notes: "Requires Creative Cloud seat",
    },
    {
      id: 4,
      name: "Figma",
      department: "Media",
      is_active: true,
      requires_approval: true,
      notes: null,
    },
  ];
}

export function getDevOnboardingOptions(): OnboardingFormOptions {
  return {
    departments: {
      Operations: "Operations",
      Media: "Media",
      "People Ops": "People Ops",
      IT: "IT",
      Finance: "Finance",
    },
    work_locations: {
      office: "Office",
      remote: "Remote",
      hybrid: "Hybrid",
    },
    employment_types: ["Full-time", "Part-time", "Contractor"],
    managers: [
      {
        id: 1,
        first_name: "Dev",
        last_name: "Manager",
        name: "Dev Manager",
        email: "dev.manager@curtlandry.com",
        department: "People Ops",
      },
      {
        id: 2,
        first_name: "Sam",
        last_name: "Carter",
        name: "Sam Carter",
        email: "sam.carter@curtlandry.com",
        department: "Operations",
      },
    ],
    assignable_assets: getDevAssets()
      .filter((a) => a.is_assignable)
      .map(
        ({
          id,
          asset_tag,
          serial_number,
          type,
          type_label,
          name,
          status,
          status_label,
          status_color,
          is_assignable,
          image_url,
        }) => ({
          id,
          asset_tag,
          serial_number,
          type,
          type_label,
          name,
          status,
          status_label,
          status_color,
          is_assignable,
          image_url,
        }),
      ),
    software_catalog: getDevSoftwareCatalog(),
  };
}

export function getDevAssets(): Asset[] {
  return getDevAssetStore().map((asset) => ({
    ...asset,
    assignments: asset.assignments ? [...asset.assignments] : [],
  }));
}

let devAssetStore: Asset[] | null = null;

function seedDevAssetStore(): Asset[] {
  return getDevAssignableAssets().map((asset) => ({
    ...asset,
    assigned_user_id: null,
    purchase_date: null,
    cost: null,
    notes: "Synced from Asset Tiger (local mock)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignments: [],
  }));
}

export function getDevAssetStore(): Asset[] {
  if (!devAssetStore) {
    devAssetStore = seedDevAssetStore();
  }
  return devAssetStore;
}

export function findDevAsset(id: number): Asset | undefined {
  return getDevAssetStore().find((a) => a.id === id);
}

export function upsertDevAsset(asset: Asset): Asset {
  const store = getDevAssetStore();
  const index = store.findIndex((a) => a.id === asset.id);
  const next = { ...asset, updated_at: new Date().toISOString() };
  if (index >= 0) {
    store[index] = next;
  } else {
    store.push(next);
  }
  return next;
}

export function removeDevAsset(id: number): void {
  const store = getDevAssetStore();
  const index = store.findIndex((a) => a.id === id);
  if (index >= 0) store.splice(index, 1);
}

export function getDevEmployees(): {
  id: number;
  name: string;
  email: string;
  department: string | null;
  job_title: string | null;
}[] {
  return [
    {
      id: 11,
      name: "Alex Rivera",
      email: "alex.rivera@curtlandry.com",
      department: "Operations",
      job_title: "Coordinator",
    },
    {
      id: 12,
      name: "Jordan Lee",
      email: "jordan.lee@curtlandry.com",
      department: "Media",
      job_title: "Producer",
    },
    {
      id: 13,
      name: "Sam Carter",
      email: "sam.carter@curtlandry.com",
      department: "Operations",
      job_title: "Manager",
    },
    {
      id: 14,
      name: "Taylor Morgan",
      email: "taylor.morgan@curtlandry.com",
      department: "People Ops",
      job_title: "HR Specialist",
    },
  ];
}

export function getDevAssetOptions(): AssetOptions {
  return {
    types: {
      laptop: "Laptop",
      desktop: "Desktop",
      tablet: "Tablet",
      phone: "Phone",
      other: "Other",
    },
    statuses: {
      available: "Available",
      assigned: "Assigned",
      repair: "In Repair",
      retired: "Retired",
      needs_backup: "Needs Backup",
    },
    status_colors: {
      available: "green",
      assigned: "blue",
      repair: "amber",
      retired: "gray",
      needs_backup: "orange",
    },
    // "assigned" is only set via Assign-to-employee (requires a person).
    transitions: {
      available: ["repair", "retired"],
      assigned: ["available", "repair", "retired", "needs_backup"],
      repair: ["available", "retired"],
      retired: [],
      needs_backup: ["available", "repair", "retired"],
    },
    assignable_statuses: ["available"],
  };
}

export function buildDevSubmittedCase(payload: {
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department?: string;
  work_location?: string;
  start_date: string;
  device_needed?: boolean;
  requested_asset_id?: number;
  purchase_needed?: boolean;
  requested_device_note?: string;
  software?: number[];
}): OnboardingCase {
  const asset = getDevAssets().find((a) => a.id === payload.requested_asset_id);
  const software =
    payload.software
      ?.map((id) => getDevSoftwareCatalog().find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => ({
        id: s!.id,
        name: s!.name,
        requires_approval: s!.requires_approval,
      })) ?? null;

  return {
    id: Math.floor(Math.random() * 10000) + 5000,
    user_id: 99,
    submitted_by: 1,
    department: payload.department ?? null,
    work_location: payload.work_location ?? null,
    work_location_label: payload.work_location
      ? getDevOnboardingOptions().work_locations[payload.work_location] ??
        payload.work_location
      : null,
    start_date: payload.start_date,
    status: "submitted",
    status_label: "Submitted",
    status_color: "blue",
    device_needed: !!payload.device_needed,
    requested_asset_id: payload.requested_asset_id ?? null,
    purchase_needed: !!payload.purchase_needed,
    requested_device_note: payload.requested_device_note ?? null,
    service_setup: [],
    software,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    new_hire: {
      id: 99,
      name: `${payload.first_name} ${payload.last_name}`,
      email: payload.email,
      is_active: false,
      job_title: payload.job_title ?? null,
    },
    submitted_by_user: { id: 1, name: "Dev Manager" },
    requested_asset: asset,
    tasks: [],
    notes: [],
  };
}
