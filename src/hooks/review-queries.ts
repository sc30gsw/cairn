import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

//? レビュー画面とマイページの状況ページが同じ集計を読むため、features 間の直輸入を避けて共有化(#feature-isolation)
export function useWeeklyReview(weekStartJst: DateJst, todayJst: DateJst) {
  return useSuspenseQuery(
    convexQuery(api.queries.review.weeklyReview.weeklyReview, { todayJst, weekStartJst }),
  );
}

export function useMonthlyReview(yearMonth: string, todayJst: DateJst) {
  return useSuspenseQuery(
    convexQuery(api.queries.review.monthlyReview.monthlyReview, { todayJst, yearMonth }),
  );
}
