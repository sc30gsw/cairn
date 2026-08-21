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

export const BoardScheduleEventSchema = v.object({
  blockId: v.optional(v.string()),
  color: BoardScheduleColorSchema,
  end: v.date(),
  start: v.date(),
  title: v.pipe(v.string(), v.trim(), v.nonEmpty("タイトルを入力してください")),
});

export type BoardScheduleEventInput = v.InferInput<typeof BoardScheduleEventSchema>;
export type BoardScheduleEventOutput = v.InferOutput<typeof BoardScheduleEventSchema>;
