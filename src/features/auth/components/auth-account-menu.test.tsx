import { expect, test, vi } from "vite-plus/test";

import { AuthAccountMenu } from "~/features/auth/components/auth-account-menu";
import { useAppShellUser } from "~/hooks/use-auth-session";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/auth/lib/auth-actions", () => ({
  signOutAndReload: vi.fn(),
}));

vi.mock("~/hooks/use-auth-session", () => ({
  useAppShellUser: vi.fn(),
}));

vi.mock("~/hooks/use-avatar-display-url", () => ({
  useAvatarDisplayUrl: vi.fn(() => undefined),
}));

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
