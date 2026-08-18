import * as v from "valibot";

const PresetLineSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0)),
});

export const CreatePresetSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekday: v.pipe(
    v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(6))),
    v.check((value) => value !== null, "曜日を選んでください"),
  ),
});

const PresetMetaSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekday: v.pipe(v.number(), v.minValue(0), v.maxValue(6)),
});

export const PresetSchema = v.object({
  lines: v.array(PresetLineSchema),
  ...PresetMetaSchema.entries,
});

export type PresetLineInput = v.InferOutput<typeof PresetLineSchema>;
