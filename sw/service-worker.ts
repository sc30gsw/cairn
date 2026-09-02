/// <reference lib="webworker" />
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
  clientsClaim: false,
  skipWaiting: false,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !url.pathname.startsWith("/api/") &&
        url.pathname !== "/sw.js" &&
        (request.destination === "script" || request.destination === "style"),
      handler: new StaleWhileRevalidate({ cacheName: "cairn-assets" }),
    },
    {
      matcher: ({ url }) => url.origin === "https://fonts.googleapis.com",
      handler: new StaleWhileRevalidate({ cacheName: "cairn-font-css" }),
    },
    {
      matcher: ({ url }) => url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "cairn-font-files",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxAgeSeconds: 365 * DAY, maxEntries: 12 }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      { matcher: ({ request }) => request.destination === "document", url: "/offline.html" },
    ],
  },
});

//? Web Push。文言はサーバー（convex/lib/webPush.ts の webPushMessage）で組んで送る。SW は形を確かめて出すだけ
type WebPushMessage = Record<"body" | "tag" | "title" | "url", string>;

const PUSH_SUBSCRIPTION_CHANGED = "PUSH_SUBSCRIPTION_CHANGED";
const NOTIFICATION_ICON = "/icons/icon-192.png";

function isWebPushMessage(value: unknown): value is WebPushMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (["body", "tag", "title", "url"] as const).every(
    (key) => key in value && typeof (value as Record<string, unknown>)[key] === "string",
  );
}

function parsePushMessage(data: PushMessageData | null): WebPushMessage | null {
  if (data === null) {
    return null;
  }
  try {
    const parsed: unknown = data.json();
    return isWebPushMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function notificationUrl(data: unknown): string {
  const url =
    typeof data === "object" && data !== null && "url" in data && typeof data.url === "string"
      ? data.url
      : "/";
  return new URL(url, self.location.origin).href;
}

self.addEventListener("push", (event) => {
  const message = parsePushMessage(event.data);
  if (message === null) {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      data: { url: message.url },
      icon: NOTIFICATION_ICON,
      tag: message.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationUrl(event.notification.data);
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(async (clients) => {
      const client = clients.find((candidate) => candidate.focused) ?? clients[0];
      if (client === undefined) {
        await self.clients.openWindow(target);
        return;
      }
      await client.focus();
      await client.navigate(target).catch(() => null);
    }),
  );
});

//? 購読が push service 側で入れ替わったら同じ鍵で再購読し、開いているページに知らせる（サーバー側の upsert はページが行う）
self.addEventListener("pushsubscriptionchange", (event) => {
  const changeEvent = event as ExtendableEvent & {
    oldSubscription?: PushSubscription | null;
  };
  const options = changeEvent.oldSubscription?.options;
  if (options === undefined) {
    return;
  }
  changeEvent.waitUntil(
    self.registration.pushManager
      .subscribe({ applicationServerKey: options.applicationServerKey, userVisibleOnly: true })
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: "window" }))
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: PUSH_SUBSCRIPTION_CHANGED });
        }
      })
      .catch(() => undefined),
  );
});

self.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
