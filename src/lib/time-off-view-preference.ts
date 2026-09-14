const TIME_OFF_VIEW_KEY = "clm-time-off-view";

export type TimeOffViewPreference = "simple" | "classic";

export function getTimeOffViewPreference(): TimeOffViewPreference {
  if (typeof window === "undefined") return "simple";
  const stored = localStorage.getItem(TIME_OFF_VIEW_KEY);
  return stored === "classic" ? "classic" : "simple";
}

export function setTimeOffViewPreference(view: TimeOffViewPreference): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIME_OFF_VIEW_KEY, view);
}
