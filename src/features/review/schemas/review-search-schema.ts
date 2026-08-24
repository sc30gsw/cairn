import * as v from "valibot";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const ReviewTabSchema = v.picklist(["weekly", "monthly"]);

export const ReviewSearchSchema = v.object({
  //? month は月次タブが消費する。週次タブが消費するのは week
  month: v.optional(YearMonthSchema),
  tab: v.optional(ReviewTabSchema),
  //? 月曜でない日付が来ても導出側で月曜へ正規化する。URL 直打ちを弾かない
  week: v.optional(DateJstSchema),
});

export type ReviewSearch = v.InferOutput<typeof ReviewSearchSchema>;
export type ReviewTab = v.InferOutput<typeof ReviewTabSchema>;

export const reviewSearchDefaults = {
  month: undefined,
  tab: "weekly",
  week: undefined,
} as const satisfies ReviewSearch;
