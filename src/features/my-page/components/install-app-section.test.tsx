import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { InstallAppSection } from "~/features/my-page/components/install-app-section";
import { renderWithMantine } from "~/test-utils/render";

function setDisplayMode(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: standalone && query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }),
    writable: true,
  });
}

test("standalone 起動中なら「起動中」バッジと、オフラインの断りを出す", () => {
  setDisplayMode(true);
  const { getByText } = renderWithMantine(<InstallAppSection />);

  expect(getByText("ホーム画面アプリとして起動中")).toBeDefined();
  expect(getByText(/オフラインでは記録できません/)).toBeDefined();
});

test("beforeinstallprompt を捕まえるとボタンが出て、押すと prompt() が呼ばれる", async () => {
  setDisplayMode(false);
  const { getByRole, getByText, queryByRole } = renderWithMantine(<InstallAppSection />);

  //? 自動では出さない(ナグ禁止)。イベントを捕まえるまではボタンが無い。
  expect(queryByRole("button", { name: "ホーム画面に追加" })).toBeNull();
  expect(getByText("「ホーム画面に追加」を選ぶ")).toBeDefined();

  const prompt = vi.fn(async () => undefined);
  const event = Object.assign(new Event("beforeinstallprompt"), { prompt });
  window.dispatchEvent(event);

  const button = await waitFor(() => getByRole("button", { name: "ホーム画面に追加" }));
  fireEvent.click(button);

  expect(prompt).toHaveBeenCalledTimes(1);
});
