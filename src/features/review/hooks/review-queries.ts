import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";
import { monthlyReviewRef, weeklyReviewRef } from "~domain/reviewRefs";

export function useWeeklyReview(weekStartJst: DateJst, todayJst: DateJst) {
  return useSuspenseQuery(convexQuery(weeklyReviewRef, { todayJst, weekStartJst }));
}

export function useMonthlyReview(yearMonth: string, todayJst: DateJst) {
  return useSuspenseQuery(convexQuery(monthlyReviewRef, { todayJst, yearMonth }));
}
