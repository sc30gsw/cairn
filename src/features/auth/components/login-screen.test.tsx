import { expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { renderWithMantine } from "~/test-utils/render";

const { signInWithNotion } = vi.hoisted(() => ({
  signInWithNotion: vi.fn(),
}));

vi.mock("~/features/auth/lib/auth-actions", () => ({
  signInWithNotion,
  signInWithAccount: vi.fn(),
  signOutAndReload: vi.fn(),
  signUpWithAccount: vi.fn(),
}));

vi.mock("~/features/auth/hooks/use-auth-config", () => ({
  useAuthPublicConfig: vi.fn(),
}));

import { useAuthPublicConfig } from "~/features/auth/hooks/use-auth-config";

test("Notion ボタンは常に見える", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { notionSignIn: false, signUpEnabled: true },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByRole, queryByText } = renderWithMantine(<LoginScreen />);
  expect(queryByText("Distinction 2000")).toBeNull();
  getByRole("button", { name: "Notion でログイン" }).click();
  expect(signInWithNotion).toHaveBeenCalledTimes(1);
});

test("アカウントログインの入力欄が見える", () => {
  vi.mocked(useAuthPublicConfig).mockReturnValue({
    data: { notionSignIn: false, signUpEnabled: false },
  } as ReturnType<typeof useAuthPublicConfig>);

  const { getByLabelText, getByRole } = renderWithMantine(<LoginScreen />);
  expect(getByLabelText("ユーザー名またはメールアドレス")).toBeDefined();
  expect(getByLabelText("パスワード")).toBeDefined();
  expect(getByRole("button", { name: "Notion でログイン" })).toBeDefined();
});
