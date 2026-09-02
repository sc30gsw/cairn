import { notificationMessage } from "./notificationCopy";
import { notificationLink } from "./notificationLink";
import type { NotificationPayload, WebPushMessage } from "./validators";

//? push service が「購読はもう無い」と答える状態コード（RFC 8030）。行を消す
export const WEB_PUSH_GONE_STATUSES = [404, 410] as const satisfies readonly number[];

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

//? 文言はサーバー側で組んで送る。SW は Convex のモジュールを import できないので、SSoT を1箇所に保つ
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

//? 3つ揃っていないときは null。鍵が無い deployment では押し出しを静かに諦める（通知欄には残る）
export function readVapidKeys(env: Record<string, string | undefined>): VapidKeys | null {
  const privateKey = env[WEB_PUSH_ENV.privateKey];
  const publicKey = env[WEB_PUSH_ENV.publicKey];
  const subject = env[WEB_PUSH_ENV.subject];
  if (!privateKey || !publicKey || !subject) {
    return null;
  }
  return { privateKey, publicKey, subject };
}
