import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { WeeklyReviewTab } from "~/features/review/components/weekly-review-tab";
import type { WeeklyReview } from "~/features/review/types/weekly-review";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

const { useReviewViewMock, useWeeklyReviewMock } = vi.hoisted(() => ({
  useReviewViewMock: vi.fn(),
  useWeeklyReviewMock: vi.fn(),
}));

vi.mock("~/features/review/hooks/use-review-view", () => ({
  useReviewView: useReviewViewMock,
}));

vi.mock("~/hooks/review-queries", () => ({
  useWeeklyReview: useWeeklyReviewMock,
}));

const WEEK_START = "2026-08-17";
const WEEK_END = "2026-08-23";
const TODAY_IN_WEEK = "2026-08-20";
const TODAY_AFTER_WEEK = "2026-08-31";

const ACHIEVED_TARGET = {
  _id: "target-toeic" as NonNullable<WeeklyReview["targets"]>[number]["_id"],
  achieved: true,
  categoryId: "category-toeic" as NonNullable<WeeklyReview["targets"]>[number]["categoryId"],
  categoryName: "TOEIC対策",
  current: 300,
  metric: "minutes" as const,
  targetValue: 300,
};

const MISSED_TARGET = {
  _id: "target-listening" as NonNullable<WeeklyReview["targets"]>[number]["_id"],
  achieved: false,
  categoryId: "category-listening" as NonNullable<WeeklyReview["targets"]>[number]["categoryId"],
  categoryName: "多聴",
  current: 3,
  metric: "days" as const,
  targetValue: 5,
};

const BY_DAY = [
  {
    condition: "好調" as const,
    confirmedCount: 4,
    confirmedMinutes: 120,
    dateJst: WEEK_START,
    digestRate: 0.8,
    kind: "live" as const,
    plannedCount: 5,
    skippedCount: 1,
  },
  {
    condition: null,
    confirmedCount: 0,
    confirmedMinutes: 0,
    dateJst: "2026-08-18",
    digestRate: null,
    kind: "rest" as const,
    plannedCount: 0,
    skippedCount: 0,
  },
  {
    condition: "好調" as const,
    confirmedCount: 5,
    confirmedMinutes: 140,
    dateJst: "2026-08-19",
    digestRate: 1,
    kind: "live" as const,
    plannedCount: 5,
    skippedCount: 0,
  },
  {
    condition: "普通" as const,
    confirmedCount: 1,
    confirmedMinutes: 60,
    dateJst: TODAY_IN_WEEK,
    digestRate: null,
    kind: "live" as const,
    plannedCount: 2,
    skippedCount: 0,
  },
  {
    condition: null,
    confirmedCount: 0,
    confirmedMinutes: 0,
    dateJst: "2026-08-21",
    digestRate: null,
    kind: "unrecorded" as const,
    plannedCount: 0,
    skippedCount: 0,
  },
  {
    condition: null,
    confirmedCount: 0,
    confirmedMinutes: 0,
    dateJst: "2026-08-22",
    digestRate: null,
    kind: "unrecorded" as const,
    plannedCount: 0,
    skippedCount: 0,
  },
  {
    condition: null,
    confirmedCount: 0,
    confirmedMinutes: 0,
    dateJst: WEEK_END,
    digestRate: null,
    kind: "unrecorded" as const,
    plannedCount: 0,
    skippedCount: 0,
  },
] satisfies WeeklyReview["byDay"];

const CURRENT_WEEK_REVIEW = {
  activeDays: 3,
  byDay: BY_DAY,
  confirmedMinutes: 320,
  digest: {
    confirmedCount: 9,
    countedFrom: WEEK_START,
    countedThrough: "2026-08-19",
    digestRate: 0.9,
    isPartial: true,
    leftoverCount: 1,
    ongoingCount: 0,
    plannedCount: 10,
    skippedCount: 0,
  },
  elapsedDays: 4,
  isCurrentWeek: true,
  previousActiveDays: 4,
  previousConfirmedMinutes: 540,
  previousWeekStart: "2026-08-10",
  shareMarkdown: "週次まとめ 2026-08-17〜2026-08-23（学習量 320分 / 実施 3日）\n- TOEIC対策 320分",
  skippedMinutes: 0,
  targets: [ACHIEVED_TARGET, MISSED_TARGET],
  weekEnd: WEEK_END,
  weekStart: WEEK_START,
} satisfies WeeklyReview;

function renderTab(review: WeeklyReview, today: string) {
  useReviewViewMock.mockReturnValue({
    currentWeekStart: review.isCurrentWeek ? WEEK_START : "2026-08-31",
    setWeek: vi.fn(),
    tab: "weekly",
    today,
    weekStart: WEEK_START,
    yearMonth: today.slice(0, 7),
  });
  useWeeklyReviewMock.mockReturnValue({ data: review });
  return renderWithMantine(<WeeklyReviewTab />);
}

test("サマリー3枚に学習量・実施日・消化が数値で出る", () => {
  const { getByText } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  expect(getByText("320分")).toBeDefined();
  expect(getByText("3日")).toBeDefined();
  expect(getByText("90%")).toBeDefined();
  expect(getByText("1日平均 80分（4日）")).toBeDefined();
  expect(getByText("先週 540分（-220分）")).toBeDefined();
  expect(getByText("9/10件")).toBeDefined();
  expect(getByText(/08\/17〜08\/19\s*を数えました（今日は数えません）/)).toBeDefined();
});

test("今週なら週間ターゲットの達成状況が出る", () => {
  const { getByRole, getByText } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  expect(getByText("1/2 達成")).toBeDefined();
  expect(getByText("300 / 300 分（100%）")).toBeDefined();
  expect(getByText("3 / 5 日（60%）")).toBeDefined();
  expect(getByRole("progressbar", { name: "TOEIC対策の進捗" })).toBeDefined();
});

test("達成行は色だけに頼らずアイコン・読み上げ文言・100%を持つ", () => {
  const { getByText } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  expect(getByText("TOEIC対策は達成")).toBeDefined();
  expect(getByText("300 / 300 分（100%）")).toBeDefined();
});

test("過去週はターゲットの数値を1つも描かず、今週だけの計器だと伝える", () => {
  const { queryByRole, queryByText, getByText } = renderTab(
    { ...CURRENT_WEEK_REVIEW, isCurrentWeek: false, targets: null },
    TODAY_AFTER_WEEK,
  );
  expect(getByText("週間ターゲットは今週だけの計器です")).toBeDefined();
  expect(queryByText("1/2 達成")).toBeNull();
  expect(queryByText("300 / 300 分（100%）")).toBeNull();
  expect(queryByRole("progressbar", { name: "TOEIC対策の進捗" })).toBeNull();
});

test("週の表は7行で、休養日と今日の消化を書き分ける", () => {
  const { getAllByRole, getByText } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  //? 見出し行 + 7日
  expect(getAllByRole("row")).toHaveLength(8);
  expect(getByText("休養")).toBeDefined();
  expect(getByText("—（今日）")).toBeDefined();
  expect(getByText("4/5（80%）")).toBeDefined();
  expect(getByText("今日")).toBeDefined();
  expect(getAllByRole("row")[1]?.textContent).toContain("120分");
});

test("週版共有文が読み取り専用で出てコピーできる", () => {
  const { getByRole } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  const textarea = getByRole("textbox", { name: "共有文（週）" });
  expect((textarea as HTMLTextAreaElement).value).toContain("週次まとめ 2026-08-17〜2026-08-23");
  expect(getByRole("button", { name: "共有文をコピー" })).toBeDefined();
});

test("確定が0件の週は共有文の空状態を出す", () => {
  const { getByText, queryByRole } = renderTab(
    { ...CURRENT_WEEK_REVIEW, shareMarkdown: "" },
    TODAY_IN_WEEK,
  );
  expect(getByText("この週に確定した記録がありません。")).toBeDefined();
  expect(queryByRole("textbox", { name: "共有文（週）" })).toBeNull();
});

test("履歴と日ページへの導線を持つ", () => {
  const { getByText } = renderTab(CURRENT_WEEK_REVIEW, TODAY_IN_WEEK);
  expect(getByText("この週を履歴で掘る")).toBeDefined();
  expect(getByText(/を編集/)).toBeDefined();
});
