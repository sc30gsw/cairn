import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useEffect, useRef } from "react";
import type { BoardScheduleView } from "~domain/boardScheduleRange";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

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

const SYNC_ON_OPEN_COOLDOWN_MS = 5 * 60_000;
let lastSyncOnOpenAt = 0;

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
