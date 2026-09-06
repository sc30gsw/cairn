import { Result, TaggedError } from "better-result";

import type { SubscribePushInput } from "~/types/web-push";

type WebPushErrorReason =
  | "denied"
  | "missing-key"
  | "no-service-worker"
  | "permission-failed"
  | "read-failed"
  | "subscribe-failed"
  | "unsubscribe-failed"
  | "unsupported";

class WebPushError extends TaggedError("WebPush")<{
  cause?: unknown;
  message: string;
  reason: WebPushErrorReason;
}> {}

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

function toSubscriptionInput(subscription: PushSubscription): SubscribePushInput | null {
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

function runWebPushOperation<T>(
  operation: () => Promise<T>,
  reason: WebPushErrorReason,
  message: string,
): Promise<Result<T, WebPushError>> {
  return Result.tryPromise({
    try: operation,
    catch: (cause) => new WebPushError({ cause, message, reason }),
  });
}

function readSubscription(): Promise<Result<PushSubscription | null, WebPushError>> {
  return runWebPushOperation(
    async () => {
      if (!isWebPushSupported()) return null;
      const registration = await serviceWorkerRegistration();
      return (await registration?.pushManager.getSubscription()) ?? null;
    },
    "read-failed",
    "この端末の通知設定を読み取れませんでした",
  );
}

export async function currentPushSubscription(): Promise<
  Result<SubscribePushInput | null, WebPushError>
> {
  const result = await readSubscription();
  return result.map((subscription) =>
    subscription === null ? null : toSubscriptionInput(subscription),
  );
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
  const permission = await runWebPushOperation(
    () => Notification.requestPermission(),
    "permission-failed",
    "通知の許可を確認できませんでした",
  );
  if (Result.isError(permission)) return permission;
  if (permission.value !== "granted") {
    return Result.err(
      new WebPushError({
        message: "通知が許可されませんでした。ブラウザの設定から許可すると登録できます",
        reason: "denied",
      }),
    );
  }
  const registration = await runWebPushOperation(
    serviceWorkerRegistration,
    "read-failed",
    "この端末の通知設定を読み取れませんでした",
  );
  if (Result.isError(registration)) return registration;
  if (registration.value === null) {
    return Result.err(
      new WebPushError({
        message: "Service Worker がまだ登録されていません。ページを再読み込みしてください",
        reason: "no-service-worker",
      }),
    );
  }
  const registered = registration.value;
  const subscribed = await runWebPushOperation(
    () =>
      registered.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(publicKey),
        userVisibleOnly: true,
      }),
    "subscribe-failed",
    "この端末の登録に失敗しました",
  );
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

export async function unsubscribeWebPush(): Promise<Result<string | null, WebPushError>> {
  const current = await readSubscription();
  if (Result.isError(current)) return current;
  const subscription = current.value;
  if (subscription === null) return Result.ok(null);
  const result = await runWebPushOperation(
    () => subscription.unsubscribe(),
    "unsubscribe-failed",
    "この端末の通知設定を解除できませんでした",
  );
  if (Result.isError(result)) return result;
  if (!result.value) {
    return Result.err(
      new WebPushError({
        message: "この端末の通知設定を解除できませんでした",
        reason: "unsubscribe-failed",
      }),
    );
  }
  return Result.ok(subscription.endpoint);
}
