import * as v from "valibot";

export const AdhocRowSchema = v.object({
  content: v.string(),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0, "分数は0以上です")),
});
