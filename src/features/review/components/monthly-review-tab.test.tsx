import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { MonthlyReviewTab } from "~/features/review/components/monthly-review-tab";
import type { MonthlyReview } from "~/features/review/types/monthly-review";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

const { useMonthlyReviewMock, useReviewViewMock } = vi.hoisted(() => ({
  useMonthlyReviewMock: vi.fn(),
  useReviewViewMock: vi.fn(),
}));

vi.mock("~/features/review/hooks/use-review-view", () => ({
  useReviewView: useReviewViewMock,
}));

vi.mock("~/hooks/review-queries", () => ({
  useMonthlyReview: useMonthlyReviewMock,
}));

const YEAR_MONTH = "2026-08";
const TODAY_IN_MONTH = "2026-08-19";
const TODAY_AFTER_MONTH = "2026-09-10";

const DIGEST_TREND = [
  {
    bucketEnd: "2026-08-02",
    bucketStart: "2026-08-01",
    confirmedCount: 2,
    digestRate: 1,
    isPartial: true,
    plannedCount: 2,
  },
  {
    bucketEnd: "2026-08-09",
    bucketStart: "2026-08-03",
    confirmedCount: 8,
    digestRate: 0.8,
    isPartial: false,
    plannedCount: 10,
  },
  {
    bucketEnd: "2026-08-16",
    bucketStart: "2026-08-10",
    confirmedCount: 0,
    digestRate: 0,
    isPartial: false,
    plannedCount: 0,
  },
] satisfies MonthlyReview["digestTrend"];

const REVIEW = {
  activeDays: 18,
  byCategory: [
    { category: "TOEIC対策", categorySortOrder: 0, minutes: 620 },
    { category: "多聴", categorySortOrder: 1, minutes: 120 },
  ],
  confirmedMinutes: 1240,
  digest: {
    confirmedCount: 41,
    countedFrom: "2026-08-01",
    countedThrough: "2026-08-18",
    digestRate: 0.82,
    isPartial: true,
    leftoverCount: 5,
    ongoingCount: 2,
    plannedCount: 50,
    skippedCount: 2,
  },
  digestTrend: DIGEST_TREND,
  elapsedDays: 19,
  isCurrentMonth: true,
  monthEnd: "2026-08-31",
  monthStart: "2026-08-01",
  previousActiveDays: 15,
  previousByCategory: [
    { category: "TOEIC対策", categorySortOrder: 0, minutes: 540 },
    { category: "英会話", categorySortOrder: 2, minutes: 90 },
  ],
  previousConfirmedMinutes: 1080,
  previousYearMonth: "2026-07",
  skippedMinutes: 30,
  yearMonth: YEAR_MONTH,
} satisfies MonthlyReview;

function renderTab(review: MonthlyReview, today: string) {
  useReviewViewMock.mockReturnValue({
    setMonth: vi.fn(),
    tab: "monthly",
    today,
    yearMonth: review.yearMonth,
  });
  useMonthlyReviewMock.mockReturnValue({ data: review });
  return renderWithMantine(<MonthlyReviewTab />);
}

test("サマリー3枚に学習量・実施日・消化が数値で出る", () => {
  const { getByText } = renderTab(REVIEW, TODAY_IN_MONTH);
  expect(getByText("1240分")).toBeDefined();
  expect(getByText("18日")).toBeDefined();
  expect(getByText("82%")).toBeDefined();
  expect(getByText("1日平均 65分（19日）")).toBeDefined();
  expect(getByText("先月 1080分（+160分）")).toBeDefined();
  expect(getByText("先月 15日（+3日）")).toBeDefined();
  expect(getByText("41/50件")).toBeDefined();
  expect(getByText("今日は数えません")).toBeDefined();
});

test("前月に記録が無ければ前月比を数値で出さない", () => {
  const { getAllByText, queryByText } = renderTab(
    { ...REVIEW, previousActiveDays: 0, previousByCategory: [], previousConfirmedMinutes: 0 },
    TODAY_IN_MONTH,
  );
  expect(getAllByText("先月の記録はありません")).toHaveLength(2);
  expect(queryByText("先月 1080分（+160分）")).toBeNull();
});

test("消化推移の見出しと計算の注記が出る", () => {
  const { getByRole, getByText } = renderTab(REVIEW, TODAY_IN_MONTH);
  expect(getByRole("heading", { name: "月間の消化推移" })).toBeDefined();
  expect(getByText(/確定 ÷ 並んだ件数。今日の行は数えません。/)).toBeDefined();
  expect(getByText(/08\/01〜08\/02/)).toBeDefined();
});

test("数えられる週が1つも無い月は消化推移の空状態を出す", () => {
  const { getByText } = renderTab(
    { ...REVIEW, digestTrend: DIGEST_TREND.map((bucket) => ({ ...bucket, plannedCount: 0 })) },
    TODAY_IN_MONTH,
  );
  expect(getByText("この月に数えられる週がありません")).toBeDefined();
});

test("カテゴリ比較表に今月・先月・増減が併記される", () => {
  const { getAllByRole, getByRole, getByText } = renderTab(REVIEW, TODAY_AFTER_MONTH);
  expect(getByRole("heading", { name: "カテゴリ内訳の月比較" })).toBeDefined();
  expect(getByText("先月は 2026年7月。確定した記録の分数で比べます。")).toBeDefined();
  const rows = getAllByRole("row");
  expect(rows).toHaveLength(4);
  expect(rows[1]?.textContent).toContain("+80分（+15%）");
  expect(getByText("新規")).toBeDefined();
  expect(rows[3]?.textContent).toContain("英会話");
  expect(rows[3]?.textContent).toContain("先月のみ");
});

test("記録が無い月はカテゴリ比較の空状態を出す", () => {
  const { getByText } = renderTab(
    { ...REVIEW, byCategory: [], previousByCategory: [] },
    TODAY_IN_MONTH,
  );
  expect(getByText("比べられる記録がありません")).toBeDefined();
});

test("月の前後移動と履歴への導線を持つ", () => {
  const { getByRole, getByText, queryByRole } = renderTab(REVIEW, TODAY_IN_MONTH);
  expect(getByRole("button", { name: "前の月" })).toBeDefined();
  expect((getByRole("button", { name: "次の月" }) as HTMLButtonElement).disabled).toBe(true);
  expect(queryByRole("button", { name: "今月へ戻る" })).toBeNull();
  expect(getByText("2026年8月を履歴で掘る")).toBeDefined();
});

test("過去月を見ているときは次の月へ進めて今月へ戻れる", () => {
  const { getByRole } = renderTab(
    { ...REVIEW, isCurrentMonth: false, yearMonth: "2026-07" },
    TODAY_IN_MONTH,
  );
  expect(getByRole("button", { name: "今月へ戻る" })).toBeDefined();
  expect((getByRole("button", { name: "次の月" }) as HTMLButtonElement).disabled).toBe(false);
});
