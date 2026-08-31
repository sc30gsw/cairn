import * as v from "valibot";

const PresetSearchValueSchema = v.pipe(
  v.string(),
  v.transform((value) => (value === "" ? undefined : value)),
);

export const DaySearchSchema = v.object({
  preset: v.optional(PresetSearchValueSchema),
});

export type DaySearch = v.InferOutput<typeof DaySearchSchema>;

export const daySearchDefaults = {
  preset: undefined,
} as const satisfies DaySearch;
