import { expect, test } from "vite-plus/test";

import { readVapidKeys, WEB_PUSH_ENV, webPushMessage, webPushOutcome } from "./webPush";

test("404 / 410 は購読の失効、2xx は配信済み、それ以外と不明は失敗", () => {
  expect(webPushOutcome(404)).toBe("gone");
  expect(webPushOutcome(410)).toBe("gone");
  expect(webPushOutcome(201)).toBe("delivered");
  expect(webPushOutcome(429)).toBe("failed");
  expect(webPushOutcome(500)).toBe("failed");
  expect(webPushOutcome(undefined)).toBe("failed");
});

test("押し出しの文言は通知欄と同じ純関数で組み、遷移先と dedupeKey を添える", () => {
  const message = webPushMessage({
    dedupeKey: "checkpointDeadline:2026-08-20",
    payload: {
      dateJst: "2026-08-20",
      items: [
        { content: "音読を1周", daysLeft: 2, deadline: "2026-08-22", goalId: "goal" as never },
      ],
      kind: "checkpointDeadline",
    },
  });
  expect(message).toEqual({
    body: "・音読を1周（あと2日 / 2026-08-22）",
    tag: "checkpointDeadline:2026-08-20",
    title: "チェックポイントの期限が近づいています",
    url: "/goals",
  });
});

test("VAPID の3値が揃っていなければ null", () => {
  expect(readVapidKeys({})).toBeNull();
  expect(
    readVapidKeys({ [WEB_PUSH_ENV.privateKey]: "p", [WEB_PUSH_ENV.publicKey]: "" }),
  ).toBeNull();
  expect(
    readVapidKeys({
      [WEB_PUSH_ENV.privateKey]: "priv",
      [WEB_PUSH_ENV.publicKey]: "pub",
      [WEB_PUSH_ENV.subject]: "mailto:owner@example.com",
    }),
  ).toEqual({ privateKey: "priv", publicKey: "pub", subject: "mailto:owner@example.com" });
});
