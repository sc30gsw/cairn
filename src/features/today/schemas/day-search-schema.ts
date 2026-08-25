import * as v from "valibot";

//? 空文字は「未指定」として扱う("/?preset=" のような URL 直打ちで validateSearch を落とさない)
const PresetSearchValueSchema = v.pipe(
  v.string(),
  v.transform((value) => (value === "" ? undefined : value)),
);

/** 日画面の URL search。preset は曜日デフォルト以外を選んだときだけ付く。 */
export const DaySearchSchema = v.object({
  preset: v.optional(PresetSearchValueSchema),
});

export type DaySearch = v.InferOutput<typeof DaySearchSchema>;

export const daySearchDefaults = {
  preset: undefined,
} as const satisfies DaySearch;
