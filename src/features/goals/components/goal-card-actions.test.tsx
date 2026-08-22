import { expect, test, vi } from "vite-plus/test";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { renderWithMantine } from "~/test-utils/render";

test("編集と削除ボタンがそれぞれハンドラを呼ぶ", () => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalCardActions goalName="Unit 1" onEdit={onEdit} onRemove={onRemove} />,
  );
  getByRole("button", { name: "Unit 1を編集" }).click();
  getByRole("button", { name: "Unit 1を削除" }).click();
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledOnce();
});
