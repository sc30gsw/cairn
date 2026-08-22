import { useMutation } from "convex/react";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { patchDayRow, reorderDayRows, setDayRowStatus } from "~/lib/optimistic-day-rows";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useConfirmRow() {
  return useConvexMutation(api.mutations.rows.confirm.confirm);
}

export function useSkipRow() {
  return useConvexMutation(api.mutations.rows.skip.skip);
}

export function useUnskipRow() {
  return useConvexMutation(api.mutations.rows.unskip.unskip);
}

export function useAddRow() {
  return useConvexMutation(api.mutations.rows.add.add);
}

export function useRemoveRow() {
  return useConvexMutation(api.mutations.rows.remove.remove);
}

export function useCopyYesterdayConfirmed() {
  return useConvexMutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed);
}

export function useSwitchPreset() {
  return useConvexMutation(api.mutations.rows.switchPreset.switchPreset);
}

export function useSetDayCondition() {
  return useConvexMutation(api.mutations.days.setCondition.setCondition);
}

export function useSetDayMemo() {
  return useConvexMutation(api.mutations.days.setMemo.setMemo);
}

export function useRemoveDay() {
  return useConvexMutation(api.mutations.trash.removeDay.removeDay);
}

export function useOptimisticSkipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.skip.skip).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "スキップ",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticUnskipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.unskip.unskip).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticUnconfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.unconfirm.unconfirm).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticStartRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.start.start).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "進行中",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticPauseRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.pause.pause).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticReopenRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.reopen.reopen).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "進行中",
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticApplyRowOrder(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.applyOrder.applyOrder).withOptimisticUpdate(
    (localStore, args) => {
      reorderDayRows(localStore, {
        dateJst,
        orderedRowIds: args.orderedRowIds,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticConfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useMutation(api.mutations.rows.confirm.confirm).withOptimisticUpdate(
    (localStore, args) => {
      patchDayRow(localStore, {
        dateJst,
        patch: { content: args.content, minutes: args.minutes, status: "確定" },
        rowId: args.rowId,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}
