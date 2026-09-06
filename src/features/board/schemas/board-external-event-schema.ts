import * as v from "valibot";
import { GOOGLE_CALENDAR_EVENT_COLORS } from "~domain/googleCalendarColors";

export const BoardExternalEventSchema = v.pipe(
  v.object({
    title: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "件名を入力してください"),
      v.maxLength(1000, "件名は1000文字以内で入力してください"),
    ),
    start: v.date(),
    end: v.date(),
    colorId: v.picklist(GOOGLE_CALENDAR_EVENT_COLORS.map((color) => color.id)),
  }),
  v.forward(
    v.partialCheck(
      [["start"], ["end"]],
      (value) => value.end.getTime() > value.start.getTime(),
      "終了は開始より後にしてください",
    ),
    ["end"],
  ),
);

export type BoardExternalEventInput = v.InferInput<typeof BoardExternalEventSchema>;
export type BoardExternalEventOutput = v.InferOutput<typeof BoardExternalEventSchema>;
