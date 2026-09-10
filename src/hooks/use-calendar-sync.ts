import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "~/../convex/_generated/api";
import { useOptionalCalendarSyncStatusLiveQuery } from "~/lib/tanstack-db/collections";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useCalendarSyncStatus() {
  const live = useOptionalCalendarSyncStatusLiveQuery();
  const queryResult = useSuspenseQuery(convexQuery(api.queries.calendarSync.status.status, {}));
  return {
    ...queryResult,
    data: live.isReady && live.data !== undefined ? live.data : queryResult.data,
  };
}

export function useConnectCalendarSync() {
  return useAction(api.actions.calendarSync.connect.connect);
}

export function useBeginCalendarAuthorization() {
  return useConvexMutation(api.mutations.calendarAuth.begin.begin);
}

export function useDisconnectCalendarSync() {
  return useAction(api.actions.calendarSync.disconnect.disconnect);
}

export function useSyncCalendarNow() {
  return useAction(api.actions.calendarSync.syncNow.syncNow);
}

export function useSetCalendarOutput() {
  return useAction(api.actions.calendarSync.setOutput.setOutput);
}

export function useRetryCalendarOutput() {
  return useAction(api.actions.calendarSync.retryOutputChange.retryOutputChange);
}

export function useSetVisibleCalendars() {
  return useConvexMutation(
    api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.calendarSync.status.status, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.calendarSync.status.status,
      {},
      {
        ...current,
        connections: current.connections.map((connection) =>
          connection.connectionId === args.connectionId
            ? { ...connection, visibleCalendarIds: args.calendarIds }
            : connection,
        ),
      },
    );
  });
}

function createCooldown(ms: number) {
  let lastAcquiredAt = 0;
  return {
    tryAcquire(now: number): boolean {
      if (now - lastAcquiredAt < ms) {
        return false;
      }
      lastAcquiredAt = now;
      return true;
    },
  };
}

const syncOnOpenCooldownAcrossTabsOfThisPage = createCooldown(5 * 60_000);

export function useSyncCalendarOnOpen() {
  const { data: status } = useCalendarSyncStatus();
  const syncNow = useSyncCalendarNow();
  const started = useRef(false);
  const connected = status.connections.some((connection) => connection.status !== "needsReauth");

  useEffect(() => {
    if (!connected || started.current) {
      return;
    }
    started.current = true;
    if (!syncOnOpenCooldownAcrossTabsOfThisPage.tryAcquire(Date.now())) {
      return;
    }
    void syncNow({}).catch(() => undefined);
  }, [connected, syncNow]);
}
