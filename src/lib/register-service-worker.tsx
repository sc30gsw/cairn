import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const UPDATE_NOTIFICATION_ID = "sw-update";

function notifyUpdateReady(worker: ServiceWorker) {
  notifications.show({
    autoClose: false,
    color: "orange",
    id: UPDATE_NOTIFICATION_ID,
    message: (
      <Button
        mt="xs"
        onClick={() => {
          worker.postMessage({ type: "SKIP_WAITING" });
          notifications.hide(UPDATE_NOTIFICATION_ID);
        }}
        size="compact-sm"
      >
        更新する
      </Button>
    ),
    title: "新しい版があります",
  });
}

export async function registerServiceWorker() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    type: "module",
  });

  if (registration.waiting !== null) {
    notifyUpdateReady(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (installing === null) {
      return;
    }
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller !== null) {
        notifyUpdateReady(installing);
      }
    });
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) {
      return;
    }
    reloading = true;
    location.reload();
  });
}
