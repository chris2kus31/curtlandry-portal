// src/lib/api/index.ts
export { httpClient } from "./http-client";
export { authService } from "./auth-service";
export { timeOffService } from "./time-off-service";
export { calendarService } from "./calendar-service";
export { adminService } from "./admin-service";
export { approvalService } from "./approval-service";

// Time-off service types
export type {
  TimeOffType,
  TimeOffBalance,
  TimeOffRequest,
} from "./time-off-service";

// Calendar service types
export type { CalendarEvent, CalendarStatus } from "./calendar-service";

// Admin service types
export type {
  User as AdminUser,
  Role,
  Balance,
  TimeOffType as AdminTimeOffType,
  AccrualTier,
  BlackoutPeriod,
  GeneralSettings,
  AdminSettings,
  UpdateUserData,
  BalanceAdjustment,
  BlackoutPeriodData,
  PendingRequest,
} from "./admin-service";

// Approval service types
export type {
  TeamMember,
  TimeOffRequest as ApprovalTimeOffRequest,
  ApprovalFilters,
} from "./approval-service";
