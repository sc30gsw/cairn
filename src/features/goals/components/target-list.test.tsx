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
