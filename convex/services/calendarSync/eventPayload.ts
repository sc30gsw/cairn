import type { Doc } from "../../_generated/dataModel";
import type { BoardScheduleColor } from "../../lib/boardScheduleColors";
import { CHECKPOINT_EVENT_PREFIX, EXAM_EVENT_PREFIX } from "../../lib/calendarSync";
import { isActiveExamGoal } from "../../lib/examGoal";
import { addDaysJst } from "../../lib/jst";
import type { GoogleEventPayload } from "../../lib/validators";
import { scheduleInstantToRfc3339 } from "./instant";

//? Google に出す予定の形を決める純関数（Q17 の決定）。本番日・期限は終日で「空き」、予定は時刻つきで「予定あり」

//? Google のイベント色（1〜11）への近似対応。Mantine の色名 → Google の colorId
export const GOOGLE_EVENT_COLOR_IDS = {
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

//? 載せるのは進行中の本番の本番日と、未達成のチェックポイントの期限だけ。それ以外は null（= Google から消す）
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

export type BlockPayloadContext = {
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

//? 「最後に送った内容」との比較に使う安定した文字列。キー順を固定する
export function payloadKey(payload: GoogleEventPayload): string {
  return JSON.stringify(payload, Object.keys(payload).toSorted());
}

//? Google 側の予定を PATCH で置き換えるときは start / end を両方送る（片方だけだと不整合で 400）
export function patchPayload(payload: GoogleEventPayload): GoogleEventPayload {
  return {
    ...payload,
    end: { date: payload.end.date, dateTime: payload.end.dateTime },
    start: { date: payload.start.date, dateTime: payload.start.dateTime },
  };
}
