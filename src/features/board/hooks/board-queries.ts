import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

export function useBoardScheduleBlocks(anchorDateJst: DateJst) {
  return useSuspenseQuery(
    convexQuery(api.queries.boardSchedule.listForWeek.listForWeek, { anchorDateJst }),
  );
}
