import { expect, test, vi } from "vite-plus/test";

import { authClient } from "~/lib/auth-client";
import {
  addPasskey,
  deletePasskey,
  updateProfileImage,
  updateProfileName,
  updateProfilePassword,
  updateProfileUsername,
} from "~/lib/profile-actions";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    changePassword: vi.fn(),
    passkey: {
      addPasskey: vi.fn(),
      deletePasskey: vi.fn(),
    },
    updateUser: vi.fn(),
  },
}));

test("表示名の更新に成功すると errorMessage は null", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await updateProfileName({ name: "新しい名前" });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.updateUser).toHaveBeenCalledWith({ name: "新しい名前" });
  expect(reload).toHaveBeenCalledTimes(1);
  reload.mockRestore();
});

test("表示名の更新エラーは利用者向けの errorMessage を返す", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({
    data: null,
    error: { message: "Invalid name", status: 400, statusText: "Bad Request" },
  });

  const result = await updateProfileName({ name: "x" });

  expect(result).toEqual({
    errorMessage: "表示名を確認してください。50文字以内で入力してください。",
  });
});

test("ユーザー名の更新に成功すると errorMessage は null", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await updateProfileUsername({ username: "new_user" });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.updateUser).toHaveBeenCalledWith({ username: "new_user" });
  reload.mockRestore();
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

  expect(result).toEqual({
    errorMessage: "現在のパスワードが正しくありません。もう一度入力してください。",
  });
});

test("アイコン URL 更新に成功すると errorMessage は null", async () => {
  vi.mocked(authClient.updateUser).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await updateProfileImage("https://example.com/avatar.jpg");

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.updateUser).toHaveBeenCalledWith({
    image: "https://example.com/avatar.jpg",
  });
  reload.mockRestore();
});

test("パスキー追加は成功時に reload しない", async () => {
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
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await addPasskey({ name: "Cairn" });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.passkey.addPasskey).toHaveBeenCalledWith({ name: "Cairn" });
  expect(reload).not.toHaveBeenCalled();
  reload.mockRestore();
});

test("パスキー削除エラーは利用者向けの errorMessage を返す", async () => {
  vi.mocked(authClient.passkey.deletePasskey).mockResolvedValue({
    data: null,
    error: {
      code: "PASSKEY_NOT_FOUND",
      message: "Passkey not found",
      status: 404,
      statusText: "Not Found",
    },
  });

  const result = await deletePasskey("pk_1");

  expect(result).toEqual({
    errorMessage: "パスキーが見つかりません。一覧を更新して、もう一度お試しください。",
  });
});

test("未知の例外は fallback メッセージになる", async () => {
  vi.mocked(authClient.updateUser).mockRejectedValue("boom");

  const result = await updateProfileName({ name: "名前" });

  expect(result).toEqual({
    errorMessage: "表示名の更新に失敗しました。入力内容を確認して、もう一度お試しください。",
  });
});
