import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";

type BoardScheduleBlock = FunctionReturnType<
  typeof api.queries.boardSchedule.listForWeek.listForWeek
>[number];

export function patchBoardScheduleBlocks(
  localStore: OptimisticLocalStore,
  args: {
    anchorDateJst: DateJst;
    updater: (blocks: BoardScheduleBlock[]) => BoardScheduleBlock[];
    view: BoardScheduleView;
  },
): void {
  const queryArgs = { anchorDateJst: args.anchorDateJst, view: args.view };
  const blocks = localStore.getQuery(api.queries.boardSchedule.listForWeek.listForWeek, queryArgs);
  if (blocks === undefined) {
    return;
  }
  localStore.setQuery(
    api.queries.boardSchedule.listForWeek.listForWeek,
    queryArgs,
    args.updater(blocks),
  );
}
