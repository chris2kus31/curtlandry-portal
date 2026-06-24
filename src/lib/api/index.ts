// src/lib/api/index.ts
export { httpClient } from "./http-client";
export { authService } from "./auth-service";
export { timeOffService } from "./time-off-service";
export { calendarService } from "./calendar-service";
export { adminService } from "./admin-service";
export { approvalService } from "./approval-service";
export { wooService } from "./woo-service";
export { siteService } from "./site-service";
export { adminApplicationsService } from "./admin-applications-service";
export { mediaService } from "./media-service";
export type { MediaAsset } from "./media-service";
export { onboardingService } from "./onboarding-service";
export type {
  OnboardingStatus,
  OnboardingTaskStatus,
  OnboardingChecklistItem,
  OnboardingAsset,
  OnboardingTask,
  OnboardingNote,
  OnboardingCase,
  OnboardingManager,
  OnboardingFormOptions,
  IntakePayload,
  OnboardingListFilters,
  UpdateTaskPayload,
} from "./onboarding-service";

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

// TODO: Uncomment when site-service module is implemented
// export type {
//   Site,
//   SitePage,
//   SitePageSection,
//   SchemaField,
//   SectionSchema,
//   MediaAsset,
//   CreateSiteData,
//   CreatePageData,
//   CreateSectionData,
// } from "./site-service";

// WooCommerce service types
export type {
  WooCategory,
  WooProduct,
  SaleResult,
  SaleBatch,
  BatchDetails,
  ApplySaleRequest,
  RollbackResult,
} from "./woo-service";

// Admin applications (event-application review widget) types
export type {
  ApplicationStatus,
  EventLifecycleStatus,
  AdminEvent,
  AdminEventSummary,
  AdminApplicationSummary,
  AdminApplicationDetail,
  AdminApplicationNote,
  AdminApplicationStats,
  AdminTimelineEntry,
  AllowedTransition,
  QueueFilters,
  ChangeStatusPayload,
  AddNotePayload,
  SendEmailPayload,
  CreateEventPayload,
  UpdateEventPayload,
  SchemaField,
  SchemaSection,
  SchemaStep,
  SchemaOption,
  ApplicationSchema,
} from "./admin-applications-service";

export { STATUS_LABELS } from "./admin-applications-service";
