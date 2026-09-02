import { fireEvent } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  HISTORY_SEARCH_CLEAR_LABEL,
  HISTORY_SEARCH_LABEL,
  HISTORY_SEARCH_TOO_SHORT_HINT,
  HistorySearchInput,
} from "~/features/history/components/history-search-input";
import { renderWithMantine } from "~/test-utils/render";

const { setQuery, viewState } = vi.hoisted(() => ({
  setQuery: vi.fn(),
  viewState: { searchQuery: "" },
}));

vi.mock("~/features/history/hooks/use-history-view", () => ({
  useHistoryView: () => ({ searchQuery: viewState.searchQuery, setQuery }),
}));

beforeEach(() => {
  setQuery.mockClear();
  viewState.searchQuery = "";
});

test("入力するたびに検索語をそのまま渡す", () => {
  const { getByRole } = renderWithMantine(<HistorySearchInput />);
  fireEvent.change(getByRole("searchbox", { name: HISTORY_SEARCH_LABEL }), {
    target: { value: "音" },
  });
  expect(setQuery).toHaveBeenCalledWith("音");
});

test("1文字のときは2文字以上で検索する旨を添え、消すボタンで空にできる", () => {
  viewState.searchQuery = "音";
  const { getByRole, getByText } = renderWithMantine(<HistorySearchInput />);
  expect(getByText(HISTORY_SEARCH_TOO_SHORT_HINT)).toBeDefined();
  getByRole("button", { name: HISTORY_SEARCH_CLEAR_LABEL }).click();
  expect(setQuery).toHaveBeenCalledWith("");
});

test("2文字以上なら助言は出ない。空なら消すボタンも出ない", () => {
  viewState.searchQuery = "音読";
  const view = renderWithMantine(<HistorySearchInput />);
  expect(view.queryByText(HISTORY_SEARCH_TOO_SHORT_HINT)).toBeNull();
  expect(view.getByRole("button", { name: HISTORY_SEARCH_CLEAR_LABEL })).toBeDefined();

  viewState.searchQuery = "";
  view.rerender(<HistorySearchInput />);
  expect(view.queryByRole("button", { name: HISTORY_SEARCH_CLEAR_LABEL })).toBeNull();
});
