import * as v from "valibot";

import { AnalysisScopeSchema } from "~/features/history/schemas/analysis-scope-schema";
import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const HistoryTabSchema = v.picklist(["month", "week", "analysis"]);

export const HistorySearchSchema = v.object({
  date: v.optional(DateJstSchema),
  month: v.optional(YearMonthSchema),
  scope: v.optional(AnalysisScopeSchema),
  tab: v.optional(HistoryTabSchema),
  week: v.optional(DateJstSchema),
});

export type HistorySearch = v.InferOutput<typeof HistorySearchSchema>;
export type HistoryTab = v.InferOutput<typeof HistoryTabSchema>;

export const historySearchDefaults = {
  date: undefined,
  month: undefined,
  scope: "day",
  tab: "month",
  week: undefined,
} as const satisfies HistorySearch;
