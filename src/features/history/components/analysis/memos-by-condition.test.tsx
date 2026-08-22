import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { MemosByCondition } from "~/features/history/components/analysis/memos-by-condition";
import type { HeatmapDay } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/days/rest">{children}</a>,
}));

function day(dateJst: string, overrides: Partial<HeatmapDay> = {}): HeatmapDay {
  return {
    condition: null,
    dateJst,
    isRest: false,
    memo: null,
    minutes: 0,
    movingAverage: 0,
    ...overrides,
  };
}

test("MemosByCondition はコンディション別にメモ行を出し確定分数を載せる", () => {
  const { getByText } = renderWithMantine(
    <MemosByCondition
      days={[
        day("2026-08-15", { condition: "普通", memo: "普通日", minutes: 20 }),
        day("2026-08-17", { condition: "好調", memo: "好調日", minutes: 30 }),
        day("2026-08-16", { memo: "メモだけ" }),
      ]}
    />,
  );

  expect(getByText("好調日")).toBeDefined();
  expect(getByText("普通日")).toBeDefined();
  expect(getByText("メモだけ")).toBeDefined();
  expect(getByText("確定 30分")).toBeDefined();
  expect(getByText("確定 20分")).toBeDefined();
});

test("MemosByCondition はメモがなければ空状態を出す", () => {
  const { getByText } = renderWithMantine(
    <MemosByCondition days={[day("2026-08-17", { condition: "好調", minutes: 30 })]} />,
  );

  expect(getByText("この範囲にメモはありません。")).toBeDefined();
});
