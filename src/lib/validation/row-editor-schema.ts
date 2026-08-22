import * as v from "valibot";
import { MINUTES_MIN_MESSAGE } from "~domain/domain";

export const RowEditorSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
  minutes: v.pipe(v.number(), v.minValue(0, MINUTES_MIN_MESSAGE)),
});
