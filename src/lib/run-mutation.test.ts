import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { notifyError, notifySuccess } from "~/lib/notify";
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
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
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

test("silent かつ successMessage 指定時は成功 Toast だけ出す", async () => {
  await runMutation(async () => "ok", { silent: true, successMessage: "記録しました" });

  expect(notifySuccess).toHaveBeenCalledWith("記録しました");
  expect(unsavedWarning()).toBeUndefined();
});

test("silent かつ successMessage 未指定なら Toast を出さない", async () => {
  await runMutation(async () => "ok", { silent: true });

  expect(notifySuccess).not.toHaveBeenCalled();
});

test("silent でも失敗時はエラー Toast を出さない", async () => {
  await runMutation(() => Promise.reject(new Error("boom")), {
    silent: true,
    successMessage: "記録しました",
  });

  expect(notifyError).not.toHaveBeenCalled();
  expect(notifySuccess).not.toHaveBeenCalled();
});

test("silent かつ関数型 successMessage は mutation の戻り値を受け取る", async () => {
  await runMutation(async () => 3, {
    silent: true,
    successMessage: (count) => `${String(count)}件削除しました`,
  });

  expect(notifySuccess).toHaveBeenCalledWith("3件削除しました");
});

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
