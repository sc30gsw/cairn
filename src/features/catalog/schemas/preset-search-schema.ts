import * as v from "valibot";

const WeekdayFromSearch = v.pipe(
  v.union([v.number(), v.pipe(v.string(), v.nonEmpty("曜日は 0〜6 の整数です"))]),
  v.transform((value) => (typeof value === "number" ? value : Number(value))),
  v.integer("曜日は 0〜6 の整数です"),
  v.minValue(0, "曜日は 0〜6 です"),
  v.maxValue(6, "曜日は 0〜6 です"),
);

export const PresetSearchSchema = v.object({
  weekday: v.optional(WeekdayFromSearch),
});

export type PresetSearch = v.InferOutput<typeof PresetSearchSchema>;
