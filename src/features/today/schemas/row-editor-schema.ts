import * as v from "valibot";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

export const RowEditorSchema = v.object({
  content: v.string(),
  minutes: v.pipe(v.number(), v.minValue(0, "分数は0以上です")),
});

export const ConfirmRowSchema = v.object({
  content: ConcreteActionSchema,
  minutes: v.pipe(v.number(), v.minValue(0, "分数は0以上です")),
});
