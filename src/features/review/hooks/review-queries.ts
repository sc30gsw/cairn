import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";
import { weeklyReviewRef } from "~domain/reviewRefs";

export function useWeeklyReview(weekStartJst: DateJst, todayJst: DateJst) {
  return useSuspenseQuery(convexQuery(weeklyReviewRef, { todayJst, weekStartJst }));
}
