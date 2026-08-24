import type { FunctionReturnType } from "convex/server";
import type { monthlyReviewRef } from "~domain/reviewRefs";

//? codegen が走ったら api.queries.review.monthlyReview.monthlyReview から派生させる(~domain/reviewRefs の注記参照)
export type MonthlyReview = FunctionReturnType<typeof monthlyReviewRef>;
export type MonthlyCategoryBreakdown = MonthlyReview["byCategory"][number];
