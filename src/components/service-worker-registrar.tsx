import { useEffect } from "react";

import { registerServiceWorker } from "~/lib/register-service-worker";

//* DOM を描かない。SW の登録は dev では行わず、過去の残骸も掃除する(docs/specs/pwa-mobile.md §8.1)。
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (import.meta.env.DEV) {
      //* dev には SW を作らない。本番を開いた端末で dev を触ったときの残骸も掃除する。
      //? SW はプログレッシブエンハンスメント。失敗しても機能に影響しないので握りつぶす。
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            void registration.unregister();
          }
        })
        .catch(() => {});
      return;
    }
    //? SW はプログレッシブエンハンスメント。sw.js の 404 やストレージ逼迫での失敗は握りつぶして良い。
    registerServiceWorker().catch(() => {});
  }, []);

  return null;
}
