import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useEffect, useRef } from "react";
import type { BoardScheduleView } from "~domain/boardScheduleRange";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

//? カレンダー同期（ADR-0017）の読み書き。マイページと予定タブの両方から使うので共有に置く

export function useCalendarSyncStatus() {
  return useSuspenseQuery(convexQuery(api.queries.calendarSync.status.status, {}));
}

export function useExternalCalendarEvents(anchorDateJst: DateJst, view: BoardScheduleView) {
  return useSuspenseQuery(
    convexQuery(api.queries.calendarSync.listExternal.listExternal, { anchorDateJst, view }),
  );
}

export function useConnectCalendarSync() {
  return useAction(api.actions.calendarSync.connect.connect);
}

export function useDisconnectCalendarSync() {
  return useAction(api.actions.calendarSync.disconnect.disconnect);
}

export function useSyncCalendarNow() {
  return useAction(api.actions.calendarSync.syncNow.syncNow);
}

//? チェックボックスは往復を待たずに切り替わるよう、status の写しを先に書き換える
export function useSetVisibleCalendars() {
  return useConvexMutation(
    api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.calendarSync.status.status, {});
    if (current === undefined || current === null) {
      return;
    }
    localStore.setQuery(
      api.queries.calendarSync.status.status,
      {},
      {
        ...current,
        visibleCalendarIds: args.calendarIds,
      },
    );
  });
}

//? タブの切り替えごとに Google を叩かないための間隔（同じブラウザ内で共有）
const SYNC_ON_OPEN_COOLDOWN_MS = 5 * 60_000;
let lastSyncOnOpenAt = 0;

//? 予定タブを開いたときに差分を取りに行く（Q14）。接続が無い・権限切れなら何もしない。
//? 数分以内に取っていれば飛ばす。失敗は次の cron に任せるので、ここでは知らせない
export function useSyncCalendarOnOpen() {
  const { data: status } = useCalendarSyncStatus();
  const syncNow = useSyncCalendarNow();
  const started = useRef(false);
  const connected = status !== null && status.status !== "needsReauth";

  useEffect(() => {
    if (!connected || started.current) {
      return;
    }
    started.current = true;
    const now = Date.now();
    if (now - lastSyncOnOpenAt < SYNC_ON_OPEN_COOLDOWN_MS) {
      return;
    }
    lastSyncOnOpenAt = now;
    void syncNow({}).catch(() => undefined);
  }, [connected, syncNow]);
}
