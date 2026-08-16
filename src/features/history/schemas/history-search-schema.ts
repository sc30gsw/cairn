import * as v from "valibot";

import { AnalysisScopeSchema } from "~/features/history/schemas/analysis-scope-schema";

export const HistoryTabSchema = v.picklist(["month", "week", "analysis"]);

export const HistorySearchSchema = v.object({
  date: v.optional(v.string()),
  month: v.optional(v.string()),
  scope: v.optional(AnalysisScopeSchema),
  tab: v.optional(HistoryTabSchema),
  week: v.optional(v.string()),
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
