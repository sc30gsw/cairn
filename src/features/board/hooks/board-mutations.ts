import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import {
  patchBoardDayRow,
  patchBoardScheduleBlocks,
  reorderBoardDayRows,
  setBoardDayRowStatus,
} from "~/features/board/lib/optimistic-board-day";

export type BoardApplyRowOrderInput = FunctionArgs<typeof api.mutations.rows.applyOrder.applyOrder>;
export type BoardConfirmRowInput = FunctionArgs<typeof api.mutations.rows.confirm.confirm>;
export type BoardSkipRowInput = FunctionArgs<typeof api.mutations.rows.skip.skip>;
export type BoardUnskipRowInput = FunctionArgs<typeof api.mutations.rows.unskip.unskip>;
export type BoardScheduleCreateInput = FunctionArgs<
  typeof api.mutations.boardSchedule.create.create
>;
export type BoardScheduleUpdateInput = FunctionArgs<
  typeof api.mutations.boardSchedule.update.update
>;
export type BoardScheduleRemoveInput = FunctionArgs<
  typeof api.mutations.boardSchedule.remove.remove
>;
export type BoardScheduleMoveInput = FunctionArgs<typeof api.mutations.boardSchedule.move.move>;

export function useBoardSkipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.skip.skip).withOptimisticUpdate(
    (localStore, args) => {
      setBoardDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "スキップ",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useBoardUnskipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.unskip.unskip).withOptimisticUpdate(
    (localStore, args) => {
      setBoardDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useBoardApplyRowOrder(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.applyOrder.applyOrder).withOptimisticUpdate(
    (localStore, args) => {
      reorderBoardDayRows(localStore, {
        dateJst,
        orderedRowIds: args.orderedRowIds,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useBoardConfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.confirm.confirm).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardDayRow(localStore, {
        dateJst,
        patch: { content: args.content, minutes: args.minutes, status: "確定" },
        rowId: args.rowId,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleCreate(anchorDateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.create.create).withOptimisticUpdate(
    (localStore, args) => {
      const day = localStore.getQuery(api.queries.days.get.get, {
        dateJst: todayJst,
        todayJst,
      });
      const row = day?.rows.find((entry) => entry._id === args.rowId);
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
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

export function useBoardScheduleUpdate(anchorDateJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.update.update).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        updater: (blocks) =>
          blocks.map((block) =>
            block._id === args.blockId
              ? {
                  ...block,
                  color: args.color ?? block.color,
                  endAt: args.endAt,
                  startAt: args.startAt,
                }
              : block,
          ),
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleRemove(anchorDateJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.remove.remove).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
        updater: (blocks) => blocks.filter((block) => block._id !== args.blockId),
      });
    },
  );
  return { mutateAsync };
}

export function useBoardScheduleMove(anchorDateJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.boardSchedule.move.move).withOptimisticUpdate(
    (localStore, args) => {
      patchBoardScheduleBlocks(localStore, {
        anchorDateJst,
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
