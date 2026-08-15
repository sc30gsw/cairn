import * as v from "valibot";

export const PresetLineSchema = v.object({
  content: v.string(),
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

export const PresetSchema = v.object({
  lines: v.array(PresetLineSchema),
  name: v.pipe(v.string(), v.minLength(1, "名前は必須です")),
  weekday: v.pipe(v.number(), v.minValue(0), v.maxValue(6)),
});
