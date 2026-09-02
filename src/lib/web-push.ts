import { Result, TaggedError } from "better-result";

import type { SubscribePushInput } from "~/types/web-push";

export type WebPushErrorReason =
  | "denied"
  | "missing-key"
  | "no-service-worker"
  | "subscribe-failed"
  | "unsupported";

export class WebPushError extends TaggedError("WebPush")<{
  cause?: unknown;
  message: string;
  reason: WebPushErrorReason;
}> {}

export const WEB_PUSH_SUBSCRIPTION_CHANGED = "PUSH_SUBSCRIPTION_CHANGED";

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return isWebPushSupported() ? Notification.permission : "unsupported";
}

//? VAPID 公開鍵（base64url）を applicationServerKey が受け取る Uint8Array に直す
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

//? PushSubscription.toJSON() を Convex に渡す形へ。鍵が欠けていれば登録できない
export function toSubscriptionInput(subscription: PushSubscription): SubscribePushInput | null {
  const json = subscription.toJSON();
  const auth = json.keys?.auth;
  const p256dh = json.keys?.p256dh;
  if (json.endpoint === undefined || auth === undefined || p256dh === undefined) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? undefined,
    keys: { auth, p256dh },
  };
}

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ?? null;
}

export async function currentPushSubscription(): Promise<SubscribePushInput | null> {
  if (!isWebPushSupported()) {
    return null;
  }
  const registration = await serviceWorkerRegistration();
  if (registration === null) {
    return null;
  }
  const subscription = await registration.pushManager.getSubscription();
  return subscription === null ? null : toSubscriptionInput(subscription);
}

export async function subscribeWebPush(
  publicKey: string | null,
): Promise<Result<SubscribePushInput, WebPushError>> {
  if (!isWebPushSupported()) {
    return Result.err(
      new WebPushError({
        message: "このブラウザは端末への通知に対応していません",
        reason: "unsupported",
      }),
    );
  }
  if (publicKey === null) {
    return Result.err(
      new WebPushError({
        message: "サーバーに Web Push の鍵が設定されていません",
        reason: "missing-key",
      }),
    );
  }
  //? 権限要求はボタン押下（ユーザー操作）からだけ呼ぶ。自動では出さない
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return Result.err(
      new WebPushError({
        message: "通知が許可されませんでした。ブラウザの設定から許可すると登録できます",
        reason: "denied",
      }),
    );
  }
  const registration = await serviceWorkerRegistration();
  if (registration === null) {
    return Result.err(
      new WebPushError({
        message: "Service Worker がまだ登録されていません。ページを再読み込みしてください",
        reason: "no-service-worker",
      }),
    );
  }
  const subscribed = await Result.tryPromise({
    catch: (cause) =>
      new WebPushError({
        cause,
        message: "この端末の登録に失敗しました",
        reason: "subscribe-failed",
      }),
    try: () =>
      registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey),
        userVisibleOnly: true,
      }),
  });
  if (Result.isError(subscribed)) {
    return subscribed;
  }
  const input = toSubscriptionInput(subscribed.value);
  if (input === null) {
    return Result.err(
      new WebPushError({ message: "購読情報を読み取れませんでした", reason: "subscribe-failed" }),
    );
  }
  return Result.ok(input);
}

//? 解除した endpoint を返す（サーバー側の行を消すのに使う）。購読が無ければ null
export async function unsubscribeWebPush(): Promise<string | null> {
  if (!isWebPushSupported()) {
    return null;
  }
  const registration = await serviceWorkerRegistration();
  const subscription = (await registration?.pushManager.getSubscription()) ?? null;
  if (subscription === null) {
    return null;
  }
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
