import * as v from "valibot";

import { AnalysisScopeSchema } from "~/features/history/schemas/analysis-scope-schema";
import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const HistoryTabSchema = v.picklist(["month", "week", "analysis"]);

//? 全文検索の期間。既定は直近12か月、全期間は明示して切り替える
const HistorySearchRangeSchema = v.picklist(["year", "all"]);

export const HistorySearchSchema = v.object({
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  q: v.optional(v.string()),
  range: v.optional(HistorySearchRangeSchema),
  scope: v.optional(AnalysisScopeSchema),
  tab: v.optional(HistoryTabSchema),
  week: v.optional(DateJstSchema),
});

export type HistorySearch = v.InferOutput<typeof HistorySearchSchema>;
export type HistoryTab = v.InferOutput<typeof HistoryTabSchema>;
export type HistorySearchRange = v.InferOutput<typeof HistorySearchRangeSchema>;

export const historySearchDefaults = {
  date: undefined,
  month: undefined,
  q: undefined,
  range: "year",
  scope: "day",
  tab: "month",
  week: undefined,
} as const satisfies HistorySearch;
