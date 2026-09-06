import { act, fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { signInWithGoogle, signInWithPasskey } from "~/features/auth/lib/auth-actions";
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
  vi.mocked(signInWithPasskey).mockResolvedValue(Result.ok());
});

test.each([true, false])(
  "表示判定中も他のログインを使え、判定後はGoogle有効状態 %s に切り替わる",
  async (googleSignIn) => {
    vi.mocked(useAuthPublicConfig, { partial: true }).mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
      isError: false,
    });

    const view = await renderWithMemoryRouter(<LoginScreen />);
    expect(view.getByRole("status").textContent).toBe("ログイン方法を確認中");
    expect(view.queryByRole("button", { name: "Googleでログイン" })).toBeNull();
    const identifier = view.getByLabelText("ユーザー名またはメールアドレス");
    fireEvent.change(identifier, { target: { value: "my-account" } });
    expect(view.getByRole("button", { name: "ログイン" }).hasAttribute("disabled")).toBe(false);
    await act(async () => {
      fireEvent.click(view.getByRole("button", { name: "パスキーでログイン" }));
    });
    expect(signInWithPasskey).toHaveBeenCalledTimes(1);
    expect(signInWithGoogle).not.toHaveBeenCalled();

    vi.mocked(useAuthPublicConfig, { partial: true }).mockReturnValue({
      data: { googleSignIn, signUpEnabled: true },
      isPending: false,
      isFetching: false,
      isError: false,
    });
    view.rerender(<LoginScreen />);

    expect(view.queryByRole("status")).toBeNull();
    expect(view.getByDisplayValue("my-account")).toBe(identifier);
    expect(view.queryByRole("button", { name: "Googleでログイン" }) !== null).toBe(googleSignIn);
  },
);

test("表示判定に失敗したら再確認でき、再試行中は待機表示になる", async () => {
  const refetch = vi.fn<ReturnType<typeof useAuthPublicConfig>["refetch"]>();
  vi.mocked(useAuthPublicConfig, { partial: true }).mockReturnValue({
    data: undefined,
    isPending: false,
    isFetching: false,
    isError: true,
    refetch,
  });

  const view = await renderWithMemoryRouter(<LoginScreen />);
  expect(view.getByRole("status").textContent).toBe(
    "Googleログインを利用できるか確認できませんでした。",
  );
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "もう一度確認する" }));
  });
  expect(refetch).toHaveBeenCalledTimes(1);

  vi.mocked(useAuthPublicConfig, { partial: true }).mockReturnValue({
    data: undefined,
    isPending: false,
    isFetching: true,
    isError: true,
    refetch,
  });
  view.rerender(<LoginScreen />);
  expect(view.getByRole("status").textContent).toBe("ログイン方法を確認中");
  expect(view.queryByRole("button", { name: "もう一度確認する" })).toBeNull();
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
