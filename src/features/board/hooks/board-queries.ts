import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";

export function useBoardScheduleBlocks(anchorDateJst: DateJst, view: BoardScheduleView) {
  return useSuspenseQuery(
    convexQuery(api.queries.boardSchedule.listForWeek.listForWeek, { anchorDateJst, view }),
  );
}
