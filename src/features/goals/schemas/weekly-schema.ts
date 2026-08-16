import * as v from "valibot";

export const WeeklySchema = v.object({
  minutes: v.pipe(v.number(), v.minValue(0, "週間ゴールは0分以上です")),
});

export type WeeklyInput = v.InferOutput<typeof WeeklySchema>;
