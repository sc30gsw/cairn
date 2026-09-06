import { act, fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { signInWithGoogle } from "~/features/auth/lib/auth-actions";
import type { AuthActionResult } from "~/lib/auth-action-result";
import { AuthActionError } from "~/lib/errors";
import {
  PASSKEY_OAUTH_PENDING_KEY,
  readPasskeySessionFlag,
  writePasskeySessionFlag,
} from "~/lib/passkey-storage";
import { renderWithMemoryRouter } from "~/test-utils/render";

vi.mock("~/features/auth/lib/auth-actions", () => ({
  signInWithGoogle: vi.fn(),
  signInWithPasskey: vi.fn(),
  signInWithAccount: vi.fn(),
  signOutAndReload: vi.fn(),
  signUpWithAccount: vi.fn(),
}));

vi.mock("~/features/auth/hooks/use-auth-config", () => ({
  useAuthPublicConfig: vi.fn(),
}));

import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signInWithGoogle).mockResolvedValue(Result.ok());
});

test("Google が設定済みなら Google ボタンが見え、押すとサインインが走る", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: true, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByRole, queryByText } = await renderWithMemoryRouter(<LoginScreen />);
  expect(queryByText("Distinction 2000")).toBeNull();
  await act(async () => {
    fireEvent.click(getByRole("button", { name: "Googleでログイン" }));
  });
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
});

test("Google が未設定なら Google ボタンは出ない", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { queryByRole } = await renderWithMemoryRouter(<LoginScreen />);
  expect(queryByRole("button", { name: "Googleでログイン" })).toBeNull();
});

test("アカウントログインの入力欄が見える", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: false },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByLabelText } = await renderWithMemoryRouter(<LoginScreen />);
  expect(getByLabelText("ユーザー名またはメールアドレス")).toBeDefined();
  expect(getByLabelText("パスワード")).toBeDefined();
});

test("パスキーでログインボタンが見える", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: false },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByRole } = await renderWithMemoryRouter(<LoginScreen />);
  expect(getByRole("button", { name: "パスキーでログイン" })).toBeDefined();
});

test("Google 認証の開始中は再送を防ぎ、失敗後は再試行できる", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: true, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);
  let resolvePending: (result: AuthActionResult) => void = () => {};
  const pending = new Promise<AuthActionResult>((resolve) => {
    resolvePending = resolve;
  });
  vi.mocked(signInWithGoogle).mockReturnValue(pending);

  const { getByRole, findByText } = await renderWithMemoryRouter(<LoginScreen />);
  const button = getByRole("button", { name: "Googleでログイン" });
  fireEvent.click(button);
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(true));
  fireEvent.click(button);
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolvePending(
      Result.err(new AuthActionError({ message: "ログインを開始できませんでした。" })),
    );
  });

  expect(await findByText("ログインを開始できませんでした。")).toBeDefined();
  expect(button.hasAttribute("disabled")).toBe(false);
  vi.mocked(signInWithGoogle).mockResolvedValue(Result.ok());
  await act(async () => {
    fireEvent.click(button);
  });
  expect(signInWithGoogle).toHaveBeenCalledTimes(2);
});

test("OAuth から失敗して戻ると安全なエラー文を表示し、登録促進フラグを消す", async () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: true, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);

  const { getByRole, queryByText } = await renderWithMemoryRouter(
    <LoginScreen />,
    "/?authError=google&error=access_denied&error_description=private-provider-detail",
  );

  expect(getByRole("alert").textContent).toBe(
    "Google でのログインを完了できませんでした。もう一度お試しください。",
  );
  expect(queryByText("private-provider-detail")).toBeNull();
  expect(readPasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY)).toBe(false);
});
