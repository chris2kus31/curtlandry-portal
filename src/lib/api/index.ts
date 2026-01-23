// src/lib/api/index.ts
export { httpClient } from "./http-client";
export { authService } from "./auth-service";
export { timeOffService } from "./time-off-service";
export type {
  TimeOffType,
  TimeOffBalance,
  TimeOffRequest,
} from "./time-off-service";
