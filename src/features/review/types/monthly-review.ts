import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MonthlyReview = FunctionReturnType<
  typeof api.queries.review.monthlyReview.monthlyReview
>;
export type MonthlyCategoryBreakdown = MonthlyReview["byCategory"][number];
