import type { User } from "@/types/auth";
import type { TimeOffRequest } from "@/lib/api/approval-service";
import type { CalendarEvent } from "@/lib/api/calendar-service";
import type {
  OnboardingAsset,
  OnboardingCase,
  OnboardingFormOptions,
  OnboardingNote,
  OnboardingTask,
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
    {
      id: 9006,
      asset_tag: "AT-IPHONE-15-002",
      serial_number: "F2LX9PHONE001",
      type: "phone",
      type_label: "Phone",
      name: "iPhone 15",
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: null,
    },
    {
      id: 9007,
      asset_tag: "AT-HOTSPOT-001",
      serial_number: "HS-77821",
      type: "other",
      type_label: "Other",
      name: "Verizon Mobile Hotspot",
      status: "available",
      status_label: "Available",
      status_color: "green",
      is_assignable: true,
      image_url: null,
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

// ---------------------------------------------------------------------------
// Local onboarding case store (so intake submit persists in the UI preview)
// ---------------------------------------------------------------------------

let devCaseStore: OnboardingCase[] | null = null;
let nextDevCaseId = 5001;
let nextDevNoteId = 1;
let nextDevTaskId = 1;

function getDevCaseStore(): OnboardingCase[] {
  if (!devCaseStore) {
    devCaseStore = [];
  }
  return devCaseStore;
}

function toOnboardingAsset(asset: Asset | undefined): OnboardingAsset | undefined {
  if (!asset) return undefined;
  return {
    id: asset.id,
    asset_tag: asset.asset_tag,
    serial_number: asset.serial_number,
    type: asset.type,
    type_label: asset.type_label,
    name: asset.name,
    status: asset.status,
    status_label: asset.status_label,
    status_color: asset.status_color,
    is_assignable: asset.is_assignable,
    image_url: asset.image_url,
  };
}

function buildDevIntakeTasks(payload: {
  hireName: string;
  device_needed?: boolean;
  purchase_needed?: boolean;
  software?: { id: number; name: string; requires_approval: boolean }[] | null;
}): OnboardingTask[] {
  const now = new Date().toISOString();
  const hireName = payload.hireName.trim() || "new hire";
  const handoffLabel = `Shipped / handed off to ${hireName}`;
  const tasks: OnboardingTask[] = [
    {
      id: nextDevTaskId++,
      onboarding_case_id: 0,
      type: "hr_setup",
      title: "HR setup",
      assigned_role: "hr",
      assigned_user_id: null,
      status: "pending",
      status_label: "Pending",
      status_color: "gray",
      checklist: [
        { label: "Confirm start date & employment details", done: false },
        { label: "Send welcome / paperwork packet", done: false },
      ],
      waiting_on: null,
      completion_note: null,
      completed_at: null,
      locked_at: null,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: nextDevTaskId++,
      onboarding_case_id: 0,
      type: "it_accounts",
      title: "IT accounts & access",
      assigned_role: "it",
      assigned_user_id: null,
      status: "pending",
      status_label: "Pending",
      status_color: "gray",
      checklist: [
        { label: "Provision Google Workspace", done: false },
        { label: "Add to required Slack channels", done: false },
      ],
      waiting_on: null,
      completion_note: null,
      completed_at: null,
      locked_at: null,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
  ];

  if (payload.device_needed) {
    tasks.push({
      id: nextDevTaskId++,
      onboarding_case_id: 0,
      type: "device",
      title: payload.purchase_needed
        ? "Procure & assign device"
        : "Assign device",
      assigned_role: "it",
      assigned_user_id: null,
      status: "pending",
      status_label: "Pending",
      status_color: "gray",
      checklist: payload.purchase_needed
        ? [
            { label: "Order device from note", done: false },
            { label: "Image / configure device", done: false },
            { label: handoffLabel, done: false },
          ]
        : [
            { label: "Configure assigned device", done: false },
            { label: handoffLabel, done: false },
          ],
      waiting_on: null,
      completion_note: null,
      completed_at: null,
      locked_at: null,
      is_locked: false,
      created_at: now,
      updated_at: now,
    });
  }

  const needsApproval = (payload.software ?? []).some((s) => s.requires_approval);
  if ((payload.software?.length ?? 0) > 0) {
    tasks.push({
      id: nextDevTaskId++,
      onboarding_case_id: 0,
      type: "software",
      title: needsApproval ? "Software licenses (approval needed)" : "Software licenses",
      assigned_role: "it",
      assigned_user_id: null,
      status: "pending",
      status_label: "Pending",
      status_color: "gray",
      checklist: (payload.software ?? []).map((s) => ({
        label: s.requires_approval ? `${s.name} (approval)` : s.name,
        done: false,
      })),
      waiting_on: needsApproval ? "Approver" : null,
      completion_note: null,
      completed_at: null,
      locked_at: null,
      is_locked: false,
      created_at: now,
      updated_at: now,
    });
  }

  return tasks;
}

export function listDevCases(filters: {
  status?: string;
  active?: boolean;
  department?: string;
  search?: string;
} = {}): OnboardingCase[] {
  let cases = getDevCaseStore().map((c) => ({
    ...c,
    tasks: c.tasks ? [...c.tasks] : [],
    notes: c.notes ? [...c.notes] : [],
    software: c.software ? [...c.software] : null,
  }));

  if (filters.status) {
    cases = cases.filter((c) => c.status === filters.status);
  }
  if (filters.active) {
    cases = cases.filter(
      (c) => c.status === "submitted" || c.status === "in_progress",
    );
  }
  if (filters.department) {
    cases = cases.filter((c) => c.department === filters.department);
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    cases = cases.filter((c) => {
      const name = c.new_hire?.name?.toLowerCase() ?? "";
      const email = c.new_hire?.email?.toLowerCase() ?? "";
      const dept = c.department?.toLowerCase() ?? "";
      return name.includes(term) || email.includes(term) || dept.includes(term);
    });
  }

  return cases.sort((a, b) => {
    const aDate = a.start_date ?? "";
    const bDate = b.start_date ?? "";
    return aDate.localeCompare(bDate);
  });
}

export function findDevCase(id: number): OnboardingCase | undefined {
  const found = getDevCaseStore().find((c) => c.id === id);
  if (!found) return undefined;
  return {
    ...found,
    tasks: found.tasks ? [...found.tasks] : [],
    notes: found.notes ? [...found.notes] : [],
    software: found.software ? [...found.software] : null,
  };
}

export function addDevCaseNote(id: number, body: string): OnboardingNote {
  const store = getDevCaseStore();
  const idx = store.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Onboarding case not found");

  const note: OnboardingNote = {
    id: nextDevNoteId++,
    onboarding_case_id: id,
    body,
    created_at: new Date().toISOString(),
    author: { id: 1, name: "Dev Manager" },
  };

  const existing = store[idx];
  store[idx] = {
    ...existing,
    notes: [note, ...(existing.notes ?? [])],
    updated_at: new Date().toISOString(),
  };
  return note;
}

export function updateDevCaseTask(
  caseId: number,
  taskId: number,
  payload: {
    status?: OnboardingTask["status"];
    waiting_on?: string | null;
    completion_note?: string | null;
    checklist?: OnboardingTask["checklist"];
  },
): OnboardingTask {
  const store = getDevCaseStore();
  const caseIdx = store.findIndex((c) => c.id === caseId);
  if (caseIdx < 0) throw new Error("Onboarding case not found");

  const current = store[caseIdx];
  const tasks = [...(current.tasks ?? [])];
  const taskIdx = tasks.findIndex((t) => t.id === taskId);
  if (taskIdx < 0) throw new Error("Task not found");

  const prev = tasks[taskIdx];
  const nextStatus = payload.status ?? prev.status;
  const updated: OnboardingTask = {
    ...prev,
    status: nextStatus,
    status_label:
      nextStatus === "completed"
        ? "Completed"
        : nextStatus === "in_progress"
          ? "In progress"
          : nextStatus === "waiting_on"
            ? "Waiting"
            : "Pending",
    status_color:
      nextStatus === "completed"
        ? "green"
        : nextStatus === "in_progress"
          ? "blue"
          : nextStatus === "waiting_on"
            ? "amber"
            : "gray",
    waiting_on:
      payload.waiting_on !== undefined ? payload.waiting_on : prev.waiting_on,
    completion_note:
      payload.completion_note !== undefined
        ? payload.completion_note
        : prev.completion_note,
    checklist: payload.checklist ?? prev.checklist,
    completed_at:
      nextStatus === "completed"
        ? prev.completed_at ?? new Date().toISOString()
        : null,
    updated_at: new Date().toISOString(),
  };

  tasks[taskIdx] = updated;

  const allDone = tasks.every((t) => t.status === "completed");
  const anyStarted = tasks.some(
    (t) => t.status === "in_progress" || t.status === "completed",
  );

  store[caseIdx] = {
    ...current,
    tasks,
    status: allDone ? "completed" : anyStarted ? "in_progress" : current.status,
    status_label: allDone
      ? "Completed"
      : anyStarted
        ? "In progress"
        : current.status_label,
    status_color: allDone ? "green" : anyStarted ? "blue" : current.status_color,
    completed_at: allDone ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  return { ...updated };
}

export function cancelDevCase(id: number): OnboardingCase {
  const store = getDevCaseStore();
  const idx = store.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Onboarding case not found");

  const updated: OnboardingCase = {
    ...store[idx],
    status: "cancelled",
    status_label: "Cancelled",
    status_color: "gray",
    updated_at: new Date().toISOString(),
  };
  store[idx] = updated;
  return findDevCase(id)!;
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
  const email = payload.email.trim().toLowerCase();
  const duplicate = getDevCaseStore().some(
    (c) => c.new_hire?.email?.toLowerCase() === email && c.status !== "cancelled",
  );
  if (duplicate) {
    throw new Error("This email is already in use");
  }

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

  const caseId = nextDevCaseId++;
  const hireName = `${payload.first_name} ${payload.last_name}`.trim();
  const tasks = buildDevIntakeTasks({
    hireName,
    device_needed: payload.device_needed,
    purchase_needed: payload.purchase_needed,
    software,
  }).map((t) => ({ ...t, onboarding_case_id: caseId }));

  const created: OnboardingCase = {
    id: caseId,
    user_id: 90_000 + caseId,
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
      id: 90_000 + caseId,
      name: `${payload.first_name} ${payload.last_name}`,
      email,
      is_active: false,
      job_title: payload.job_title ?? null,
    },
    submitted_by_user: { id: 1, name: "Dev Manager" },
    requested_asset: toOnboardingAsset(asset),
    tasks,
    notes: [],
  };

  getDevCaseStore().unshift(created);

  // Reflect device reservation in local Asset Tiger mock inventory.
  if (asset && payload.device_needed && !payload.purchase_needed) {
    upsertDevAsset({
      ...asset,
      status: "assigned",
      status_label: "Assigned",
      status_color: "blue",
      is_assignable: false,
      assigned_user_id: created.user_id,
      assigned_user: {
        id: created.user_id,
        name: created.new_hire!.name,
        email: created.new_hire!.email,
      },
    });
  }

  return findDevCase(caseId)!;
}
