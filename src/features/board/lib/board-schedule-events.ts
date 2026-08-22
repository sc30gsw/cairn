import type { ScheduleEventData } from "@mantine/schedule";

import { dateToScheduleInstant } from "~/features/board/lib/schedule-instant";
import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

export const BOARD_ALL_DAY_VISIBLE_LIMIT = 2;
export const BOARD_ALL_DAY_MORE_PREFIX = "board-more:";
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
    (event) => isAllDayEvent(event) && dayFromScheduleInstant(event.start) === day,
  );
}

export function withAllDayOverflow(
  events: ScheduleEventData[],
  maxVisible: number,
  moreLabel: (hiddenEventsCount: number) => string,
): {
  events: ScheduleEventData[];
  hiddenEventsByDay: ReadonlyMap<string, ScheduleEventData[]>;
} {
  const timedEvents = events.filter((event) => !isAllDayEvent(event));
  const allDayEvents = events.filter(isAllDayEvent);
  const groupedByDay = new Map<string, ScheduleEventData[]>();

  for (const event of allDayEvents) {
    const day = dayFromScheduleInstant(event.start);
    const bucket = groupedByDay.get(day);
    if (bucket === undefined) {
      groupedByDay.set(day, [event]);
      continue;
    }
    bucket.push(event);
  }

  const visibleEvents: ScheduleEventData[] = [...timedEvents];
  const hiddenEventsByDay = new Map<string, ScheduleEventData[]>();

  for (const [day, dayEvents] of groupedByDay) {
    if (dayEvents.length <= maxVisible) {
      visibleEvents.push(...dayEvents);
      continue;
    }
    visibleEvents.push(...dayEvents.slice(0, maxVisible));
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
  checkpoint: BoardMastery | null,
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

  if (checkpoint?.deadline === undefined) {
    return [...recordEvents, ...blockEvents];
  }

  return [
    ...recordEvents,
    ...blockEvents,
    {
      color: "orange",
      end: `${checkpoint.deadline}${ALL_DAY_END_SUFFIX}`,
      id: checkpoint._id,
      start: `${checkpoint.deadline}${ALL_DAY_START_SUFFIX}`,
      title: checkpoint.content,
    },
  ];
}

export function boardScheduleBlockIds(blocks: readonly BoardScheduleBlock[]): ReadonlySet<string> {
  return new Set(blocks.map((block) => block._id));
}
