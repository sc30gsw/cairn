import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import {
  useOptionalMonthlyReviewLiveQuery,
  useOptionalWeeklyReviewLiveQuery,
} from "~/lib/tanstack-db/collections";

export function useWeeklyReview(weekStartJst: DateJst, todayJst: DateJst) {
  const live = useOptionalWeeklyReviewLiveQuery({ todayJst, weekStartJst });
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.review.weeklyReview.weeklyReview, { todayJst, weekStartJst }),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useMonthlyReview(yearMonth: string, todayJst: DateJst) {
  const live = useOptionalMonthlyReviewLiveQuery({ todayJst, yearMonth });
  const queryResult = useSuspenseQuery(
    convexQuery(api.queries.review.monthlyReview.monthlyReview, { todayJst, yearMonth }),
  );
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}
