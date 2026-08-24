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
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
      return;
    }
    void registerServiceWorker();
  }, []);

  return null;
}
