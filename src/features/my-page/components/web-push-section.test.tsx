import { waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  WEB_PUSH_DENIED_MESSAGE,
  WEB_PUSH_DISABLE_LABEL,
  WEB_PUSH_ENABLE_LABEL,
  WEB_PUSH_IOS_HINT,
  WEB_PUSH_MISSING_KEY_MESSAGE,
  WEB_PUSH_PENDING_REMOVAL_MESSAGE,
  WEB_PUSH_RETRY_DISABLE_LABEL,
  WEB_PUSH_SUBSCRIBED_BADGE,
  WEB_PUSH_UNSUPPORTED_MESSAGE,
  WebPushSection,
} from "~/features/my-page/components/web-push-section";
import { renderWithMantine } from "~/test-utils/render";

const SNAPSHOT = {
  endpoint: "https://push.example/this-device",
  keys: { auth: "auth", p256dh: "p256dh" },
};

const {
  notifyError,
  pushState,
  subscribeMutate,
  subscribeWebPush,
  unsubscribeMutate,
  unsubscribeWebPush,
} = vi.hoisted(() => ({
  notifyError: vi.fn(),
  pushState: {
    current: null as typeof SNAPSHOT | null,
    permission: "default" as string,
    publicKey: "public-key" as string | null,
    standalone: true,
    subscriptions: [] as { _creationTime: number; _id: string; endpoint: string }[],
    supported: true,
  },
  subscribeMutate: vi.fn().mockResolvedValue(null),
  subscribeWebPush: vi.fn(),
  unsubscribeMutate: vi.fn().mockResolvedValue(null),
  unsubscribeWebPush: vi.fn(),
}));

vi.mock("~/lib/web-push", () => ({
  currentPushSubscription: () => Promise.resolve(Result.ok(pushState.current)),
  isWebPushSupported: () => pushState.supported,
  notificationPermission: () => pushState.permission,
  subscribeWebPush,
  unsubscribeWebPush,
}));

vi.mock("~/hooks/use-install-prompt", () => ({
  useInstallPrompt: () => ({
    canPrompt: false,
    promptInstall: vi.fn(),
    standalone: pushState.standalone,
  }),
}));

vi.mock("~/hooks/use-notification-inbox", () => ({
  usePushSubscriptions: () => ({ data: pushState.subscriptions }),
  useWebPushConfig: () => ({ data: { publicKey: pushState.publicKey } }),
}));

vi.mock("~/hooks/use-notification-mutations", () => ({
  useSubscribePush: () => ({ mutateAsync: subscribeMutate }),
  useUnsubscribePush: () => ({ mutateAsync: unsubscribeMutate }),
}));

vi.mock("~/lib/notify", () => ({ notifyError }));

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>) =>
    Result.tryPromise({ try: operation, catch: (cause) => cause }),
}));

beforeEach(() => {
  pushState.current = null;
  pushState.permission = "default";
  pushState.publicKey = "public-key";
  pushState.standalone = true;
  pushState.subscriptions = [];
  pushState.supported = true;
  notifyError.mockClear();
  subscribeMutate.mockClear();
  subscribeWebPush.mockReset();
  unsubscribeMutate.mockClear();
  unsubscribeWebPush.mockReset();
});

test("対応していないブラウザ・鍵の無いサーバーでは、その旨だけを出す", () => {
  pushState.supported = false;
  const unsupported = renderWithMantine(<WebPushSection />);
  expect(unsupported.getByText(WEB_PUSH_UNSUPPORTED_MESSAGE)).toBeDefined();
  expect(unsupported.queryByRole("button", { name: WEB_PUSH_ENABLE_LABEL })).toBeNull();
  unsupported.unmount();

  pushState.supported = true;
  pushState.publicKey = null;
  const missingKey = renderWithMantine(<WebPushSection />);
  expect(missingKey.getByText(WEB_PUSH_MISSING_KEY_MESSAGE)).toBeDefined();
  expect(missingKey.queryByRole("button", { name: WEB_PUSH_ENABLE_LABEL })).toBeNull();
});

test("未登録の端末では「受け取る」から購読し、サーバーへ登録する", async () => {
  subscribeWebPush.mockResolvedValue(Result.ok(SNAPSHOT));
  const { getByRole, getByText } = renderWithMantine(<WebPushSection />);
  expect(getByText(/登録済みの端末/)).toBeDefined();

  getByRole("button", { name: WEB_PUSH_ENABLE_LABEL }).click();

  await waitFor(() => {
    expect(subscribeMutate).toHaveBeenCalledWith(SNAPSHOT);
  });
  expect(subscribeWebPush).toHaveBeenCalledWith("public-key");
});

test("ブラウザ購読を保持し、サーバー登録が確認されるまでは届くと表示しない", async () => {
  subscribeWebPush.mockResolvedValue(Result.ok(SNAPSHOT));
  subscribeMutate.mockRejectedValueOnce(new Error("offline"));
  const view = renderWithMantine(<WebPushSection />);

  view.getByRole("button", { name: WEB_PUSH_ENABLE_LABEL }).click();
  await waitFor(() => expect(subscribeMutate).toHaveBeenCalledTimes(1));
  expect(view.queryByText(WEB_PUSH_SUBSCRIBED_BADGE)).toBeNull();

  pushState.subscriptions = [{ _creationTime: 1, _id: "sub-1", endpoint: SNAPSHOT.endpoint }];
  view.rerender(<WebPushSection />);
  await waitFor(() => expect(view.getByText(WEB_PUSH_SUBSCRIBED_BADGE)).toBeDefined());
});

test("この端末が登録済みならバッジと「止める」を出し、解除でサーバーの行も消す", async () => {
  pushState.current = SNAPSHOT;
  pushState.subscriptions = [{ _creationTime: 1, _id: "sub-1", endpoint: SNAPSHOT.endpoint }];
  unsubscribeWebPush.mockResolvedValue(Result.ok(SNAPSHOT.endpoint));
  const { getByRole, getByText } = renderWithMantine(<WebPushSection />);

  await waitFor(() => {
    expect(getByText(WEB_PUSH_SUBSCRIBED_BADGE)).toBeDefined();
  });
  getByRole("button", { name: WEB_PUSH_DISABLE_LABEL }).click();

  await waitFor(() => {
    expect(unsubscribeMutate).toHaveBeenCalledWith({ endpoint: SNAPSHOT.endpoint });
  });
});

test("ブラウザで拒否されていれば案内を出し、ボタンは押せない", () => {
  pushState.permission = "denied";
  const { getByRole, getByText } = renderWithMantine(<WebPushSection />);
  expect(getByText(WEB_PUSH_DENIED_MESSAGE)).toBeDefined();
  expect((getByRole("button", { name: WEB_PUSH_ENABLE_LABEL }) as HTMLButtonElement).disabled).toBe(
    true,
  );
});

test("ホーム画面アプリとして起動していないときは iOS の前提を添える", () => {
  pushState.standalone = false;
  const view = renderWithMantine(<WebPushSection />);
  expect(view.getByText(WEB_PUSH_IOS_HINT)).toBeDefined();
  view.unmount();

  pushState.standalone = true;
  const standalone = renderWithMantine(<WebPushSection />);
  expect(standalone.queryByText(WEB_PUSH_IOS_HINT)).toBeNull();
});

test("購読の途中で例外が飛んでもトーストで知らせ、ボタンは押せる状態に戻る", async () => {
  const failure = new Error("permission prompt failed");
  subscribeWebPush.mockRejectedValue(failure);
  const { getByRole } = renderWithMantine(<WebPushSection />);
  const button = getByRole("button", { name: WEB_PUSH_ENABLE_LABEL });

  button.click();

  await waitFor(() => {
    expect(notifyError).toHaveBeenCalledWith(failure, expect.any(String));
  });
  expect(subscribeMutate).not.toHaveBeenCalled();
  expect(button.getAttribute("data-loading")).toBeNull();
});

test("解除のサーバー保存が失敗したら停止済みと示しendpointを保持して再試行する", async () => {
  pushState.current = SNAPSHOT;
  pushState.subscriptions = [{ _creationTime: 1, _id: "sub-1", endpoint: SNAPSHOT.endpoint }];
  unsubscribeWebPush
    .mockResolvedValueOnce(Result.ok(SNAPSHOT.endpoint))
    .mockResolvedValue(Result.ok(null));
  unsubscribeMutate.mockRejectedValueOnce(new Error("offline"));
  const view = renderWithMantine(<WebPushSection />);

  await waitFor(() => expect(view.getByText(WEB_PUSH_SUBSCRIBED_BADGE)).toBeDefined());
  view.getByRole("button", { name: WEB_PUSH_DISABLE_LABEL }).click();
  await waitFor(() => expect(unsubscribeMutate).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      view.getByRole("button", { name: WEB_PUSH_RETRY_DISABLE_LABEL }).getAttribute("data-loading"),
    ).toBeNull(),
  );
  expect(view.queryByText(WEB_PUSH_SUBSCRIBED_BADGE)).toBeNull();
  expect(view.getByText(WEB_PUSH_PENDING_REMOVAL_MESSAGE)).toBeDefined();

  view.getByRole("button", { name: WEB_PUSH_RETRY_DISABLE_LABEL }).click();
  await waitFor(() => expect(unsubscribeMutate).toHaveBeenCalledTimes(2));
  expect(unsubscribeMutate).toHaveBeenLastCalledWith({ endpoint: SNAPSHOT.endpoint });
  await waitFor(() => expect(view.queryByText(WEB_PUSH_PENDING_REMOVAL_MESSAGE)).toBeNull());
});
