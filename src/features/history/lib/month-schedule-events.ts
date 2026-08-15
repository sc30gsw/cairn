import type { ScheduleEventData } from "@mantine/schedule";
import { indexBy, mapValues, prop } from "remeda";

import { RECORD_STATUS_UI } from "~/features/history/lib/record-status-label";
import type { MonthEvent } from "~/features/history/types/history";

export function confirmedMonthEvents(events: MonthEvent[]): MonthEvent[] {
  return events.filter((event) => event.status === "確定");
}

export function toMonthScheduleEvents(events: MonthEvent[]): ScheduleEventData[] {
  return confirmedMonthEvents(events).map((event) => ({
    color: RECORD_STATUS_UI.確定.color,
    end: `${event.dateJst} 23:59:59`,
    id: event.rowId,
    start: `${event.dateJst} 00:00:00`,
    title: event.title,
  }));
}

export function monthEventMinutesById(events: MonthEvent[]): Map<string, number> {
  return new Map(
    Object.entries(mapValues(indexBy(events, prop("rowId")), prop("minutes"))),
  );
}
