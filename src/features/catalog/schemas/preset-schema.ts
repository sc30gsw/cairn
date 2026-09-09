import * as v from "valibot";

import { WeekdayFromSelectSchema } from "~/features/catalog/schemas/weekday-schema";

const WEEKDAY_REQUIRED_MESSAGE = "曜日を1つ以上選んでください";

const PresetWeekdaysSchema = v.pipe(
  v.array(WeekdayFromSelectSchema),
  v.minLength(1, WEEKDAY_REQUIRED_MESSAGE),
  v.check((weekdays) => new Set(weekdays).size === weekdays.length, "同じ曜日を重複して選べません"),
);

const PresetLineSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0)),
});

export const CreatePresetSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekdays: PresetWeekdaysSchema,
});

const PresetMetaSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekdays: PresetWeekdaysSchema,
});

export const PresetSchema = v.object({
  lines: v.array(PresetLineSchema),
  ...PresetMetaSchema.entries,
});

export type PresetLineInput = v.InferOutput<typeof PresetLineSchema>;
