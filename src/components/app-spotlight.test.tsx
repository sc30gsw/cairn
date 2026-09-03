import { spotlight } from "@mantine/spotlight";
import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { AppSpotlight, SpotlightTrigger } from "~/components/app-spotlight";
import { NAV } from "~/lib/app-nav";
import {
  SPOTLIGHT_HINT,
  SPOTLIGHT_LABEL,
  SPOTLIGHT_NOTHING_FOUND,
  SPOTLIGHT_PLACEHOLDER,
} from "~/lib/spotlight-copy";
import { renderWithMantine } from "~/test-utils/render";

const { navigate, searchState, useHistorySearch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  searchState: { hits: [] as Record<string, unknown>[] },
  useHistorySearch: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

//? デバウンスは実時間を待たずに素通しさせる。他の Mantine hooks は本物のまま
vi.mock("@mantine/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mantine/hooks")>()),
  useDebouncedValue: (value: unknown) => [value],
}));

vi.mock("~/hooks/history-search-queries", () => ({
  useHistorySearch: (...args: unknown[]) => {
    useHistorySearch(...args);
    return { data: { hits: searchState.hits, truncated: false } };
  },
}));

const HIT = {
  category: "インプット",
  dateJst: "2026-08-16",
  kind: "hitokoto",
  minutes: 30,
  rowId: "row-1",
  text: "金フレの音読を30分",
  title: "金のフレーズ",
};

function openPalette() {
  const view = renderWithMantine(
    <>
      <SpotlightTrigger />
      <AppSpotlight />
    </>,
  );
  fireEvent.click(view.getByRole("button", { name: SPOTLIGHT_LABEL }));
  return view;
}

function typeQuery(view: ReturnType<typeof renderWithMantine>, value: string) {
  fireEvent.change(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER), { target: { value } });
}

beforeEach(() => {
  navigate.mockClear();
  useHistorySearch.mockClear();
  searchState.hits = [];
});

afterEach(() => {
  spotlight.close();
});

test("トリガーを押すとパレットが開き、ナビの全項目が並ぶ", async () => {
  const view = openPalette();

  await waitFor(() => {
    expect(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER)).toBeDefined();
  });
  for (const entry of NAV) {
    expect(view.getByRole("button", { hidden: true, name: entry.label })).toBeDefined();
  }
  //? 語を入れるまで Convex には問い合わせない
  expect(useHistorySearch).not.toHaveBeenCalled();
});

test("語を入れるとナビが絞られ、選ぶとその画面へ移動する", async () => {
  const view = openPalette();
  await waitFor(() => {
    expect(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER)).toBeDefined();
  });

  typeQuery(view, "目標");

  await waitFor(() => {
    expect(view.queryByRole("button", { hidden: true, name: "ボード" })).toBeNull();
  });
  fireEvent.click(view.getByRole("button", { hidden: true, name: "目標" }));

  expect(navigate).toHaveBeenCalledWith({ to: "/goals" });
});

test("2文字以上なら全期間で記録を検索し、選ぶとその日のページへ移動する", async () => {
  searchState.hits = [HIT];
  const view = openPalette();
  await waitFor(() => {
    expect(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER)).toBeDefined();
  });

  typeQuery(view, "音読");

  await waitFor(() => {
    expect(view.getByText(HIT.title)).toBeDefined();
  });
  expect(useHistorySearch).toHaveBeenCalledWith("音読", undefined);
  expect(view.getByText(HIT.dateJst)).toBeDefined();

  fireEvent.click(view.getByText(HIT.title));

  expect(navigate).toHaveBeenCalledWith({
    params: { dateJst: HIT.dateJst },
    to: "/days/$dateJst",
  });
});

test("1文字ではまだ検索せず、文字数の助言を出す", async () => {
  const view = openPalette();
  await waitFor(() => {
    expect(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER)).toBeDefined();
  });

  typeQuery(view, "ゑ");

  await waitFor(() => {
    expect(view.getByText(SPOTLIGHT_HINT)).toBeDefined();
  });
  expect(useHistorySearch).not.toHaveBeenCalled();
});

test("ナビにも記録にも当たらなければ見つからない旨を出す", async () => {
  const view = openPalette();
  await waitFor(() => {
    expect(view.getByPlaceholderText(SPOTLIGHT_PLACEHOLDER)).toBeDefined();
  });

  typeQuery(view, "ゑゐ");

  await waitFor(() => {
    expect(view.getByText(SPOTLIGHT_NOTHING_FOUND)).toBeDefined();
  });
});
