import {
  formatMinuteOfDay,
  parseMinuteOfDay,
  planMinuteToScheduleInstant,
  planWindowFromScheduleInstants,
} from "~domain/planEvent";

export function planTimesToInstants(
  dateJst: string,
  startTime: string,
  endTime: string,
): { endAt: string; startAt: string } {
  return {
    endAt: planMinuteToScheduleInstant(dateJst, parseMinuteOfDay(endTime, "end")),
    startAt: planMinuteToScheduleInstant(dateJst, parseMinuteOfDay(startTime, "start")),
  };
}

export function instantsToPlanTimes(
  startAt: string,
  endAt: string,
): { dateJst: string; endTime: string; startTime: string } | null {
  const window = planWindowFromScheduleInstants(startAt, endAt);
  if (window === null) {
    return null;
  }
  return {
    dateJst: window.dateJst,
    endTime: formatMinuteOfDay(window.endMinute),
    startTime: formatMinuteOfDay(window.startMinute),
  };
}
