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

vi.mock("~/features/history/components/history-month-tab", () => ({
  HistoryMonthTab: () => <div>月タブ</div>,
}));

test("履歴の見出し右に週次レビューへの導線がある", () => {
  const { getByRole } = renderWithMantine(<HistoryPage />);
  expect(getByRole("link", { name: "レビューを見る" })).toBeDefined();
  expect(getByRole("heading", { level: 1, name: "履歴" })).toBeDefined();
});

test("見出しの下はタブで、検索欄は置かない（検索はコマンドパレットに一本化）", () => {
  const { getByRole, getByText, queryByRole } = renderWithMantine(<HistoryPage />);
  expect(getByRole("tab", { name: "月" })).toBeDefined();
  expect(getByRole("tab", { name: "週" })).toBeDefined();
  expect(getByRole("tab", { name: "分析" })).toBeDefined();
  expect(getByText("月タブ")).toBeDefined();
  expect(queryByRole("searchbox")).toBeNull();
});
