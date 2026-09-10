import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { patchBoardScheduleBlocks } from "~/features/board/lib/optimistic-board-schedule";
import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";
export {
  useOptimisticApplyRowOrder as useBoardApplyRowOrder,
  useOptimisticConfirmRow as useBoardConfirmRow,
  useOptimisticMoveAndApplyRowOrder as useBoardMoveAndApplyRowOrder,
  useOptimisticReopenRow as useBoardReopenRow,
  useOptimisticResumeRowTimer as useBoardResumeRowTimer,
  useOptimisticSkipRow as useBoardSkipRow,
  useOptimisticStartRow as useBoardStartRow,
  useOptimisticStopRowTimer as useBoardStopRowTimer,
  useOptimisticUnconfirmRow as useBoardUnconfirmRow,
  useOptimisticUnskipRow as useBoardUnskipRow,
  useOptimisticUnstartRow as useBoardUnstartRow,
} from "~/hooks/use-row-mutations";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useBoardScheduleCreate() {
  const mutateAsync = useConvexMutation(api.mutations.boardSchedule.create.create);
  return { mutateAsync };
}

export function useBoardScheduleUpdate(
  anchorDateJst: DateJst,
  todayJst: DateJst,
  view: BoardScheduleView,
) {
  const mutateAsync = useConvexMutation(
    api.mutations.boardSchedule.update.update,
  ).withOptimisticUpdate((localStore, args) => {
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
  });
  return { mutateAsync };
}

export function useBoardScheduleRemove(anchorDateJst: DateJst, view: BoardScheduleView) {
  const mutateAsync = useConvexMutation(
    api.mutations.boardSchedule.remove.remove,
  ).withOptimisticUpdate((localStore, args) => {
    patchBoardScheduleBlocks(localStore, {
      anchorDateJst,
      view,
      updater: (blocks) => blocks.filter((block) => block._id !== args.blockId),
    });
  });
  return { mutateAsync };
}

export function useBoardScheduleMove(anchorDateJst: DateJst, view: BoardScheduleView) {
  const mutateAsync = useConvexMutation(api.mutations.boardSchedule.move.move).withOptimisticUpdate(
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

export function useBoardExternalMove() {
  const mutateAsync = useConvexMutation(api.mutations.calendarSync.moveExternal.moveExternal);
  return { mutateAsync };
}

export function useBoardExternalRemove() {
  const mutateAsync = useConvexMutation(api.mutations.calendarSync.removeExternal.removeExternal);
  return { mutateAsync };
}
