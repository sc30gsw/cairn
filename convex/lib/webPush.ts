import { notificationMessage } from "./notificationCopy";
import { notificationLink } from "./notificationLink";
import type { NotificationPayload, WebPushMessage } from "./validators";

// iOS Safari は pushsubscriptionchange を発火しないため、購読切れはサーバー側でこの応答から検知する（RFC 8030 §7.3）
export const WEB_PUSH_GONE_STATUSES = [404, 410] as const satisfies readonly number[];

export const WEB_PUSH_SUBSCRIPTION_CHANGED = "PUSH_SUBSCRIPTION_CHANGED";

export type WebPushOutcome = "delivered" | "failed" | "gone";

export function webPushOutcome(statusCode: number | undefined): WebPushOutcome {
  if (statusCode === undefined) {
    return "failed";
  }
  if (WEB_PUSH_GONE_STATUSES.some((code) => code === statusCode)) {
    return "gone";
  }
  return statusCode >= 200 && statusCode < 300 ? "delivered" : "failed";
}

export function webPushMessage(notification: {
  dedupeKey: string;
  payload: NotificationPayload;
}): WebPushMessage {
  const { body, title } = notificationMessage(notification.payload);
  return {
    body,
    tag: notification.dedupeKey,
    title,
    url: notificationLink(notification.payload.kind),
  };
}

export const WEB_PUSH_ENV = {
  privateKey: "WEB_PUSH_VAPID_PRIVATE_KEY",
  publicKey: "WEB_PUSH_VAPID_PUBLIC_KEY",
  subject: "WEB_PUSH_VAPID_SUBJECT",
} as const satisfies Record<string, string>;

export type VapidKeys = {
  privateKey: string;
  publicKey: string;
  subject: string;
};

export function readVapidKeys(env: Record<string, string | undefined>): VapidKeys | null {
  const privateKey = env[WEB_PUSH_ENV.privateKey];
  const publicKey = env[WEB_PUSH_ENV.publicKey];
  const subject = env[WEB_PUSH_ENV.subject];
  if (!privateKey || !publicKey || !subject) {
    return null;
  }
  return { privateKey, publicKey, subject };
}
