import type { DateJst } from "~domain/jst";
import { addDaysJst } from "~domain/jst";

import { instantsToPlanTimes } from "~/features/plan/lib/plan-event-instants";
import { dateToScheduleInstant, scheduleInstantToDate } from "~/features/plan/lib/schedule-instant";

export function planEventDateWithTime(dateJst: DateJst, time: string): Date {
  if (time === "24:00") {
    return scheduleInstantToDate(`${addDaysJst(dateJst, 1)} 00:00:00`);
  }
  return scheduleInstantToDate(`${dateJst} ${time}:00`);
}

export function planEventTimeLabel(date: Date): string {
  return dateToScheduleInstant(date).slice(11, 16);
}

export function planEventEndTimeLabel(dateJst: DateJst, start: Date, end: Date): string {
  const times = instantsToPlanTimes(dateToScheduleInstant(start), dateToScheduleInstant(end));
  if (times !== null && times.dateJst === dateJst) {
    return times.endTime;
  }
  return planEventTimeLabel(end);
}
