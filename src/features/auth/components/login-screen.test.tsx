import { expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { signInWithGoogle } from "~/features/auth/lib/auth-actions";
import { renderWithMantine } from "~/test-utils/render";

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

test("Google が設定済みなら Google ボタンが見え、押すとサインインが走る", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: true, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByRole, queryByText } = renderWithMantine(<LoginScreen />);
  expect(queryByText("Distinction 2000")).toBeNull();
  getByRole("button", { name: "Google でログイン" }).click();
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
});

test("Google が未設定なら Google ボタンは出ない", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { queryByRole } = renderWithMantine(<LoginScreen />);
  expect(queryByRole("button", { name: "Google でログイン" })).toBeNull();
});

test("アカウントログインの入力欄が見える", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: false },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByLabelText } = renderWithMantine(<LoginScreen />);
  expect(getByLabelText("ユーザー名またはメールアドレス")).toBeDefined();
  expect(getByLabelText("パスワード")).toBeDefined();
});

test("パスキーでログインボタンが見える", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { googleSignIn: false, signUpEnabled: false },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByRole } = renderWithMantine(<LoginScreen />);
  expect(getByRole("button", { name: "パスキーでログイン" })).toBeDefined();
});
