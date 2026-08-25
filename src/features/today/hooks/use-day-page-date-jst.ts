import { useMatchRoute } from "@tanstack/react-router";
import type { DateJst } from "~domain/jst";

import { useTodayJst } from "~/hooks/use-today-jst";

/** 日ページ（`/` または `/days/$dateJst`）で表示中の学習日。ルート params が SSOT。 */
export function useDayPageDateJst(): DateJst {
  const matchRoute = useMatchRoute();
  const datedParams = matchRoute({ to: "/days/$dateJst" });
  const today = useTodayJst();

  if (datedParams !== false) {
    return datedParams.dateJst;
  }

  return today;
}
