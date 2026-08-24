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

//? リポジトリは type を使い interface を禁じている(coding-style.md)が、
//? ここは declaration merging が必要な Serwist の規定パターンで type では書けない。
//? 唯一の例外として sw/** を lint.ignorePatterns に入れている(pwa-mobile.md §4.3 / §19-14)。
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
  //? 自動で奪わない。更新は画面側のボタンで(pwa-mobile.md §8.2)。
  clientsClaim: false,
  skipWaiting: false,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      //* ドキュメントは絶対にキャッシュしない。SSR HTML には認証状態と所有者のデータが埋まる(§3.1)。
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      //? /api/** は一致させない(認証応答をキャッシュしない)。sw.js 自身も除く。
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

//* 画面から「更新する」を押されたときだけ待機中の SW を昇格させる(§8.2)。
//? 自前リスナーは addEventListeners() より前に足すのが Serwist の作法。
//? Web Push の push / notificationclick / pushsubscriptionchange も、後続チケットがここへ足す(§22.1)。
self.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
