import type {
  PtoEligibility,
  TimeOffBalance,
  TimeOffRequest,
  TimeOffType,
} from "@/lib/api/time-off-service";
import { DEV_MANAGER_USER } from "@/lib/dev-auth";

export { isDevAuthToken } from "@/lib/dev-auth";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function withBalanceAliases(
  b: Omit<
    TimeOffBalance,
    "balance" | "used" | "pending" | "available" | "accrued_ytd" | "carry_over"
  >,
): TimeOffBalance {
  return {
    ...b,
    balance: b.accrued_hours + b.carry_over_hours + b.adjustment_hours,
    used: b.used_hours,
    pending: b.pending_hours,
    available: b.available_hours,
    accrued_ytd: b.accrued_hours,
    carry_over: b.carry_over_hours,
  };
}

export function getDevTimeOffTypes(): TimeOffType[] {
  return [
    {
      id: 1,
      code: "PTO",
      name: "Paid Time Off",
      description: "Accrued vacation / personal paid leave",
      color: "#00BC8B",
      requires_approval: true,
      requires_documentation: false,
      uses_accrual: true,
      uses_tenure_tiers: true,
      min_increment_hours: 4,
      max_consecutive_days: null,
      is_paid: true,
      is_active: true,
      sort_order: 1,
    },
    {
      id: 2,
      code: "SICK",
      name: "Sick Leave",
      description: "Illness or medical appointments",
      color: "#CD2907",
      requires_approval: false,
      requires_documentation: false,
      uses_accrual: false,
      uses_tenure_tiers: false,
      min_increment_hours: 4,
      max_consecutive_days: null,
      is_paid: true,
      is_active: true,
      sort_order: 2,
    },
    {
      id: 3,
      code: "BEREAVEMENT",
      name: "Bereavement",
      description: "Leave for family loss",
      color: "#6B7280",
      requires_approval: true,
      requires_documentation: false,
      uses_accrual: false,
      uses_tenure_tiers: false,
      min_increment_hours: 8,
      max_consecutive_days: 5,
      is_paid: true,
      is_active: true,
      sort_order: 3,
    },
  ];
}

export function getDevPtoEligibility(): PtoEligibility {
  return {
    applies: true,
    eligible: true,
    eligible_on: "2024-07-15",
    waiting_period_months: 6,
    hire_date: DEV_MANAGER_USER.hire_date ?? "2024-01-15",
  };
}

/** Realistic sample balances for analyzing the Balances / Request UI. */
export function getDevTimeOffBalances(year?: number): TimeOffBalance[] {
  const y = year ?? new Date().getFullYear();

  return [
    withBalanceAliases({
      id: 101,
      type: { id: 1, code: "PTO", name: "Paid Time Off", color: "#00BC8B" },
      year: y,
      accrued_hours: 96,
      used_hours: 32,
      pending_hours: 16,
      adjustment_hours: 0,
      carry_over_hours: 24,
      available_hours: 72, // 96 + 24 - 32 - 16
      available_days: 9,
      tier: {
        name: "Years 1–3",
        accrual_rate: 5.33,
        annual_days: 16,
      },
      current_accrual_rate: 5.33,
      proration_factor: 1,
      next_accrual_date: daysFromNow(12),
      max_balance: 160,
      max_carry_over: 40,
      min_allowed: 0,
    }),
    withBalanceAliases({
      id: 102,
      type: { id: 2, code: "SICK", name: "Sick Leave", color: "#CD2907" },
      year: y,
      accrued_hours: 40,
      used_hours: 8,
      pending_hours: 0,
      adjustment_hours: 0,
      carry_over_hours: 0,
      available_hours: 32,
      available_days: 4,
      tier: null,
      current_accrual_rate: 0,
      proration_factor: 1,
      next_accrual_date: null,
      max_balance: 40,
      max_carry_over: 0,
      min_allowed: 0,
    }),
    withBalanceAliases({
      id: 103,
      type: {
        id: 3,
        code: "BEREAVEMENT",
        name: "Bereavement",
        color: "#6B7280",
      },
      year: y,
      accrued_hours: 24,
      used_hours: 0,
      pending_hours: 0,
      adjustment_hours: 0,
      carry_over_hours: 0,
      available_hours: 24,
      available_days: 3,
      tier: null,
      current_accrual_rate: 0,
      proration_factor: 1,
      next_accrual_date: null,
      max_balance: 24,
      max_carry_over: 0,
      min_allowed: 0,
    }),
  ];
}

let devRequestStore: TimeOffRequest[] | null = null;
let nextDevRequestId = 9001;

function seedDevRequests(): TimeOffRequest[] {
  const types = getDevTimeOffTypes();
  const pto = types[0];
  const sick = types[1];
  const user = {
    id: DEV_MANAGER_USER.id,
    name: DEV_MANAGER_USER.name ?? "Dev Manager",
    email: DEV_MANAGER_USER.email,
    avatar_url: null as string | null,
  };

  return [
    {
      id: 8001,
      user,
      type: {
        id: pto.id,
        code: pto.code,
        name: pto.name,
        color: pto.color,
      },
      start_date: daysFromNow(10),
      end_date: daysFromNow(11),
      total_hours: 16,
      status: "pending",
      notes: "Long weekend trip",
      approver: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 8002,
      user,
      type: {
        id: pto.id,
        code: pto.code,
        name: pto.name,
        color: pto.color,
      },
      start_date: daysFromNow(-21),
      end_date: daysFromNow(-20),
      total_hours: 16,
      status: "approved",
      notes: "Family visit",
      approver: { id: 2, name: "Sam Carter" },
      approved_at: daysFromNow(-25) + "T15:00:00.000Z",
      reviewed_by: { id: 2, name: "Sam Carter" },
      reviewed_at: daysFromNow(-25) + "T15:00:00.000Z",
      review_notes: "Coverage looks good for those dates. Enjoy the trip!",
      created_at: daysFromNow(-30) + "T12:00:00.000Z",
      updated_at: daysFromNow(-25) + "T15:00:00.000Z",
    },
    {
      id: 8003,
      user,
      type: {
        id: sick.id,
        code: sick.code,
        name: sick.name,
        color: sick.color,
      },
      start_date: daysFromNow(-45),
      end_date: daysFromNow(-45),
      total_hours: 8,
      status: "approved",
      notes: "Doctor appointment",
      approver: { id: 2, name: "Sam Carter" },
      approved_at: daysFromNow(-46) + "T10:00:00.000Z",
      reviewed_by: { id: 2, name: "Sam Carter" },
      reviewed_at: daysFromNow(-46) + "T10:00:00.000Z",
      review_notes: "Approved — feel better soon.",
      created_at: daysFromNow(-47) + "T09:00:00.000Z",
      updated_at: daysFromNow(-46) + "T10:00:00.000Z",
    },
    {
      id: 8004,
      user,
      type: {
        id: pto.id,
        code: pto.code,
        name: pto.name,
        color: pto.color,
      },
      start_date: daysFromNow(-60),
      end_date: daysFromNow(-58),
      total_hours: 24,
      status: "denied",
      notes: "Conference travel",
      approver: { id: 2, name: "Sam Carter" },
      approved_at: null,
      reviewed_by: { id: 2, name: "Sam Carter" },
      reviewed_at: daysFromNow(-62) + "T14:00:00.000Z",
      review_notes: "Team coverage conflict that week",
      created_at: daysFromNow(-65) + "T11:00:00.000Z",
      updated_at: daysFromNow(-62) + "T14:00:00.000Z",
    },
  ];
}

function getDevRequestStore(): TimeOffRequest[] {
  if (!devRequestStore) {
    devRequestStore = seedDevRequests();
  }
  return devRequestStore;
}

export function getDevTimeOffRequests(filters?: {
  status?: string | string[];
  type_id?: number;
  year?: number;
}): TimeOffRequest[] {
  let requests = [...getDevRequestStore()];

  if (filters?.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    requests = requests.filter((r) => statuses.includes(r.status));
  }
  if (filters?.type_id) {
    requests = requests.filter((r) => r.type.id === filters.type_id);
  }
  if (filters?.year) {
    const y = String(filters.year);
    requests = requests.filter((r) => r.start_date.startsWith(y));
  }

  return requests.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export function getDevUpcomingTimeOff(limit = 5): TimeOffRequest[] {
  const today = daysFromNow(0);
  return getDevTimeOffRequests({ status: "approved" })
    .filter((r) => r.start_date >= today)
    .slice(0, limit);
}

export function getDevTimeOffStats(): {
  pending_count: number;
  total_count: number;
} {
  const all = getDevRequestStore();
  return {
    pending_count: all.filter((r) => r.status === "pending").length,
    total_count: all.length,
  };
}

export function createDevTimeOffRequest(data: {
  time_off_type_id: number;
  start_date: string;
  end_date: string;
  total_hours?: number;
  notes?: string;
  submit?: boolean;
}): TimeOffRequest {
  const type =
    getDevTimeOffTypes().find((t) => t.id === data.time_off_type_id) ??
    getDevTimeOffTypes()[0];

  const start = new Date(data.start_date + "T12:00:00");
  const end = new Date(data.end_date + "T12:00:00");
  const daySpan = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const hours = data.total_hours ?? daySpan * 8;

  const created: TimeOffRequest = {
    id: nextDevRequestId++,
    user: {
      id: DEV_MANAGER_USER.id,
      name: DEV_MANAGER_USER.name ?? "Dev Manager",
      email: DEV_MANAGER_USER.email,
      avatar_url: null,
    },
    type: {
      id: type.id,
      code: type.code,
      name: type.name,
      color: type.color,
    },
    start_date: data.start_date,
    end_date: data.end_date,
    total_hours: hours,
    status: data.submit === false ? "draft" : "pending",
    notes: data.notes ?? null,
    approver: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  getDevRequestStore().unshift(created);
  return created;
}

export function cancelDevTimeOffRequest(
  id: number,
  reason?: string,
): TimeOffRequest {
  const store = getDevRequestStore();
  const idx = store.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Request not found");

  const updated: TimeOffRequest = {
    ...store[idx],
    status: "cancelled",
    cancelled_by: {
      id: DEV_MANAGER_USER.id,
      name: DEV_MANAGER_USER.name ?? "Dev Manager",
    },
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason ?? null,
    updated_at: new Date().toISOString(),
  };
  store[idx] = updated;
  return updated;
}
