import { fireEvent, waitFor } from "@testing-library/react";
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

test("障害プランを追加したら入力が空に戻る", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalsBoard
      exam={{ daysRemaining: 43, examDate: "2026-09-27", maxScore: 850, minScore: 730 }}
      obstacles={[]}
      onCreateObstacle={onCreateObstacle}
      onRemoveObstacle={vi.fn()}
      onSaveExam={vi.fn()}
      onSaveWeekly={vi.fn()}
      onUpdateObstacle={vi.fn()}
      volumeMinutes={30}
      weeklyGoalMinutes={300}
    />,
  );
  const ifInput = getByRole("textbox", { name: "もし" }) as HTMLInputElement;
  const thenInput = getByRole("textbox", { name: "なら" }) as HTMLInputElement;
  fireEvent.change(ifInput, { target: { value: "眠い" } });
  fireEvent.change(thenInput, { target: { value: "金フレだけ" } });
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).toHaveBeenCalledWith({
      ifText: "眠い",
      thenText: "金フレだけ",
    });
  });
  expect(ifInput.value).toBe("");
  expect(thenInput.value).toBe("");
});
