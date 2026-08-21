import { expect, test, vi } from "vite-plus/test";

import { signInWithAccount, signUpWithAccount } from "~/features/auth/hooks/use-auth-actions";
import { authClient } from "~/lib/auth-client";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn(), username: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

test("メールアドレス形式なら email ログインを使う", async () => {
  vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  const result = await signInWithAccount({
    identifier: "user@example.com",
    password: "password123",
  });

  expect(result).toEqual({ errorMessage: null });
  expect(authClient.signIn.email).toHaveBeenCalledWith({
    email: "user@example.com",
    password: "password123",
  });
  expect(reload).toHaveBeenCalledTimes(1);
  reload.mockRestore();
});

test("ユーザー名なら username ログインを使う", async () => {
  vi.mocked(authClient.signIn.username).mockResolvedValue({ data: {}, error: null });
  const reload = vi.spyOn(location, "reload").mockImplementation(() => {});

  await signInWithAccount({
    identifier: "testuser",
    password: "password123",
  });

  expect(authClient.signIn.username).toHaveBeenCalledWith({
    username: "testuser",
    password: "password123",
  });
  reload.mockRestore();
});

test("登録エラーは errorMessage を返す", async () => {
  vi.mocked(authClient.signUp.email).mockResolvedValue({
    data: null,
    error: { message: "Email already registered", status: 400, statusText: "Bad Request" },
  });

  const result = await signUpWithAccount({
    email: "user@example.com",
    name: "Test User",
    password: "password123",
    username: "testuser",
  });

  expect(result).toEqual({ errorMessage: "Email already registered" });
});
