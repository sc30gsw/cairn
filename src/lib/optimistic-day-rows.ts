import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import type { Status } from "~domain/domain";
import type { DateJst } from "~domain/jst";
import { measuredMs } from "~domain/rowTimer";
import { formatShareMarkdown } from "~domain/share";
import type { RowTimerDto } from "~domain/validators";
import { confirmedVolumeMinutes } from "~domain/volume";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";
import { serverNowMs } from "~/lib/server-clock";

type BoardDay = FunctionReturnType<typeof api.queries.days.get.get>;
type BoardDayRow = BoardDay["rows"][number];

type DayQueryArgs = { dateJst: DateJst; todayJst: DateJst };

function dayQueryArgs(args: DayQueryArgs): DayQueryArgs {
  return { dateJst: args.dateJst, todayJst: args.todayJst };
}

function withDerivedDayValues(day: BoardDay, rows: BoardDay["rows"]): BoardDay {
  return {
    ...day,
    rows,
    shareMarkdown: formatShareMarkdown(rows),
    volumeMinutes: confirmedVolumeMinutes(rows),
  };
}

function syncRunningTimer(
  localStore: OptimisticLocalStore,
  args: { dateJst: DateJst; row: BoardDayRow; timer: RowTimerDto | null; todayJst: DateJst },
): void {
  const runningTimer = localStore.getQuery(api.queries.rows.runningTimer.runningTimer, {});
  if (args.timer !== undefined && args.timer !== null && args.timer.startedAt !== null) {
    if (runningTimer !== null && runningTimer !== undefined && runningTimer._id !== args.row._id) {
      const previousDayArgs = {
        dateJst: runningTimer.dateJst,
        todayJst: args.todayJst,
      };
      const previousDay = localStore.getQuery(api.queries.days.get.get, previousDayArgs);
      const previousRow = previousDay?.rows.find((row) => row._id === runningTimer._id);
      if (previousDay !== undefined && previousRow !== undefined) {
        localStore.setQuery(
          api.queries.days.get.get,
          previousDayArgs,
          withDerivedDayValues(
            previousDay,
            previousDay.rows.map((row) =>
              row._id === previousRow._id
                ? {
                    ...row,
                    timer: {
                      accumulatedMs: measuredMs(row.timer, serverNowMs()),
                      autoStoppedAt: row.timer?.autoStoppedAt ?? null,
                      startedAt: null,
                    },
                  }
                : row,
            ),
          ),
        );
      }
    }
    localStore.setQuery(
      api.queries.rows.runningTimer.runningTimer,
      {},
      {
        _id: args.row._id,
        dateJst: args.dateJst,
        itemName: args.row.itemName,
        timer: args.timer,
      },
    );
    return;
  }
  if (runningTimer?._id === args.row._id) {
    localStore.setQuery(api.queries.rows.runningTimer.runningTimer, {}, null);
  }
}

export function getDayRow(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { rowId: Id<"rows"> },
): BoardDay["rows"][number] | undefined {
  const day = localStore.getQuery(api.queries.days.get.get, dayQueryArgs(args));
  return day?.rows.find((row) => row._id === args.rowId);
}

export function setDayRowStatus(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { rowId: Id<"rows">; status: Status; timer?: RowTimerDto | null },
): void {
  const queryArgs = dayQueryArgs(args);
  const day = localStore.getQuery(api.queries.days.get.get, queryArgs);
  if (day === undefined) {
    return;
  }
  const row = day.rows.find((entry) => entry._id === args.rowId);
  if (row === undefined) {
    return;
  }
  const timer = args.timer === undefined ? row.timer : args.timer;
  localStore.setQuery(
    api.queries.days.get.get,
    queryArgs,
    withDerivedDayValues(
      day,
      day.rows.map((row) =>
        row._id === args.rowId
          ? {
              ...row,
              status: args.status,
              timer,
            }
          : row,
      ),
    ),
  );
  syncRunningTimer(localStore, { dateJst: args.dateJst, row, timer, todayJst: args.todayJst });
}

export function patchDayRow(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { patch: Partial<BoardDay["rows"][number]>; rowId: Id<"rows"> },
): void {
  const queryArgs = dayQueryArgs(args);
  const day = localStore.getQuery(api.queries.days.get.get, queryArgs);
  if (day === undefined) {
    return;
  }
  const row = day.rows.find((entry) => entry._id === args.rowId);
  if (row === undefined) {
    return;
  }
  const nextRow = { ...row, ...args.patch };
  localStore.setQuery(
    api.queries.days.get.get,
    queryArgs,
    withDerivedDayValues(
      day,
      day.rows.map((entry) => (entry._id === args.rowId ? nextRow : entry)),
    ),
  );
  syncRunningTimer(localStore, {
    dateJst: args.dateJst,
    row,
    timer: nextRow.timer,
    todayJst: args.todayJst,
  });
}

export function reorderDayRows(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { orderedRowIds: Id<"rows">[] },
): void {
  const queryArgs = dayQueryArgs(args);
  const day = localStore.getQuery(api.queries.days.get.get, queryArgs);
  if (day === undefined) {
    return;
  }
  const rowsById = new Map(day.rows.map((row) => [row._id, row]));
  const reordered = args.orderedRowIds.flatMap((rowId, sortOrder) => {
    const row = rowsById.get(rowId);
    if (row === undefined) {
      return [];
    }
    return [{ ...row, sortOrder }];
  });
  if (reordered.length !== day.rows.length) {
    return;
  }
  localStore.setQuery(api.queries.days.get.get, queryArgs, withDerivedDayValues(day, reordered));
}
