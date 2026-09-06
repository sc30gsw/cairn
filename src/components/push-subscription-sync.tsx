import { Result } from "better-result";
import { useEffect, useSyncExternalStore } from "react";
import { WEB_PUSH_SUBSCRIPTION_CHANGED } from "~domain/webPush";

import { useSubscribePush } from "~/hooks/use-notification-mutations";
import { currentPushSubscription, isWebPushSupported } from "~/lib/web-push";

function PushSubscriptionSyncGranted() {
  const { mutateAsync: subscribePush } = useSubscribePush();

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const result = await currentPushSubscription();
      if (Result.isError(result) || result.value === null || cancelled) {
        return;
      }
      await subscribePush(result.value).catch(() => undefined);
    }
    function onMessage(event: MessageEvent) {
      const data: unknown = event.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        data.type === WEB_PUSH_SUBSCRIPTION_CHANGED
      ) {
        void sync();
      }
    }
    void sync();
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [subscribePush]);

  return null;
}

function noPermissionChangeEvents() {
  return () => undefined;
}

function getPermissionGranted(): boolean {
  return isWebPushSupported() && Notification.permission === "granted";
}

function getPermissionServerSnapshot(): boolean {
  return false;
}

export function PushSubscriptionSync() {
  const granted = useSyncExternalStore(
    noPermissionChangeEvents,
    getPermissionGranted,
    getPermissionServerSnapshot,
  );

  return granted ? <PushSubscriptionSyncGranted /> : null;
}
