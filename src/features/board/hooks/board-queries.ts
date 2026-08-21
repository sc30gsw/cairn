import type { DateJst } from "~domain/jst";

import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

export function useBoardDay(dateJst: DateJst, todayJst: DateJst) {
  return useOpenAndLoadDay(dateJst, todayJst);
}
