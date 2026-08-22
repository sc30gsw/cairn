import { expect, test, vi } from "vite-plus/test";

import { AuthAccountMenu } from "~/features/auth/components/auth-account-menu";
import { userLabel } from "~/lib/user-label";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/auth/lib/auth-actions", () => ({
  signInWithAccount: vi.fn(),
  signInWithNotion: vi.fn(),
  signOutAndReload: vi.fn(),
  signUpWithAccount: vi.fn(),
}));

vi.mock("~/features/auth/hooks/use-auth-session", () => ({
  useAppShellUser: vi.fn(),
}));

import { useAppShellUser } from "~/features/auth/hooks/use-auth-session";

test("userLabel は表示名を優先する", () => {
  expect(
    userLabel({
      email: "owner@example.com",
      image: null,
      name: "Owner",
    }),
  ).toBe("Owner");
});

test("ログイン中ならアカウントメニューが見える", () => {
  vi.mocked(useAppShellUser).mockReturnValue({
    email: "owner@example.com",
    image: null,
    name: "Owner",
    username: "owner",
  });

  const { getByLabelText } = renderWithMantine(<AuthAccountMenu />);
  expect(getByLabelText("アカウントメニュー")).toBeDefined();
});

test("未ログインなら何も描画しない", () => {
  vi.mocked(useAppShellUser).mockReturnValue(null);
  const { queryByLabelText } = renderWithMantine(<AuthAccountMenu />);
  expect(queryByLabelText("アカウントメニュー")).toBeNull();
});
