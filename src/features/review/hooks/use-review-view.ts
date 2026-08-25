import { getRouteApi } from "@tanstack/react-router";
import { isFutureDateJst, mondayOfWeek, type DateJst } from "~domain/jst";

import type { ReviewSearch, ReviewTab } from "~/features/review/schemas/review-search-schema";
import { useTodayJst } from "~/hooks/use-today-jst";

/** `/review` 専用 — ReviewPage 配下からのみ import すること */
const reviewRoute = getRouteApi("/review");

function yearMonthFromDateJst(dateJst: string): string {
  return dateJst.slice(0, 7);
}

export function deriveReviewMonth(search: ReviewSearch, today: DateJst): string {
  const todayYearMonth = yearMonthFromDateJst(today);
  const requestedMonth = search.month ?? todayYearMonth;
  //? 未来月への遷移は禁止(history の deriveHistoryView と同じクランプ)。
  return requestedMonth > todayYearMonth ? todayYearMonth : requestedMonth;
}

//* 週アンカーは必ず月曜。未来週は今週にクランプする。
//? 月曜正規化を導出側でも行うのは、URL に火曜を直打ちされても画面と query 引数が食い違わないため。
//? サーバも requireWeekStartJst で正規化するので二重に守られる。
export function deriveReviewWeek(search: ReviewSearch, today: DateJst): DateJst {
  const requested = mondayOfWeek(search.week ?? today);
  return isFutureDateJst(requested, today) ? mondayOfWeek(today) : requested;
}

/**
 * `/review` ルート上でのみ使う。search の read/write と derive を集約する。
 */
export function useReviewView() {
  const search = reviewRoute.useSearch();
  const navigate = reviewRoute.useNavigate();
  const today = useTodayJst();
  const currentWeekStart = mondayOfWeek(today);
  const weekStart = deriveReviewWeek(search, today);
  const yearMonth = deriveReviewMonth(search, today);
  const tab: ReviewTab = search.tab ?? "weekly";

  return {
    currentWeekStart,
    setMonth: (nextYearMonth: string) => {
      void navigate({
        search: (current) => ({
          ...current,
          month: nextYearMonth === yearMonthFromDateJst(today) ? undefined : nextYearMonth,
        }),
      });
    },
    setTab: (nextTab: ReviewTab) => {
      void navigate({
        search: (current) => ({ ...current, tab: nextTab === "weekly" ? undefined : nextTab }),
      });
    },
    setWeek: (nextWeekStart: DateJst) => {
      void navigate({
        search: (current) => ({
          ...current,
          week: nextWeekStart === currentWeekStart ? undefined : nextWeekStart,
        }),
      });
    },
    tab,
    today,
    weekStart,
    yearMonth,
  };
}
