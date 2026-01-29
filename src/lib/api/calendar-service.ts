import { httpClient } from "./http-client";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  all_day: boolean;
}

export interface CalendarStatus {
  enabled: boolean;
  configured: boolean;
  calendar_id: string | null;
}

export const calendarService = {
  /**
   * Get calendar events within a date range
   */
  async getEvents(
    startDate: string,
    endDate: string,
  ): Promise<CalendarEvent[]> {
    const response = await httpClient.get<{ events: CalendarEvent[] }>(
      "/portal/calendar/events",
      {
        params: { start_date: startDate, end_date: endDate },
      },
    );
    return response.events || [];
  },

  /**
   * Check if calendar integration is configured
   */
  async getStatus(): Promise<CalendarStatus> {
    return await httpClient.get<CalendarStatus>("/portal/calendar/status");
  },
};
