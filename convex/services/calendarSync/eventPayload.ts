import type { Doc } from "../../_generated/dataModel";
import type { BoardScheduleColor } from "../../lib/boardScheduleColors";
import { CHECKPOINT_EVENT_PREFIX, EXAM_EVENT_PREFIX } from "../../lib/calendarSync";
import { isActiveExamGoal } from "../../lib/examGoal";
import type { GoogleEventPatch, GoogleEventTimePatch } from "../../lib/googleCalendar";
import { addDaysJst } from "../../lib/jst";
import type { ExternalChange, GoogleEventPayload, GoogleEventTime } from "../../lib/validators";
import { scheduleInstantToRfc3339 } from "./instant";

type GoogleEventColorId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11";

const GOOGLE_EVENT_COLOR_IDS = {
  blue: "9",
  cyan: "7",
  grape: "3",
  green: "10",
  indigo: "1",
  lime: "2",
  orange: "6",
  pink: "4",
  red: "11",
  teal: "7",
  violet: "3",
  yellow: "5",
} as const satisfies Record<BoardScheduleColor, GoogleEventColorId>;

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
  const color = block.color ?? "blue";
  return {
    colorId: GOOGLE_EVENT_COLOR_IDS[color],
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
): Pick<GoogleEventPatch, "end" | "start"> {
  if (change.allDay) {
    return {
      end: timePatch({ date: addDaysJst(change.endAt.slice(0, 10), 1) }),
      start: timePatch({ date: change.startAt.slice(0, 10) }),
    };
  }
  return {
    end: timePatch({ dateTime: scheduleInstantToRfc3339(change.endAt) }),
    start: timePatch({ dateTime: scheduleInstantToRfc3339(change.startAt) }),
  };
}
