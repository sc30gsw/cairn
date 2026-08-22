import { useMatchRoute } from "@tanstack/react-router";
import { todayJst, type DateJst } from "~domain/jst";

/** 日ページ（`/` または `/days/$dateJst`）で表示中の学習日。ルート params が SSOT。 */
export function useDayPageDateJst(): DateJst {
  const matchRoute = useMatchRoute();
  const datedParams = matchRoute({ to: "/days/$dateJst" });

  if (datedParams !== false) {
    return datedParams.dateJst;
  }

  return todayJst();
}
