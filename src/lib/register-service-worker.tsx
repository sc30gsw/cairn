import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const UPDATE_NOTIFICATION_ID = "sw-update";

//* 更新は自動で奪わない(skipWaiting: false)。人が押したときだけ待機中の SW を昇格させる
//? (docs/specs/pwa-mobile.md §8.2)。文言は notify.ts に置かない — 更新フロー専用の1枚だけだから。
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

  //* 既に待機中の版があるなら即座に案内する。
  if (registration.waiting !== null) {
    notifyUpdateReady(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (installing === null) {
      return;
    }
    installing.addEventListener("statechange", () => {
      //? controller があるときの installed = 初回インストールではなく「更新が待機に入った」。
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
