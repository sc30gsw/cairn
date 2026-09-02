import { useEffect, useSyncExternalStore } from "react";

import { useSubscribePush } from "~/hooks/use-notification-mutations";
import {
  currentPushSubscription,
  isWebPushSupported,
  WEB_PUSH_SUBSCRIPTION_CHANGED,
} from "~/lib/web-push";

//? 起動時と SW からの購読変更の合図で、この端末の購読をサーバーへ upsert する。
//? iOS は pushsubscriptionchange を出さないので、失効の検知は配信時の 404 / 410 に任せる
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
  //? 通知権限の変化を購読する標準 API は無い。次回のマウントで読み直す
  return () => undefined;
}

function getPermissionGranted(): boolean {
  return isWebPushSupported() && Notification.permission === "granted";
}

function getPermissionServerSnapshot(): boolean {
  return false;
}

//? 権限が granted の端末だけが同期を持つ。未対応・未許可なら Convex への依存も生まない。
//? SSR では false、クライアントでは同期的に読むのでハイドレーションの差分にならない
export function PushSubscriptionSync() {
  const granted = useSyncExternalStore(
    subscribePermission,
    getPermissionGranted,
    getPermissionServerSnapshot,
  );

  return granted ? <PushSubscriptionSyncGranted /> : null;
}
