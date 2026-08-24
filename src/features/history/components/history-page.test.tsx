import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { HistoryPage } from "~/features/history/components/history-page";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

vi.mock("~/features/history/hooks/use-history-view", () => ({
  useHistoryView: () => ({ setTab: vi.fn(), tab: "month" }),
}));

//? タブ本体は Convex 購読を持つので、外枠(見出し + タブ + 導線)だけを見る
vi.mock("~/features/history/components/history-month-tab", () => ({
  HistoryMonthTab: () => <div>月タブ</div>,
}));

test("履歴の見出し右に週次レビューへの導線がある", () => {
  const { getByRole } = renderWithMantine(<HistoryPage />);
  expect(getByRole("link", { name: "レビューを見る" })).toBeDefined();
  expect(getByRole("heading", { level: 1, name: "履歴" })).toBeDefined();
});
