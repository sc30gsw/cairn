import * as v from "valibot";
import { MINUTES_MIN_MESSAGE } from "~domain/domain";

export const AdhocRowSchema = v.object({
  content: v.string(),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0, MINUTES_MIN_MESSAGE)),
});
