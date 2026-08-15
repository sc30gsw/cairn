import * as v from "valibot";

/** 日画面の URL search。preset は曜日デフォルト以外を選んだときだけ付く。 */
export const DaySearchSchema = v.object({
  preset: v.optional(v.string()),
});

export type DaySearch = v.InferOutput<typeof DaySearchSchema>;

export const daySearchDefaults = {
  preset: undefined,
} as const satisfies DaySearch;
