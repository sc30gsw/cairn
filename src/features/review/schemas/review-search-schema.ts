import * as v from "valibot";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const ReviewTabSchema = v.picklist(["weekly", "monthly"]);

export const ReviewSearchSchema = v.object({
  month: v.optional(YearMonthSchema),
  tab: v.optional(ReviewTabSchema),
  week: v.optional(DateJstSchema),
});

export type ReviewSearch = v.InferOutput<typeof ReviewSearchSchema>;
export type ReviewTab = v.InferOutput<typeof ReviewTabSchema>;

export const reviewSearchDefaults = {
  month: undefined,
  tab: "weekly",
  week: undefined,
} as const satisfies ReviewSearch;
