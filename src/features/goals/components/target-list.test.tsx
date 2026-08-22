import { expect, test, vi } from "vite-plus/test";

import { TargetList } from "~/features/goals/components/target-list";
import type { TargetProgress } from "~/features/goals/types/target";
import { renderWithMantine } from "~/test-utils/render";
import type { CategoryDto } from "~/types/category";

const ACHIEVED_TARGET = {
  _id: "target-input" as TargetProgress["_id"],
  achieved: true,
  categoryId: "category-input" as CategoryDto["_id"],
  categoryName: "インプット",
  current: 180,
  metric: "minutes",
  targetValue: 120,
} satisfies TargetProgress;

const ZERO_TARGET = {
  _id: "target-zero" as TargetProgress["_id"],
  achieved: false,
  categoryId: "category-output" as CategoryDto["_id"],
  categoryName: "アウトプット",
  current: 5,
  metric: "days",
  targetValue: 0,
} satisfies TargetProgress;

const MISSED_TARGET = {
  _id: "target-output" as TargetProgress["_id"],
  achieved: false,
  categoryId: "category-output" as CategoryDto["_id"],
  categoryName: "アウトプット",
  current: 2,
  metric: "days",
  targetValue: 4,
} satisfies TargetProgress;

const OVER_ACHIEVED_TARGET = {
  _id: "target-over" as TargetProgress["_id"],
  achieved: true,
  categoryId: "category-input" as CategoryDto["_id"],
  categoryName: "インプット",
  current: 200,
  metric: "minutes",
  targetValue: 120,
} satisfies TargetProgress;

test("未達成ターゲットはオレンジ進捗で達成チェックが出ない", () => {
  const { getByText, queryByText, getByRole } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[MISSED_TARGET]} />,
  );
  expect(getByText("2 / 4 日（50%）")).toBeDefined();
  expect(queryByText("アウトプットは達成")).toBeNull();
  expect(getByRole("progressbar", { name: "アウトプットの進捗" })).toBeDefined();
});

test("達成済みでも進捗率は100%で頭打ちになる", () => {
  const { getByText } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[OVER_ACHIEVED_TARGET]} />,
  );
  expect(getByText("200 / 120 分（100%）")).toBeDefined();
});

test("達成済みターゲットは緑の進捗と達成表示になる", () => {
  const { getByText, getByRole } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[ACHIEVED_TARGET]} />,
  );
  expect(getByText("インプットは達成")).toBeDefined();
  expect(getByRole("progressbar", { name: "インプットの進捗" })).toBeDefined();
});

test("目標値が0のとき進捗は0%として表示する", () => {
  const { getByText } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[ZERO_TARGET]} />,
  );
  expect(getByText("5 / 0 日（0%）")).toBeDefined();
});

test("削除ボタンで onRemove が呼ばれる", () => {
  const onRemove = vi.fn();
  const { getByRole } = renderWithMantine(
    <TargetList onRemove={onRemove} targets={[ACHIEVED_TARGET]} />,
  );
  getByRole("button", { name: "インプットのターゲットを削除" }).click();
  expect(onRemove).toHaveBeenCalledWith(ACHIEVED_TARGET._id);
});

const COUNT_TARGET = {
  _id: "target-count" as TargetProgress["_id"],
  achieved: false,
  categoryId: "category-input" as CategoryDto["_id"],
  categoryName: "インプット",
  current: 1,
  metric: "count",
  targetValue: 3,
} satisfies TargetProgress;

test("件数メトリックのラベルと進捗が表示される", () => {
  const { getByText } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[COUNT_TARGET]} />,
  );
  expect(getByText("件数")).toBeDefined();
  expect(getByText("1 / 3 件（33%）")).toBeDefined();
});

test("ターゲットが空なら行を描画しない", () => {
  const { queryByRole } = renderWithMantine(<TargetList onRemove={vi.fn()} targets={[]} />);
  expect(queryByRole("progressbar")).toBeNull();
});

test("複数ターゲットを一覧表示する", () => {
  const { getByText } = renderWithMantine(
    <TargetList onRemove={vi.fn()} targets={[ACHIEVED_TARGET, MISSED_TARGET]} />,
  );
  expect(getByText("180 / 120 分（100%）")).toBeDefined();
  expect(getByText("2 / 4 日（50%）")).toBeDefined();
});
