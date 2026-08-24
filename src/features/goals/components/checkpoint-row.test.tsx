import { expect, test, vi } from "vite-plus/test";

import { CheckpointRow, OVERDUE_LABEL } from "~/features/goals/components/checkpoint-row";
import type { MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const CHECKPOINT = {
  _id: "goal-checkpoint" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  createdAt: 1_755_000_000_000,
  criterion: "Unit 1-10 を止まらずに音読できる",
  deadline: "2026-08-23",
  parentGoalId: "goal-exam" as MasteryGoal["_id"],
  type: "mastery",
} satisfies MasteryGoal;

const OVERDUE_CHECKPOINT = {
  ...CHECKPOINT,
  _id: "goal-overdue" as MasteryGoal["_id"],
  deadline: "2026-08-10",
} satisfies MasteryGoal;

function rowProps(goal: MasteryGoal) {
  return {
    goal,
    isLast: true,
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onSetAchieved: vi.fn(),
    todayJst: TODAY,
  };
}

test("期限・残り日数・基準・学習量の実績を1行に出す", () => {
  const { getByText } = renderWithMantine(<CheckpointRow {...rowProps(CHECKPOINT)} />);
  expect(getByText(/期限 2026-08-23（あと6日）/)).toBeDefined();
  expect(getByText("基準: Unit 1-10 を止まらずに音読できる")).toBeDefined();
  expect(getByText("確定 180分 / 4日")).toBeDefined();
});

test("期限超過はバッジを出し、残り日数を出さない", () => {
  const { getByText, queryByText } = renderWithMantine(
    <CheckpointRow {...rowProps(OVERDUE_CHECKPOINT)} />,
  );
  expect(getByText(OVERDUE_LABEL)).toBeDefined();
  expect(queryByText(/あと/)).toBeNull();
});

test("期限を先に延ばすと超過バッジが消える(再描画)", () => {
  const view = renderWithMantine(<CheckpointRow {...rowProps(OVERDUE_CHECKPOINT)} />);
  expect(view.getByText(OVERDUE_LABEL)).toBeDefined();

  view.rerender(<CheckpointRow {...rowProps(CHECKPOINT)} />);

  expect(view.queryByText(OVERDUE_LABEL)).toBeNull();
  expect(view.getByText(/期限 2026-08-23（あと6日）/)).toBeDefined();
});

test("達成済みなら期限超過バッジを出さない", () => {
  const { queryByText } = renderWithMantine(
    <CheckpointRow {...rowProps({ ...OVERDUE_CHECKPOINT, achievedAt: "2026-08-09" })} />,
  );
  expect(queryByText(OVERDUE_LABEL)).toBeNull();
});

test("達成チェックと編集・削除のアクションが呼ばれる", () => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointRow
      {...rowProps(CHECKPOINT)}
      onEdit={onEdit}
      onRemove={onRemove}
      onSetAchieved={onSetAchieved}
    />,
  );
  getByRole("checkbox", { name: `${CHECKPOINT.content}の達成` }).click();
  getByRole("button", { name: `${CHECKPOINT.content}を編集` }).click();
  getByRole("button", { name: `${CHECKPOINT.content}を削除` }).click();

  expect(onSetAchieved).toHaveBeenCalledWith({ achievedAt: TODAY, goalId: CHECKPOINT._id });
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledOnce();
});
