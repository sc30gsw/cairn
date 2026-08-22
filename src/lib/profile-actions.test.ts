import { expect, test, vi, beforeEach } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { authClient } from "~/lib/auth-client";
import {
  addPasskey,
  deletePasskey,
  listPasskeys,
  updateProfileImage,
  updateProfileName,
  updateProfilePassword,
  updateProfileUsername,
} from "~/lib/profile-actions";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn(),
    getSession: vi.fn(),
    passkey: {
      addPasskey: vi.fn(),
      deletePasskey: vi.fn(),
      listUserPasskeys: vi.fn(),
    },
    updateUser: vi.fn(),
  },
}));

function mockProfileUpdateSuccess() {
  vi.mocked(authClient.getSession).mockResolvedValue({
    data: { session: null, user: null },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProfileUpdateSuccess();
});

test("表示名の更新に成功すると errorMessage は null で reload せず session を再取得する", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await updateProfileName({ name: "新しい名前" });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.getSession).toHaveBeenCalledTimes(1);
  expect(reload).not.toHaveBeenCalled();
  reload.mockRestore();
});

test("アイコン storageId 更新に成功すると convex-storage 参照を保存する", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });

  const result = await updateProfileImage("storage123" as Id<"_storage">);

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.updateUser).toHaveBeenCalledWith({
    image: "convex-storage:storage123",
  });
});

test("listPasskeys は成功時に passkeys を返す", async () => {
  vi.mocked(authClient.passkey.listUserPasskeys).mockResolvedValue({
    data: [{ id: "pk_1" } as import("@better-auth/passkey/client").Passkey],
    error: null,
  });

  const result = await listPasskeys();

  expect(result).toEqual({ errorMessage: null, passkeys: [{ id: "pk_1" }] });
});

test("listPasskeys は API エラー時に errorMessage を返す", async () => {
  vi.mocked(authClient.passkey.listUserPasskeys).mockResolvedValue({
    data: null,
    error: { message: "fail", status: 500, statusText: "Error" },
  });

  const result = await listPasskeys();

  expect(result.errorMessage).toContain("パスキー一覧");
  expect(result.passkeys).toEqual([]);
});

test("パスキー追加は成功時に reload も session 再取得もしない", async () => {
  vi.mocked(authClient.passkey.addPasskey).mockResolvedValue({
    data: {
      backedUp: false,
      counter: 0,
      createdAt: new Date(),
      credentialID: "cred",
      deviceType: "singleDevice",
      id: "pk_1",
      publicKey: "key",
      userId: "user_1",
    },
    error: null,
  });

  const result = await addPasskey({ name: "Cairn" });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.getSession).not.toHaveBeenCalled();
});

test("パスワード更新エラーは利用者向けの errorMessage を返す", async () => {
  vi.mocked(authClient.changePassword).mockResolvedValue({
    data: null,
    error: {
      code: "INVALID_PASSWORD",
      message: "Invalid password",
      status: 400,
      statusText: "Bad Request",
    },
  });

  const result = await updateProfilePassword({
    currentPassword: "old-password",
    newPassword: "new-password",
  });

  expect(result.errorMessage).toContain("現在のパスワード");
});

test("ユーザー名の更新に成功すると errorMessage は null", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });

  const result = await updateProfileUsername({ username: "new_user" });

  expect(result).toEqual({ errorMessage: null });
});

test("パスキー削除は成功時に session 再取得もしない", async () => {
  vi.mocked(authClient.passkey.deletePasskey).mockResolvedValue({ data: {}, error: null });

  const result = await deletePasskey("pk_1");

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.getSession).not.toHaveBeenCalled();
});
