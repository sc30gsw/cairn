import { waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  WEB_PUSH_DENIED_MESSAGE,
  WEB_PUSH_DISABLE_LABEL,
  WEB_PUSH_ENABLE_LABEL,
  WEB_PUSH_IOS_HINT,
  WEB_PUSH_MISSING_KEY_MESSAGE,
  WEB_PUSH_SUBSCRIBED_BADGE,
  WEB_PUSH_UNSUPPORTED_MESSAGE,
  WebPushSection,
} from "~/features/my-page/components/web-push-section";
import { renderWithMantine } from "~/test-utils/render";

const SNAPSHOT = {
  endpoint: "https://push.example/this-device",
  keys: { auth: "auth", p256dh: "p256dh" },
};

const { pushState, subscribeMutate, subscribeWebPush, unsubscribeMutate, unsubscribeWebPush } =
  vi.hoisted(() => ({
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
  currentPushSubscription: () => Promise.resolve(pushState.current),
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

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>) => operation(),
}));

beforeEach(() => {
  pushState.current = null;
  pushState.permission = "default";
  pushState.publicKey = "public-key";
  pushState.standalone = true;
  pushState.subscriptions = [];
  pushState.supported = true;
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

test("この端末が登録済みならバッジと「止める」を出し、解除でサーバーの行も消す", async () => {
  pushState.current = SNAPSHOT;
  pushState.subscriptions = [{ _creationTime: 1, _id: "sub-1", endpoint: SNAPSHOT.endpoint }];
  unsubscribeWebPush.mockResolvedValue(SNAPSHOT.endpoint);
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
