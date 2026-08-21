import * as v from "valibot";

import { WeekdaySchema } from "~/features/catalog/schemas/weekday-schema";

const PresetLineSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0)),
});

export const CreatePresetSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekday: v.nonOptional(v.optional(WeekdaySchema), "曜日を選んでください"),
});

const PresetMetaSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekday: WeekdaySchema,
});

export const PresetSchema = v.object({
  lines: v.array(PresetLineSchema),
  ...PresetMetaSchema.entries,
});

export type PresetLineInput = v.InferOutput<typeof PresetLineSchema>;
