import { Result } from "better-result";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { currentPushSubscription, subscribeWebPush, unsubscribeWebPush } from "~/lib/web-push";

const snapshot = { endpoint: "https://push.example/device", keys: { auth: "auth", p256dh: "key" } };
const subscription = {
  endpoint: snapshot.endpoint,
  toJSON: () => snapshot,
  unsubscribe: vi.fn(async () => true),
};
const getSubscription = vi.fn(async () => subscription);
const subscribe = vi.fn(async () => subscription);
const registration = { pushManager: { getSubscription, subscribe } };
const getRegistration = vi.fn(async () => registration);
const requestPermission = vi.fn(async () => "granted");

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
  vi.stubGlobal("Notification", { permission: "granted", requestPermission });
  vi.stubGlobal("PushManager", class {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each(["permission", "registration", "subscribe"])(
  "購読の%s失敗をResultで返す",
  async (stage) => {
    const cause = new Error(stage);
    if (stage === "permission") requestPermission.mockRejectedValueOnce(cause);
    if (stage === "registration") getRegistration.mockRejectedValueOnce(cause);
    if (stage === "subscribe") subscribe.mockRejectedValueOnce(cause);

    const result = await subscribeWebPush("AQID");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.error.cause).toBe(cause);
  },
);

test.each(["registration", "subscription"])("初期%s取得の失敗をResultで返す", async (stage) => {
  const cause = new Error(stage);
  if (stage === "registration") getRegistration.mockRejectedValueOnce(cause);
  else getSubscription.mockRejectedValueOnce(cause);

  const result = await currentPushSubscription();

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) expect(result.error).toMatchObject({ cause, reason: "read-failed" });
});

test("権限拒否時はブラウザの購読を作らない", async () => {
  requestPermission.mockResolvedValueOnce("denied");

  const result = await subscribeWebPush("AQID");

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) expect(result.error.reason).toBe("denied");
  expect(subscribe).not.toHaveBeenCalled();
});

test("解除のrejectを保持する", async () => {
  const cause = new Error("unsubscribe failed");
  subscription.unsubscribe.mockRejectedValueOnce(cause);

  const result = await unsubscribeWebPush();

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result))
    expect(result.error).toMatchObject({ cause, reason: "unsubscribe-failed" });
});

test("解除できなかった応答を成功として扱わない", async () => {
  subscription.unsubscribe.mockResolvedValueOnce(false);

  const result = await unsubscribeWebPush();

  expect(Result.isError(result)).toBe(true);
});

test("解除成功時だけ再試行用のendpointを返す", async () => {
  const result = await unsubscribeWebPush();

  expect(Result.isOk(result)).toBe(true);
  if (Result.isOk(result)) expect(result.value).toBe(snapshot.endpoint);
});
