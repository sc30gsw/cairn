import { expect, test, vi } from "vite-plus/test";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { renderWithMantine } from "~/test-utils/render";

test("カウントダウンと週間ゴールと障害プランが見える", () => {
  const { getByText, getByRole } = renderWithMantine(
    <GoalsBoard
      exam={{ daysRemaining: 43, examDate: "2026-09-27", maxScore: 850, minScore: 730 }}
      obstacles={[{ _id: "o1" as never, ifText: "眠い", thenText: "金フレだけ" }]}
      onCreateObstacle={vi.fn()}
      onRemoveObstacle={vi.fn()}
      onSaveExam={vi.fn()}
      onSaveWeekly={vi.fn()}
      onUpdateObstacle={vi.fn()}
      volumeMinutes={30}
      weeklyGoalMinutes={300}
    />,
  );
  expect(getByText(/2026-09-27/)).toBeDefined();
  expect(getByText(/730/)).toBeDefined();
  expect(getByText(/今週の学習量 30分/)).toBeDefined();
  expect(getByText(/もし 眠い なら 金フレだけ/)).toBeDefined();
  expect(getByRole("button", { name: "障害プランを追加" })).toBeDefined();
  expect(getByRole("button", { name: "眠いを保存" })).toBeDefined();
});
