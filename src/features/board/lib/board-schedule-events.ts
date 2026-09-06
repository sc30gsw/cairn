import type { ScheduleEventData } from "@mantine/schedule";
import { googleCalendarEventColor } from "~domain/googleCalendarColors";

import {
  dateToScheduleInstant,
  scheduleInstantToDate,
} from "~/features/board/lib/schedule-instant";
import type {
  BoardExternalEvent,
  BoardRow,
  BoardScheduleBlock,
} from "~/features/board/types/board";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

export const BOARD_ALL_DAY_VISIBLE_LIMIT = 2;
export const BOARD_ALL_DAY_MORE_PREFIX = "board-more:";
const BOARD_EXTERNAL_EVENT_PREFIX = "external:";
const BOARD_EXTERNAL_EVENT_COLOR = "gray";
const ALL_DAY_START_SUFFIX = " 00:00:00";
const ALL_DAY_END_SUFFIX = " 23:59:59";

function scheduleInstantString(value: string | Date): string {
  return typeof value === "string" ? value : dateToScheduleInstant(value);
}

function isAllDayEvent(event: ScheduleEventData): boolean {
  const start = scheduleInstantString(event.start);
  const end = scheduleInstantString(event.end);
  return start.endsWith(ALL_DAY_START_SUFFIX) && end.endsWith(ALL_DAY_END_SUFFIX);
}

export function isBoardAllDayEvent(event: ScheduleEventData): boolean {
  return isAllDayEvent(event);
}

export function withoutAllDayEvents(events: readonly ScheduleEventData[]): ScheduleEventData[] {
  return events.filter((event) => !isAllDayEvent(event));
}

function dayFromScheduleInstant(value: string | Date): string {
  return scheduleInstantString(value).slice(0, 10);
}

export function isBoardAllDayMoreEvent(eventId: string | number): boolean {
  return String(eventId).startsWith(BOARD_ALL_DAY_MORE_PREFIX);
}

export function boardAllDayMoreDate(eventId: string | number): string {
  return String(eventId).slice(BOARD_ALL_DAY_MORE_PREFIX.length);
}

export function allDayEventsForDay(
  events: readonly ScheduleEventData[],
  day: string,
): ScheduleEventData[] {
  return events.filter(
    (event) =>
      isAllDayEvent(event) &&
      !isBoardAllDayMoreEvent(event.id) &&
      dayFromScheduleInstant(event.start) <= day &&
      dayFromScheduleInstant(event.end) >= day,
  );
}

export function timedEventsForDay(
  events: readonly ScheduleEventData[],
  day: string,
): ScheduleEventData[] {
  return events.filter((event) => {
    if (isAllDayEvent(event) || isBoardAllDayMoreEvent(event.id)) {
      return false;
    }
    return (
      scheduleInstantString(event.start) <= `${day}${ALL_DAY_END_SUFFIX}` &&
      scheduleInstantString(event.end) > `${day}${ALL_DAY_START_SUFFIX}`
    );
  });
}

export function withAllDayOverflow(
  events: ScheduleEventData[],
  maxVisible: number,
  moreLabel: (hiddenEventsCount: number) => string,
  days: readonly string[],
): {
  events: ScheduleEventData[];
  hiddenEventsByDay: ReadonlyMap<string, ScheduleEventData[]>;
} {
  const timedEvents = events.filter((event) => !isAllDayEvent(event));
  const visibleEvents: ScheduleEventData[] = [...timedEvents];
  const hiddenEventsByDay = new Map<string, ScheduleEventData[]>();

  const allDayDates = new Set(days);
  for (const event of events) {
    if (isAllDayEvent(event)) {
      allDayDates.add(dayFromScheduleInstant(event.start));
    }
  }
  for (const day of allDayDates) {
    const dayEvents = allDayEventsForDay(events, day);
    visibleEvents.push(
      ...dayEvents.slice(0, maxVisible).map((event) => {
        if (dayFromScheduleInstant(event.start) === dayFromScheduleInstant(event.end)) {
          return event;
        }
        return {
          ...event,
          end: `${day}${ALL_DAY_END_SUFFIX}`,
          id: `${event.id}|${day}`,
          start: `${day}${ALL_DAY_START_SUFFIX}`,
        };
      }),
    );
    if (dayEvents.length <= maxVisible) {
      continue;
    }
    const hidden = dayEvents.slice(maxVisible);
    hiddenEventsByDay.set(day, hidden);
    visibleEvents.push({
      color: "gray",
      end: `${day}${ALL_DAY_END_SUFFIX}`,
      id: `${BOARD_ALL_DAY_MORE_PREFIX}${day}`,
      start: `${day}${ALL_DAY_START_SUFFIX}`,
      title: moreLabel(hidden.length),
    });
  }

  return { events: visibleEvents, hiddenEventsByDay };
}

export function toBoardScheduleEvents(
  dateJst: string,
  rows: readonly BoardRow[],
  blocks: readonly BoardScheduleBlock[],
): ScheduleEventData[] {
  const recordEvents = rows.map((row) => ({
    color: RECORD_STATUS_UI[row.status].color,
    end: `${dateJst}${ALL_DAY_END_SUFFIX}`,
    id: row._id,
    start: `${dateJst}${ALL_DAY_START_SUFFIX}`,
    title: row.itemName,
  }));

  const blockEvents = blocks.map((block) => ({
    color: block.color,
    end: block.endAt,
    id: block._id,
    start: block.startAt,
    title: block.title,
  }));

  return [...recordEvents, ...blockEvents];
}

export function boardScheduleBlockIds(blocks: readonly BoardScheduleBlock[]): ReadonlySet<string> {
  return new Set(blocks.map((block) => block._id));
}

export function isBoardExternalEvent(eventId: string | number): boolean {
  return String(eventId).startsWith(BOARD_EXTERNAL_EVENT_PREFIX);
}

export function boardExternalEventId(eventId: string | number): BoardExternalEvent["_id"] {
  return boardScheduleEventSourceId(eventId).slice(
    BOARD_EXTERNAL_EVENT_PREFIX.length,
  ) as BoardExternalEvent["_id"];
}

export function boardScheduleEventSourceId(eventId: string | number): string {
  const id = String(eventId);
  const segmentIndex = id.indexOf("|");
  return segmentIndex === -1 ? id : id.slice(0, segmentIndex);
}

export function movedScheduleRange(
  external: Pick<BoardExternalEvent, "endAt" | "startAt">,
  displayedStart: string | Date,
  newStart: string,
): Pick<BoardExternalEvent, "endAt" | "startAt"> {
  const offset =
    scheduleInstantToDate(newStart).getTime() -
    scheduleInstantToDate(scheduleInstantString(displayedStart)).getTime();
  return {
    endAt: dateToScheduleInstant(
      new Date(scheduleInstantToDate(external.endAt).getTime() + offset),
    ),
    startAt: dateToScheduleInstant(
      new Date(scheduleInstantToDate(external.startAt).getTime() + offset),
    ),
  };
}

export function toExternalScheduleEvents(
  externals: readonly BoardExternalEvent[],
): ScheduleEventData[] {
  return externals.map((external) => ({
    color:
      googleCalendarEventColor(external.colorId) ?? external.color ?? BOARD_EXTERNAL_EVENT_COLOR,
    end: external.endAt,
    id: `${BOARD_EXTERNAL_EVENT_PREFIX}${external._id}`,
    start: external.startAt,
    title: external.title,
    variant: "light",
  }));
}

export function boardExternalEventIds(
  externals: readonly BoardExternalEvent[],
): ReadonlySet<string> {
  return new Set(externals.map((external) => `${BOARD_EXTERNAL_EVENT_PREFIX}${external._id}`));
}
