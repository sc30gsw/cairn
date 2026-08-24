import { useMutation } from "convex/react";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { patchBoardScheduleBlocks } from "~/features/board/lib/optimistic-board-schedule";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
import {
  useOptimisticApplyRowOrder,
  useOptimisticConfirmRow,
  useOptimisticPauseRow,
  useOptimisticReopenRow,
  useOptimisticResumeRowTimer,
  useOptimisticSkipRow,
  useOptimisticStartRow,
  useOptimisticStopRowTimer,
  useOptimisticUnconfirmRow,
  useOptimisticUnskipRow,
} from "~/hooks/use-row-mutations";

export const useBoardSkipRow = useOptimisticSkipRow;
export const useBoardUnskipRow = useOptimisticUnskipRow;
export const useBoardUnconfirmRow = useOptimisticUnconfirmRow;
export const useBoardStartRow = useOptimisticStartRow;
export const useBoardPauseRow = useOptimisticPauseRow;
export const useBoardReopenRow = useOptimisticReopenRow;
export const useBoardApplyRowOrder = useOptimisticApplyRowOrder;
export const useBoardConfirmRow = useOptimisticConfirmRow;
export const useBoardStopRowTimer = useOptimisticStopRowTimer;
export const useBoardResumeRowTimer = useOptimisticResumeRowTimer;

export function useBoardScheduleCreate(
  anchorDateJst: DateJst,
  todayJst: DateJst,
  view: BoardScheduleView,
) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.create.create).withOptimisticUpdate(
    (localStore, args) => {
      const day = localStore.getQuery(api.queries.days.get.get, {
        dateJst: todayJst,
        todayJst,
      });
      const row = day?.rows.find((entry) => entry._id === args.rowId);
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        view,
        updater: (blocks) => [
          ...blocks,
          {
            _id: `optimistic-${crypto.randomUUID()}` as Id<"boardScheduleEvents">,
            color: args.color ?? "blue",
            endAt: args.endAt,
            rowId: args.rowId,
            startAt: args.startAt,
            title: row?.itemName ?? "",
          },
        ],
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleUpdate(
  anchorDateJst: DateJst,
  todayJst: DateJst,
  view: BoardScheduleView,
) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.update.update).withOptimisticUpdate(
    (localStore, args) => {
      const day = localStore.getQuery(api.queries.days.get.get, {
        dateJst: todayJst,
        todayJst,
      });
      const row =
        args.rowId === undefined ? undefined : day?.rows.find((entry) => entry._id === args.rowId);
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        view,
        updater: (blocks) =>
          blocks.map((block) =>
            block._id === args.blockId
              ? {
                  ...block,
                  color: args.color ?? block.color,
                  endAt: args.endAt,
                  rowId: args.rowId ?? block.rowId,
                  startAt: args.startAt,
                  title: row?.itemName ?? block.title,
                }
              : block,
          ),
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleRemove(anchorDateJst: DateJst, view: BoardScheduleView) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.remove.remove).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        view,
        updater: (blocks) => blocks.filter((block) => block._id !== args.blockId),
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleMove(anchorDateJst: DateJst, view: BoardScheduleView) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.move.move).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        view,
        updater: (blocks) =>
          blocks.map((block) =>
            block._id === args.blockId
              ? { ...block, endAt: args.endAt, startAt: args.startAt }
              : block,
          ),
      });
    },
  );
  return { mutateAsync };
}
