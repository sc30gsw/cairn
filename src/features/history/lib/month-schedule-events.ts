import type { ScheduleEventData } from "@mantine/schedule";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import { RECORD_STATUS_UI } from "~/features/history/lib/record-status-label";

type MonthEvent = FunctionReturnType<typeof api.history.monthBreakdown>["events"][number];

export function toMonthScheduleEvents(events: MonthEvent[]): ScheduleEventData[] {
  return events.map((event) => ({
    color: RECORD_STATUS_UI[event.status].color,
    end: `${event.dateJst} 23:59:59`,
    id: event.rowId,
    start: `${event.dateJst} 00:00:00`,
    title: event.title,
  }));
}

export function monthEventMinutesById(events: MonthEvent[]): Map<string, number> {
  return new Map(events.map((event) => [event.rowId, event.minutes]));
}
