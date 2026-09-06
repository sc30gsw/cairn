import { useEffect, useSyncExternalStore } from "react";

import { useSubscribePush } from "~/hooks/use-notification-mutations";
import {
  currentPushSubscription,
  isWebPushSupported,
  WEB_PUSH_SUBSCRIPTION_CHANGED,
} from "~/lib/web-push";

function PushSubscriptionSyncGranted() {
  const { mutateAsync: subscribePush } = useSubscribePush();

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const subscription = await currentPushSubscription();
      if (subscription === null || cancelled) {
        return;
      }
      await subscribePush(subscription).catch(() => undefined);
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

function subscribePermission() {
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
    subscribePermission,
    getPermissionGranted,
    getPermissionServerSnapshot,
  );

  return granted ? <PushSubscriptionSyncGranted /> : null;
}
