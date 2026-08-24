import type { FunctionReturnType } from "convex/server";
import type { weeklyReviewRef } from "~domain/reviewRefs";

//? codegen が走ったら api.queries.review.weeklyReview.weeklyReview から派生させる(~domain/reviewRefs の注記参照)
export type WeeklyReview = FunctionReturnType<typeof weeklyReviewRef>;
export type WeeklyReviewDay = WeeklyReview["byDay"][number];
export type WeeklyReviewTarget = NonNullable<WeeklyReview["targets"]>[number];
