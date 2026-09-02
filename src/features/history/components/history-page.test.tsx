import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { HistoryPage } from "~/features/history/components/history-page";
import { HISTORY_SEARCH_LABEL } from "~/features/history/components/history-search-input";
import { renderWithMantine } from "~/test-utils/render";

const { viewState } = vi.hoisted(() => ({ viewState: { searchQuery: "" } }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

vi.mock("~/features/history/hooks/use-history-view", () => ({
  useHistoryView: () => ({
    searchQuery: viewState.searchQuery,
    setQuery: vi.fn(),
    setTab: vi.fn(),
    tab: "month",
  }),
}));

vi.mock("~/features/history/components/history-month-tab", () => ({
  HistoryMonthTab: () => <div>月タブ</div>,
}));

vi.mock("~/features/history/components/history-search-results", () => ({
  HistorySearchResults: () => <div>検索結果の一覧</div>,
}));

beforeEach(() => {
  viewState.searchQuery = "";
});

test("履歴の見出し右に週次レビューへの導線がある", () => {
  const { getByRole } = renderWithMantine(<HistoryPage />);
  expect(getByRole("link", { name: "レビューを見る" })).toBeDefined();
  expect(getByRole("heading", { level: 1, name: "履歴" })).toBeDefined();
});

test("見出しの下に検索欄があり、検索語が無いあいだはタブが出る", () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(<HistoryPage />);
  expect(getByRole("searchbox", { name: HISTORY_SEARCH_LABEL })).toBeDefined();
  expect(getByRole("tab", { name: "月" })).toBeDefined();
  expect(getByText("月タブ")).toBeDefined();
  expect(queryByText("検索結果の一覧")).toBeNull();
});

test("検索語が2文字以上ならタブの代わりに検索結果を出す", () => {
  viewState.searchQuery = "音読";
  const { getByText, queryByRole } = renderWithMantine(<HistoryPage />);
  expect(getByText("検索結果の一覧")).toBeDefined();
  expect(queryByRole("tab", { name: "月" })).toBeNull();
});

test("1文字ではまだ検索せず、タブのまま", () => {
  viewState.searchQuery = "音";
  const { getByRole, queryByText } = renderWithMantine(<HistoryPage />);
  expect(getByRole("tab", { name: "月" })).toBeDefined();
  expect(queryByText("検索結果の一覧")).toBeNull();
});
