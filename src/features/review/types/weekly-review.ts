import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type WeeklyReview = FunctionReturnType<typeof api.queries.review.weeklyReview.weeklyReview>;
export type WeeklyReviewDay = WeeklyReview["byDay"][number];
export type WeeklyReviewTarget = NonNullable<WeeklyReview["targets"]>[number];
