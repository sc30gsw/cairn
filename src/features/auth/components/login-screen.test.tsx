import { expect, test, vi } from "vite-plus/test";

import { LoginScreen } from "~/features/auth/components/login-screen";
import { renderWithMantine } from "~/test-utils/render";

test("未ログインなら記録ではなくログインボタンが見える", () => {
  const onSignIn = vi.fn();
  const { getByRole, queryByText } = renderWithMantine(<LoginScreen onSignIn={onSignIn} />);
  expect(queryByText("Distinction 2000")).toBeNull();
  getByRole("button", { name: "Notion でログイン" }).click();
  expect(onSignIn).toHaveBeenCalledTimes(1);
});
