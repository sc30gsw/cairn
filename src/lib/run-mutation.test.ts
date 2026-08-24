import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { runMutation } from "~/lib/run-mutation";

const { hideMock, showMock } = vi.hoisted(() => ({
  hideMock: vi.fn(),
  showMock: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { hide: hideMock, show: showMock },
}));

vi.mock("~/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

beforeEach(() => {
  hideMock.mockClear();
  showMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function unsavedWarning() {
  return showMock.mock.calls.find(
    (call) => (call[0] as { id?: string }).id === "run-mutation-unsaved",
  );
}

//* #58 §9.2: 送信は止めない。5秒未解決という観測事実だけで警告する。
test("5秒経っても未解決なら未保存警告を出す", async () => {
  let resolve = () => undefined as void;
  const running = runMutation(
    () =>
      new Promise<void>((done) => {
        resolve = () => done();
      }),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  expect(unsavedWarning()).toBeDefined();
  expect(unsavedWarning()?.[0]).toMatchObject({
    autoClose: false,
    message: "まだ保存されていません。アプリを閉じると失われます。",
  });

  resolve();
  await running;
  expect(hideMock).toHaveBeenCalledWith("run-mutation-unsaved");
});

test("4.9秒で解決したら警告は出ない", async () => {
  let resolve = () => undefined as void;
  const running = runMutation(
    () =>
      new Promise<void>((done) => {
        resolve = () => done();
      }),
  );

  await vi.advanceTimersByTimeAsync(4_900);
  resolve();
  await running;

  expect(unsavedWarning()).toBeUndefined();
});

//* 参照カウント: 先に1本解決しても、残っている分の警告を消さない。
test("2本並行して先に1本解決しても通知は消えず、2本目の解決で消える", async () => {
  let resolveFirst = () => undefined as void;
  let resolveSecond = () => undefined as void;
  const first = runMutation(
    () =>
      new Promise<void>((done) => {
        resolveFirst = () => done();
      }),
  );
  const second = runMutation(
    () =>
      new Promise<void>((done) => {
        resolveSecond = () => done();
      }),
  );

  await vi.advanceTimersByTimeAsync(5_000);
  expect(unsavedWarning()).toBeDefined();

  resolveFirst();
  await first;
  expect(hideMock).not.toHaveBeenCalled();

  resolveSecond();
  await second;
  expect(hideMock).toHaveBeenCalledWith("run-mutation-unsaved");
});
