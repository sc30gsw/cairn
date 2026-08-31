import { useEffect } from "react";

import { registerServiceWorker } from "~/lib/register-service-worker";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (import.meta.env.DEV) {
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
    registerServiceWorker().catch(() => {});
  }, []);

  return null;
}
