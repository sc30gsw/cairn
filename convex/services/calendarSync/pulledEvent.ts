import { meetingUrlOf, type GoogleEvent } from "../../lib/googleCalendar";
import { isDateJst } from "../../lib/jst";
import type { PulledEvent } from "../../lib/validators";
import {
  allDayRange,
  msToScheduleInstant,
  scheduleInstantToMs,
  rfc3339ToScheduleInstant,
} from "./instant";

const UNTITLED_EVENT_TITLE = "（タイトルなし）";

const MIN_TIMED_LENGTH_MS = 60_000;

export function toPulledEvent(calendarId: string, event: GoogleEvent): PulledEvent | null {
  if (event.status === "cancelled") {
    return {
      calendarId,
      googleEventId: event.id,
      kind: "delete",
      ...(event.updated === undefined ? {} : { updated: event.updated }),
    };
  }
  const start = event.start;
  if (start === undefined) {
    return null;
  }
  const title =
    event.summary === undefined || event.summary === "" ? UNTITLED_EVENT_TITLE : event.summary;
  const updated = event.updated ?? "";
  const meetingUrl = meetingUrlOf(event);
  if (start.date !== undefined) {
    if (!isDateJst(start.date)) {
      return null;
    }
    const range = allDayRange(start.date, event.end?.date);
    return {
      allDay: true,
      calendarId,
      endAt: range.endAt,
      googleEventId: event.id,
      kind: "upsert",
      ...(event.colorId === undefined ? {} : { colorId: event.colorId }),
      ...(meetingUrl === undefined ? {} : { meetingUrl }),
      startAt: range.startAt,
      title,
      updated,
    };
  }
  if (start.dateTime === undefined) {
    return null;
  }
  const startAt = rfc3339ToScheduleInstant(start.dateTime);
  if (startAt === null) {
    return null;
  }
  const endCandidate =
    event.end?.dateTime === undefined ? null : rfc3339ToScheduleInstant(event.end.dateTime);
  const startMs = scheduleInstantToMs(startAt);
  const endAt =
    endCandidate === null || scheduleInstantToMs(endCandidate) <= startMs
      ? msToScheduleInstant(startMs + MIN_TIMED_LENGTH_MS)
      : endCandidate;
  return {
    allDay: false,
    calendarId,
    endAt,
    googleEventId: event.id,
    kind: "upsert",
    ...(event.colorId === undefined ? {} : { colorId: event.colorId }),
    ...(meetingUrl === undefined ? {} : { meetingUrl }),
    startAt,
    title,
    updated,
  };
}
