import * as v from "valibot";

export const BOARD_SCHEDULE_COLORS = [
  "blue",
  "green",
  "violet",
  "orange",
  "cyan",
  "grape",
  "red",
  "teal",
] as const;

const BoardScheduleColorSchema = v.picklist(BOARD_SCHEDULE_COLORS);

export const BoardScheduleEventSchema = v.pipe(
  v.object({
    blockId: v.optional(v.string()),
    color: BoardScheduleColorSchema,
    end: v.date(),
    start: v.date(),
    title: v.pipe(v.string(), v.trim(), v.nonEmpty("タイトルを入力してください")),
  }),
  v.forward(
    v.partialCheck(
      [["start"], ["end"]],
      (input) => input.end.getTime() > input.start.getTime(),
      "終了は開始より後にしてください",
    ),
    ["end"],
  ),
);

export type BoardScheduleEventInput = v.InferInput<typeof BoardScheduleEventSchema>;
export type BoardScheduleEventOutput = v.InferOutput<typeof BoardScheduleEventSchema>;
