import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useEffect, useRef } from "react";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

//? カレンダー同期（ADR-0017）の読み書き。マイページと予定タブの両方から使うので共有に置く

export function calendarSyncStatusQuery() {
  return convexQuery(api.queries.calendarSync.status.status, {});
}

export function useCalendarSyncStatus() {
  return useSuspenseQuery(calendarSyncStatusQuery());
}

export function externalCalendarEventsQuery(
  anchorDateJst: DateJst,
  view: "day" | "month" | "week" | "year",
) {
  return convexQuery(api.queries.calendarSync.listExternal.listExternal, { anchorDateJst, view });
}

export function useExternalCalendarEvents(
  anchorDateJst: DateJst,
  view: "day" | "month" | "week" | "year",
) {
  return useSuspenseQuery(externalCalendarEventsQuery(anchorDateJst, view));
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

export function useSetVisibleCalendars() {
  return useConvexMutation(api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars);
}

export function useMoveExternalCalendarEvent() {
  return useConvexMutation(api.mutations.calendarSync.moveExternal.moveExternal);
}

export function useRemoveExternalCalendarEvent() {
  return useConvexMutation(api.mutations.calendarSync.removeExternal.removeExternal);
}

//? 予定タブを開いたときに一度だけ差分を取りに行く（Q14）。接続が無い・権限切れなら何もしない。
//? 失敗は次の cron に任せるので、ここでは知らせない
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
    void syncNow({}).catch(() => undefined);
  }, [connected, syncNow]);
}
