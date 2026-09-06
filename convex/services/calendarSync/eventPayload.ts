import type { Doc } from "../../_generated/dataModel";
import {
  boardScheduleGoogleColor,
  DEFAULT_BOARD_SCHEDULE_COLOR,
} from "../../lib/boardScheduleColors";
import { CHECKPOINT_EVENT_PREFIX, EXAM_EVENT_PREFIX } from "../../lib/calendarSync";
import { isActiveExamGoal } from "../../lib/examGoal";
import type { GoogleEventPatch, GoogleEventTimePatch } from "../../lib/googleCalendar";
import { addDaysJst } from "../../lib/jst";
import type { ExternalChange, GoogleEventPayload, GoogleEventTime } from "../../lib/validators";
import { scheduleInstantToRfc3339 } from "./instant";

function allDayPayload(args: {
  dateJst: string;
  description: string;
  summary: string;
}): GoogleEventPayload {
  return {
    description: args.description,
    end: { date: addDaysJst(args.dateJst, 1) },
    start: { date: args.dateJst },
    summary: args.summary,
    transparency: "transparent",
  };
}

export function goalEventPayload(
  goal: Doc<"goals">,
  parent: Doc<"goals"> | null,
): GoogleEventPayload | null {
  if (isActiveExamGoal(goal)) {
    return allDayPayload({
      dateJst: goal.examDate,
      description: `目標 ${String(goal.minScore)}〜${String(goal.maxScore)}`,
      summary: `${EXAM_EVENT_PREFIX}: ${goal.content}`,
    });
  }
  if (goal.type === "mastery" && goal.deadline !== undefined && goal.achievedAt === undefined) {
    return allDayPayload({
      dateJst: goal.deadline,
      description: parent === null ? goal.criterion : `${parent.content} / ${goal.criterion}`,
      summary: `${CHECKPOINT_EVENT_PREFIX}: ${goal.content}`,
    });
  }
  return null;
}

type BlockPayloadContext = {
  content: string;
  dayUrl: string | null;
};

export function blockEventPayload(
  block: Doc<"boardScheduleEvents">,
  context: BlockPayloadContext,
): GoogleEventPayload {
  const lines = [context.content === "" ? block.title : `${block.title} / ${context.content}`];
  if (context.dayUrl !== null) {
    lines.push(context.dayUrl);
  }
  const color = block.color ?? DEFAULT_BOARD_SCHEDULE_COLOR;
  return {
    colorId: boardScheduleGoogleColor(color).id,
    description: lines.join("\n"),
    end: { dateTime: scheduleInstantToRfc3339(block.endAt) },
    start: { dateTime: scheduleInstantToRfc3339(block.startAt) },
    summary: block.title,
    transparency: "opaque",
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function payloadKey(payload: GoogleEventPayload): string {
  return stableStringify(payload);
}

function timePatch(time: GoogleEventTime): GoogleEventTimePatch {
  return "date" in time
    ? { date: time.date, dateTime: null }
    : { date: null, dateTime: time.dateTime };
}

export function patchPayload(payload: GoogleEventPayload): GoogleEventPatch {
  return {
    ...payload,
    end: timePatch(payload.end),
    start: timePatch(payload.start),
  };
}

export function externalChangePayload(
  change: Extract<ExternalChange, { kind: "move" }>,
): Pick<GoogleEventPatch, "end" | "start"> &
  Partial<Pick<GoogleEventPatch, "summary" | "colorId">> {
  const metadata = { summary: change.title, colorId: change.colorId };
  if (change.allDay) {
    return {
      ...metadata,
      end: timePatch({ date: addDaysJst(change.endAt.slice(0, 10), 1) }),
      start: timePatch({ date: change.startAt.slice(0, 10) }),
    };
  }
  return {
    ...metadata,
    end: timePatch({ dateTime: scheduleInstantToRfc3339(change.endAt) }),
    start: timePatch({ dateTime: scheduleInstantToRfc3339(change.startAt) }),
  };
}
