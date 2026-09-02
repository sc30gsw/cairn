import { within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  HistorySearchResults,
  SEARCH_EMPTY_TITLE,
  SEARCH_KIND_LABELS,
  SEARCH_RANGE_LABEL,
  SEARCH_RESULTS_LABEL,
  SEARCH_TRUNCATED_MESSAGE,
} from "~/features/history/components/history-search-results";
import { SEARCH_RANGE_LABELS } from "~/features/history/lib/search-range";
import type { HistorySearchResult } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

const { searchState, setRange, useHistorySearch } = vi.hoisted(() => ({
  searchState: {
    data: { hits: [], truncated: false } as HistorySearchResult,
    lastArgs: [] as unknown[],
  },
  setRange: vi.fn(),
  useHistorySearch: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params }: { children: ReactNode; params: Record<"dateJst", string> }) => (
    <a href={`/days/${params.dateJst}`}>{children}</a>
  ),
}));

vi.mock("~/features/history/hooks/use-history-view", () => ({
  useHistoryView: () => ({
    searchQuery: "音読",
    searchRange: "year",
    setRange,
    today: "2026-09-02",
  }),
}));

vi.mock("~/features/history/hooks/history-queries", () => ({
  useHistorySearch: (...args: unknown[]) => {
    useHistorySearch(...args);
    return { data: searchState.data };
  },
}));

const HITS = [
  {
    category: "インプット",
    dateJst: "2026-08-16",
    kind: "hitokoto",
    minutes: 30,
    rowId: "row-1" as NonNullable<HistorySearchResult["hits"][number]["rowId"]>,
    text: "金フレの音読を30分",
    title: "金のフレーズ",
  },
  {
    dateJst: "2026-08-15",
    kind: "memo",
    text: "朝の音読が続いている",
    title: "メモ",
  },
] satisfies HistorySearchResult["hits"];

beforeEach(() => {
  setRange.mockClear();
  useHistorySearch.mockClear();
  searchState.data = { hits: [], truncated: false };
});

test("一致した文を日付リンク・種別・項目名つきで新しい順に並べ、一致箇所を強調する", () => {
  searchState.data = { hits: HITS, truncated: false };
  const { getByRole, getAllByRole } = renderWithMantine(<HistorySearchResults />);

  expect(useHistorySearch).toHaveBeenCalledWith("音読", "2025-09-01");
  const list = within(getByRole("list", { name: SEARCH_RESULTS_LABEL }));
  const rows = list.getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByRole("link", { name: "2026-08-16" }).getAttribute("href")).toBe(
    "/days/2026-08-16",
  );
  expect(within(rows[0]!).getByText(SEARCH_KIND_LABELS.hitokoto)).toBeDefined();
  expect(within(rows[0]!).getByText("金のフレーズ")).toBeDefined();
  expect(within(rows[1]!).getByText(SEARCH_KIND_LABELS.memo)).toBeDefined();
  const marks = getAllByRole("mark");
  expect(marks.map((mark) => mark.textContent)).toEqual(["音読", "音読"]);
});

test("見つからなければ空状態を出す", () => {
  const { getByText } = renderWithMantine(<HistorySearchResults />);
  expect(getByText(SEARCH_EMPTY_TITLE)).toBeDefined();
});

test("上限を超えたら絞る助言を出す", () => {
  searchState.data = { hits: HITS, truncated: true };
  const { getByText } = renderWithMantine(<HistorySearchResults />);
  expect(getByText(SEARCH_TRUNCATED_MESSAGE)).toBeDefined();
  expect(getByText(/件以上/)).toBeDefined();
});

test("検索範囲を全期間に切り替えると setRange が呼ばれる", () => {
  const { getByRole } = renderWithMantine(<HistorySearchResults />);
  const control = getByRole("radiogroup", { name: SEARCH_RANGE_LABEL });
  within(control).getByRole("radio", { name: SEARCH_RANGE_LABELS.all }).click();
  expect(setRange).toHaveBeenCalledWith("all");
});
