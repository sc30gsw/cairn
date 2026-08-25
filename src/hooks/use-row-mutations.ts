import type { DateJst } from "~domain/jst";
import { measuredMs } from "~domain/rowTimer";

import { api } from "~/../convex/_generated/api";
import { getDayRow, patchDayRow, reorderDayRows, setDayRowStatus } from "~/lib/optimistic-day-rows";
import { serverNowMs } from "~/lib/server-clock";
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
  const mutateAsync = useConvexMutation(api.mutations.rows.skip.skip).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "スキップ",
        timer: null,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticUnskipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.unskip.unskip).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        timer: null,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticUnconfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.unconfirm.unconfirm,
  ).withOptimisticUpdate((localStore, args) => {
    setDayRowStatus(localStore, {
      dateJst,
      rowId: args.rowId,
      status: "未着手",
      timer: null,
      todayJst,
    });
  });
  return { mutateAsync };
}

export function useOptimisticStartRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.start.start).withOptimisticUpdate(
    (localStore, args) => {
      //? 着手はそのまま計測開始(T1)。サーバの startedAt が届くまで端末の補正時計で走らせる。
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "進行中",
        timer: { accumulatedMs: 0, autoStoppedAt: null, startedAt: serverNowMs() },
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticPauseRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.pause.pause).withOptimisticUpdate(
    (localStore, args) => {
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "未着手",
        timer: null,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticReopenRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.reopen.reopen).withOptimisticUpdate(
    (localStore, args) => {
      const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
      //? 確定分数から計測を続ける(T9)。目安分数ではなく実績を引き継ぐ非対称は意図的。
      setDayRowStatus(localStore, {
        dateJst,
        rowId: args.rowId,
        status: "進行中",
        timer: {
          accumulatedMs: (row?.minutes ?? 0) * 60_000,
          autoStoppedAt: null,
          startedAt: serverNowMs(),
        },
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticApplyRowOrder(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.applyOrder.applyOrder,
  ).withOptimisticUpdate((localStore, args) => {
    reorderDayRows(localStore, {
      dateJst,
      orderedRowIds: args.orderedRowIds,
      todayJst,
    });
  });
  return { mutateAsync };
}

export function useOptimisticConfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.confirm.confirm).withOptimisticUpdate(
    (localStore, args) => {
      patchDayRow(localStore, {
        dateJst,
        patch: { content: args.content, minutes: args.minutes, status: "確定", timer: null },
        rowId: args.rowId,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticStopRowTimer(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.stopTimer.stopTimer,
  ).withOptimisticUpdate((localStore, args) => {
    const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
    if (row !== undefined) {
      patchDayRow(localStore, {
        dateJst,
        //? 走っていた区間を端末側でも畳んで時計を止める。真値はサーバの戻り値で上書きされる。
        patch: {
          timer: {
            accumulatedMs: measuredMs(row.timer, serverNowMs()),
            autoStoppedAt: row.timer?.autoStoppedAt ?? null,
            startedAt: null,
          },
        },
        rowId: args.rowId,
        todayJst,
      });
    }
    //? ヘッダのインジケータは「いま計測中の1件」だけを見ているので、同時に消す。
    if (localStore.getQuery(api.queries.rows.runningTimer.runningTimer, {})?._id === args.rowId) {
      localStore.setQuery(api.queries.rows.runningTimer.runningTimer, {}, null);
    }
  });
  return { mutateAsync };
}

export function useOptimisticResumeRowTimer(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.resumeTimer.resumeTimer,
  ).withOptimisticUpdate((localStore, args) => {
    const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
    if (row === undefined) {
      return;
    }
    patchDayRow(localStore, {
      dateJst,
      patch: {
        timer: {
          accumulatedMs: row.timer?.accumulatedMs ?? 0,
          autoStoppedAt: null,
          startedAt: serverNowMs(),
        },
      },
      rowId: args.rowId,
      todayJst,
    });
  });
  return { mutateAsync };
}

//* どの画面にいても計測中を止められるインジケータ用(docs/specs/study-timer.md §13.2)。
//? 日ページのキャッシュを持たない画面から呼ばれるので、行の楽観更新はしない。
export function useStopRunningTimer() {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.stopTimer.stopTimer,
  ).withOptimisticUpdate((localStore, args) => {
    if (localStore.getQuery(api.queries.rows.runningTimer.runningTimer, {})?._id === args.rowId) {
      localStore.setQuery(api.queries.rows.runningTimer.runningTimer, {}, null);
    }
  });
  return { mutateAsync };
}
