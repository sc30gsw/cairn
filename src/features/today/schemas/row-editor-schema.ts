import * as v from "valibot";

export const RowEditorSchema = v.object({
  content: v.string(),
  minutes: v.pipe(v.number(), v.minValue(0, "分数は0以上です")),
});
