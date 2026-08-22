import { expect, test, vi } from "vite-plus/test";

import { MasteryGoalCard, OVERDUE_LABEL } from "~/features/goals/components/mastery-goal-card";
import type { MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const OPEN_MASTERY = {
  _id: "goal-open" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 2,
  confirmedMinutes: 90,
  content: "Distinction の例文を口頭で言い切る",
  criterion: "3秒以内に例文を口に出せる",
  deadline: undefined,
  type: "mastery",
} satisfies MasteryGoal;

const CHECKPOINT = {
  _id: "goal-checkpoint" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  criterion: "Unit 1-10 を止まらずに音読できる",
  deadline: "2026-08-23",
  type: "mastery",
} satisfies MasteryGoal;

const OVERDUE_CHECKPOINT = {
  ...CHECKPOINT,
  _id: "goal-overdue" as MasteryGoal["_id"],
  deadline: "2026-08-10",
} satisfies MasteryGoal;

const ACHIEVED_CHECKPOINT = {
  ...CHECKPOINT,
  _id: "goal-achieved" as MasteryGoal["_id"],
  achievedAt: "2026-08-09",
} satisfies MasteryGoal;

function cardProps(goal: MasteryGoal) {
  return {
    goal,
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onSetAchieved: vi.fn(),
    todayJst: TODAY,
  };
}

test("達成済みのチェックを外すと達成日を落として呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalCard {...cardProps(ACHIEVED_CHECKPOINT)} onSetAchieved={onSetAchieved} />,
  );
  getByRole("checkbox", { name: `${ACHIEVED_CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED_CHECKPOINT._id,
  });
});

test("編集と削除のアクションが呼ばれる", () => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalCard {...cardProps(CHECKPOINT)} onEdit={onEdit} onRemove={onRemove} />,
  );
  getByRole("button", { name: `${CHECKPOINT.content}を編集` }).click();
  getByRole("button", { name: `${CHECKPOINT.content}を削除` }).click();
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledOnce();
});

test("期限なしの習得は期限なしと表示する", () => {
  const { getByText } = renderWithMantine(<MasteryGoalCard {...cardProps(OPEN_MASTERY)} />);
  expect(getByText("期限なし")).toBeDefined();
  expect(getByText("習得")).toBeDefined();
});

test("チェックポイントは残り日数つきで期限を表示する", () => {
  const { getByText } = renderWithMantine(<MasteryGoalCard {...cardProps(CHECKPOINT)} />);
  expect(getByText("チェックポイント")).toBeDefined();
  expect(getByText(/期限 2026-08-23（あと 6 日）/)).toBeDefined();
});

test("期限超過のチェックポイントはバッジを出す", () => {
  const { getByText } = renderWithMantine(<MasteryGoalCard {...cardProps(OVERDUE_CHECKPOINT)} />);
  expect(getByText(OVERDUE_LABEL)).toBeDefined();
  expect(getByText(/期限 2026-08-10/)).toBeDefined();
});

test("達成済みは達成日と学習量を表示する", () => {
  const { getByText } = renderWithMantine(<MasteryGoalCard {...cardProps(ACHIEVED_CHECKPOINT)} />);
  expect(getByText("達成 2026-08-09")).toBeDefined();
  expect(getByText("確定 180分 / 4日")).toBeDefined();
});

test("達成済みで期限超過でも overdue バッジは出ない", () => {
  const pastDeadlineAchieved = {
    ...ACHIEVED_CHECKPOINT,
    deadline: "2026-08-01",
  } satisfies MasteryGoal;
  const { queryByText, getByText } = renderWithMantine(
    <MasteryGoalCard {...cardProps(pastDeadlineAchieved)} />,
  );
  expect(queryByText(OVERDUE_LABEL)).toBeNull();
  expect(getByText("達成 2026-08-09")).toBeDefined();
});

test("期限を過ぎた未達成チェックポイントは残り日数を出さない", () => {
  const { getByText, queryByText } = renderWithMantine(
    <MasteryGoalCard {...cardProps(OVERDUE_CHECKPOINT)} />,
  );
  expect(getByText(/期限 2026-08-10/)).toBeDefined();
  expect(queryByText(/あと/)).toBeNull();
});

test("達成チェックで onSetAchieved が今日の日付つきで呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryGoalCard {...cardProps(CHECKPOINT)} onSetAchieved={onSetAchieved} />,
  );
  getByRole("checkbox", { name: `${CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: TODAY,
    goalId: CHECKPOINT._id,
  });
});
