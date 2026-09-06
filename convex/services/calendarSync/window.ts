import { CALENDAR_SYNC_WINDOW } from "../../lib/calendarSync";
import { addDaysJst } from "../../lib/jst";
import { ALL_DAY_START_TIME, scheduleInstantToRfc3339 } from "./instant";

export type SyncWindow = {
  timeMax: string;
  timeMin: string;
  startAtMaxExclusive: string;
  startAtMin: string;
};

export function syncWindow(todayJst: string): SyncWindow {
  const startAtMin = `${addDaysJst(todayJst, -CALENDAR_SYNC_WINDOW.pastDays)} ${ALL_DAY_START_TIME}`;
  const startAtMaxExclusive = `${addDaysJst(todayJst, CALENDAR_SYNC_WINDOW.futureDays + 1)} ${ALL_DAY_START_TIME}`;
  return {
    startAtMaxExclusive,
    startAtMin,
    timeMax: scheduleInstantToRfc3339(startAtMaxExclusive),
    timeMin: scheduleInstantToRfc3339(startAtMin),
  };
}

export function isWithinWindow(startAt: string, window: SyncWindow): boolean {
  return startAt >= window.startAtMin && startAt < window.startAtMaxExclusive;
}
