import type { FunctionReturnType } from "convex/server";
import type { DateJst } from "~domain/jst";
import { keptRowsAfterSwitch } from "~domain/preset";
import { measuredMs, timerMinutes } from "~domain/rowTimer";

import { api } from "~/../convex/_generated/api";
import {
  getDayRow,
  patchDayRow,
  removeDayRow,
  reorderDayRows,
  setDayRowStatus,
  withDerivedDayValues,
} from "~/lib/optimistic-day-rows";
import { optimisticId } from "~/lib/optimistic-id";
import { serverNowMs } from "~/lib/server-clock";
import { useConvexMutation } from "~/lib/use-convex-mutation";

type DayPage = FunctionReturnType<typeof api.queries.days.get.get>;
type DayRow = DayPage["rows"][number];
type ItemList = FunctionReturnType<typeof api.queries.items.list.list>;
type CategoryList = FunctionReturnType<typeof api.queries.categories.list.list>;
type PresetList = FunctionReturnType<typeof api.queries.presets.list.list>;

export function useAddRow(dateJst: DateJst, todayJst: DateJst) {
  const mutation = useConvexMutation(api.mutations.rows.add.add);
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current: DayPage | undefined = localStore.getQuery(api.queries.days.get.get, {
      dateJst,
      todayJst,
    });
    const items: ItemList | undefined = localStore.getQuery(api.queries.items.list.list, {});
    const categories: CategoryList | undefined = localStore.getQuery(
      api.queries.categories.list.list,
      {},
    );
    const item = items?.find((entry: ItemList[number]) => entry._id === args.itemId);
    const category = categories?.find(
      (entry: CategoryList[number]) => entry._id === item?.categoryId,
    );
    if (
      current === undefined ||
      current.day === null ||
      item === undefined ||
      category === undefined
    ) {
      return;
    }
    const sortOrder = current.rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
    const row = {
      _id: optimisticId("rows"),
      category: category.name,
      categorySortOrder: category.sortOrder,
      content: args.content,
      itemId: args.itemId,
      itemName: item.name,
      minutes: args.minutes,
      review: null,
      sortOrder,
      status: "未着手",
      timer: null,
    } satisfies DayRow;
    localStore.setQuery(
      api.queries.days.get.get,
      { dateJst, todayJst },
      withDerivedDayValues(current, [...current.rows, row]),
    );
  });
}

export function useRemoveRow(dateJst: DateJst, todayJst: DateJst) {
  return useConvexMutation(api.mutations.rows.remove.remove).withOptimisticUpdate(
    (localStore, args) => {
      removeDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
    },
  );
}

export function useCopyYesterdayConfirmed(dateJst?: DateJst, todayJst?: DateJst) {
  const mutation = useConvexMutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
  );
  if (dateJst === undefined || todayJst === undefined) {
    return mutation;
  }
  return mutation.withOptimisticUpdate((localStore) => {
    const current = localStore.getQuery(api.queries.days.get.get, { dateJst, todayJst });
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.days.get.get,
      { dateJst, todayJst },
      {
        ...current,
        canCopyYesterday: false,
      },
    );
  });
}

export function useSwitchPreset(dateJst?: DateJst, todayJst?: DateJst) {
  const mutation = useConvexMutation(api.mutations.rows.switchPreset.switchPreset);
  if (dateJst === undefined || todayJst === undefined) {
    return mutation;
  }
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current: DayPage | undefined = localStore.getQuery(api.queries.days.get.get, {
      dateJst,
      todayJst,
    });
    const presets: PresetList | undefined = localStore.getQuery(api.queries.presets.list.list, {});
    const preset = presets?.find((entry: PresetList[number]) => entry._id === args.presetId);
    const items: ItemList | undefined = localStore.getQuery(api.queries.items.list.list, {});
    const categories: CategoryList | undefined = localStore.getQuery(
      api.queries.categories.list.list,
      {},
    );
    if (
      current === undefined ||
      current.day === null ||
      preset === undefined ||
      items === undefined ||
      categories === undefined
    ) {
      return;
    }
    const kept = keptRowsAfterSwitch(current.rows);
    const startOrder = kept.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
    const rows = preset.lines.flatMap(
      (line: PresetList[number]["lines"][number], index: number) => {
        const item = items.find((entry: ItemList[number]) => entry._id === line.itemId);
        const category = categories.find(
          (entry: CategoryList[number]) => entry._id === item?.categoryId,
        );
        if (item === undefined || category === undefined) {
          return [];
        }
        return [
          {
            _id: optimisticId("rows"),
            category: category.name,
            categorySortOrder: category.sortOrder,
            content: line.content,
            itemId: item._id,
            itemName: item.name,
            minutes: line.minutes,
            review: null,
            sortOrder: startOrder + index,
            status: "未着手",
            timer: null,
          } satisfies DayRow,
        ];
      },
    );
    localStore.setQuery(
      api.queries.days.get.get,
      { dateJst, todayJst },
      withDerivedDayValues(current, [...kept, ...rows]),
    );
  });
}

export function useOptimisticSetDayCondition(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.days.setCondition.setCondition,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.days.get.get, { dateJst, todayJst });
    if (current?.day === null || current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.days.get.get,
      { dateJst, todayJst },
      {
        ...current,
        day: { ...current.day, condition: args.condition },
      },
    );
  });
  return { mutateAsync };
}

export function useOptimisticSetDayMemo(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.days.setMemo.setMemo).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.queries.days.get.get, { dateJst, todayJst });
      if (current?.day === null || current === undefined) {
        return;
      }
      localStore.setQuery(
        api.queries.days.get.get,
        { dateJst, todayJst },
        {
          ...current,
          day: { ...current.day, memo: args.memo.trim() === "" ? null : args.memo },
        },
      );
    },
  );
  return { mutateAsync };
}

export function useRemoveDay(dateJst: DateJst, todayJst: DateJst) {
  return useConvexMutation(api.mutations.trash.removeDay.removeDay).withOptimisticUpdate(
    (localStore) => {
      const current = localStore.getQuery(api.queries.days.get.get, { dateJst, todayJst });
      if (current === undefined || current.day === null) {
        return;
      }
      localStore.setQuery(
        api.queries.days.get.get,
        { dateJst, todayJst },
        {
          ...current,
          day: null,
          kind: dateJst === todayJst ? "todayEmpty" : "rest",
          rows: [],
          shareMarkdown: "",
          volumeMinutes: 0,
        },
      );
    },
  );
}

export function useOptimisticFlagReview(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.reviews.flag.flag).withOptimisticUpdate(
    (localStore, args) => {
      if (args.dueJst === undefined) {
        return;
      }
      const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
      if (row === undefined) {
        return;
      }
      patchDayRow(localStore, {
        dateJst,
        patch: { review: { dueJst: args.dueJst, kind: "source", stage: 0 } },
        rowId: args.rowId,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticUnflagReview(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.reviews.unflag.unflag).withOptimisticUpdate(
    (localStore, args) => {
      const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
      if (row === undefined) {
        return;
      }
      patchDayRow(localStore, {
        dateJst,
        patch: { review: null },
        rowId: args.rowId,
        todayJst,
      });
    },
  );
  return { mutateAsync };
}

export function useOptimisticSkipRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.skip.skip).withOptimisticUpdate(
    (localStore, args) => {
      const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
      if (row === undefined) {
        return;
      }
      patchDayRow(localStore, {
        dateJst,
        patch: {
          review: row.review?.kind === "review" ? null : row.review,
          status: "スキップ",
          timer: null,
        },
        rowId: args.rowId,
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

export function useOptimisticUnstartRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.unstart.unstart).withOptimisticUpdate(
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

export function useOptimisticMoveAndApplyRowOrder(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(
    api.mutations.rows.moveAndApplyOrder.moveAndApplyOrder,
  ).withOptimisticUpdate((localStore, args) => {
    const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
    if (row === undefined) {
      return;
    }

    switch (args.move.kind) {
      case "confirm":
        patchDayRow(localStore, {
          dateJst,
          patch: {
            content: args.move.content,
            minutes: args.move.minutes ?? timerMinutes(measuredMs(row.timer, serverNowMs())),
            review: row.review?.kind === "review" ? null : row.review,
            status: "確定",
            timer: null,
          },
          rowId: args.rowId,
          todayJst,
        });
        break;
      case "reopen":
        setDayRowStatus(localStore, {
          dateJst,
          rowId: args.rowId,
          status: "進行中",
          timer: {
            accumulatedMs: row.minutes * 60_000,
            autoStoppedAt: null,
            startedAt: serverNowMs(),
          },
          todayJst,
        });
        break;
      case "skip":
        patchDayRow(localStore, {
          dateJst,
          patch: {
            review: row.review?.kind === "review" ? null : row.review,
            status: "スキップ",
            timer: null,
          },
          rowId: args.rowId,
          todayJst,
        });
        break;
      case "start":
        setDayRowStatus(localStore, {
          dateJst,
          rowId: args.rowId,
          status: "進行中",
          timer: { accumulatedMs: 0, autoStoppedAt: null, startedAt: serverNowMs() },
          todayJst,
        });
        break;
      case "unconfirm":
      case "unskip":
      case "unstart":
        setDayRowStatus(localStore, {
          dateJst,
          rowId: args.rowId,
          status: "未着手",
          timer: null,
          todayJst,
        });
        break;
    }
    reorderDayRows(localStore, { dateJst, orderedRowIds: args.orderedRowIds, todayJst });
  });
  return { mutateAsync };
}

export function useOptimisticConfirmRow(dateJst: DateJst, todayJst: DateJst) {
  const mutateAsync = useConvexMutation(api.mutations.rows.confirm.confirm).withOptimisticUpdate(
    (localStore, args) => {
      const row = getDayRow(localStore, { dateJst, rowId: args.rowId, todayJst });
      if (row === undefined) {
        return;
      }
      patchDayRow(localStore, {
        dateJst,
        patch: {
          content: args.content,
          minutes: args.minutes,
          review: row.review?.kind === "review" ? null : row.review,
          status: "確定",
          timer: null,
        },
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
