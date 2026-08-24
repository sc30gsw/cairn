import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import type { Status } from "~domain/domain";
import type { DateJst } from "~domain/jst";
import type { RowTimerDto } from "~domain/validators";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

type BoardDay = FunctionReturnType<typeof api.queries.days.get.get>;

type DayQueryArgs = { dateJst: DateJst; todayJst: DateJst };

function dayQueryArgs(args: DayQueryArgs): DayQueryArgs {
  return { dateJst: args.dateJst, todayJst: args.todayJst };
}

//* 楽観更新でキャッシュ上の行を読む。計測の次の値は現在値から決まるので、書く前に一度読む。
export function getDayRow(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { rowId: Id<"rows"> },
): BoardDay["rows"][number] | undefined {
  const day = localStore.getQuery(api.queries.days.get.get, dayQueryArgs(args));
  return day?.rows.find((row) => row._id === args.rowId);
}

//? 計測(#51)は status と同じ楽観更新の器に乗せる。timer を省いた呼び出しは計測を触らない。
export function setDayRowStatus(
  localStore: OptimisticLocalStore,
  args: DayQueryArgs & { rowId: Id<"rows">; status: Status; timer?: RowTimerDto | null },
): void {
  const queryArgs = dayQueryArgs(args);
  const day = localStore.getQuery(api.queries.days.get.get, queryArgs);
  if (day === undefined) {
    return;
  }
  localStore.setQuery(api.queries.days.get.get, queryArgs, {
    ...day,
    rows: day.rows.map((row) =>
      row._id === args.rowId
        ? { ...row, status: args.status, timer: args.timer === undefined ? row.timer : args.timer }
        : row,
    ),
  });
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
  localStore.setQuery(api.queries.days.get.get, queryArgs, {
    ...day,
    rows: day.rows.map((row) => (row._id === args.rowId ? { ...row, ...args.patch } : row)),
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
  localStore.setQuery(api.queries.days.get.get, queryArgs, {
    ...day,
    rows: reordered,
  });
}
