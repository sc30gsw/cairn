import * as v from "valibot";
import { MINUTES_MIN_MESSAGE } from "~domain/domain";

import { ConcreteActionSchema } from "~/lib/validation/concrete-action";

export const RowEditorSchema = v.object({
  content: v.string(),
  minutes: v.pipe(v.number(), v.minValue(0, MINUTES_MIN_MESSAGE)),
});

export const ConfirmRowSchema = v.object({
  content: ConcreteActionSchema,
  minutes: v.pipe(v.number(), v.minValue(0, MINUTES_MIN_MESSAGE)),
});
