import type { Doc } from "../../_generated/dataModel";
import type { BoardScheduleColor } from "../../lib/boardScheduleColors";
import { CHECKPOINT_EVENT_PREFIX, EXAM_EVENT_PREFIX } from "../../lib/calendarSync";
import { isActiveExamGoal } from "../../lib/examGoal";
import { addDaysJst } from "../../lib/jst";
import type { ExternalChange, GoogleEventPayload } from "../../lib/validators";
import { scheduleInstantToRfc3339 } from "./instant";

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
} as const satisfies Record<BoardScheduleColor, string>;

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

export function payloadKey(payload: GoogleEventPayload): string {
  return JSON.stringify(payload);
}

export function patchPayload(payload: GoogleEventPayload): GoogleEventPayload {
  return {
    ...payload,
    end: { date: payload.end.date, dateTime: payload.end.dateTime },
    start: { date: payload.start.date, dateTime: payload.start.dateTime },
  };
}

export function externalChangePayload(
  change: Extract<ExternalChange, { kind: "move" }>,
): Pick<GoogleEventPayload, "end" | "start"> {
  if (change.allDay) {
    return {
      end: { date: addDaysJst(change.endAt.slice(0, 10), 1) },
      start: { date: change.startAt.slice(0, 10) },
    };
  }
  return {
    end: { dateTime: scheduleInstantToRfc3339(change.endAt) },
    start: { dateTime: scheduleInstantToRfc3339(change.startAt) },
  };
}
