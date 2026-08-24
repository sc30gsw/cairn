import { within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import {
  CHECKPOINT_GROUP_EMPTY_MESSAGE,
  ParentGoalGroup,
} from "~/features/goals/components/parent-goal-group";
import type { ExamGoal, MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const EXAM_GOAL = {
  _id: "goal-exam" as ExamGoal["_id"],
  content: "TOEIC で900点を取る",
  createdAt: 1_755_000_000_000,
  examDate: "2026-11-15",
  maxScore: 900,
  minScore: 850,
  type: "exam",
} satisfies ExamGoal;

const LONG_TERM_GOAL = {
  _id: "goal-long-term" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 2,
  confirmedMinutes: 90,
  content: "Distinction の例文を口頭で言い切る",
  createdAt: 1_755_000_100_000,
  criterion: "3秒以内に例文を口に出せる",
  deadline: undefined,
  parentGoalId: undefined,
  type: "mastery",
} satisfies MasteryGoal;

const CHECKPOINT = {
  _id: "goal-checkpoint" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Chapter 1-3 を暗唱する",
  createdAt: 1_755_000_200_000,
  criterion: "例文を見ずに言える",
  deadline: "2026-09-06",
  parentGoalId: LONG_TERM_GOAL._id,
  type: "mastery",
} satisfies MasteryGoal;

function commonProps() {
  return {
    checkpoints: [],
    form: undefined,
    onAddCheckpoint: vi.fn(),
    onEditGoal: vi.fn(),
    onRemoveGoal: vi.fn(),
    onSetAchieved: vi.fn(),
    todayJst: TODAY,
  };
}

test("本番目標の親カードは本番目標の本体と子グループを持つ", () => {
  const { getByRole, getByText } = renderWithMantine(
    <ParentGoalGroup
      {...commonProps()}
      hasWeeklyTargets
      kind="exam"
      onShowWeeklyTargets={vi.fn()}
      parent={EXAM_GOAL}
    />,
  );
  expect(getByText(EXAM_GOAL.content)).toBeDefined();
  expect(getByRole("region", { name: `${EXAM_GOAL.content}のチェックポイント` })).toBeDefined();
  expect(getByText(CHECKPOINT_GROUP_EMPTY_MESSAGE)).toBeDefined();
});

test("長期目標の親カードは子を行として並べ、件数を出す", () => {
  const { getByRole } = renderWithMantine(
    <ParentGoalGroup
      {...commonProps()}
      checkpoints={[CHECKPOINT]}
      kind="longTerm"
      parent={LONG_TERM_GOAL}
    />,
  );
  const group = within(
    getByRole("region", { name: `${LONG_TERM_GOAL.content}のチェックポイント` }),
  );
  expect(group.getByText("(1)")).toBeDefined();
  expect(group.getByText(CHECKPOINT.content)).toBeDefined();
});

test("子が増えると「なし」から行の並びに切り替わる(再描画)", () => {
  const view = renderWithMantine(
    <ParentGoalGroup {...commonProps()} kind="longTerm" parent={LONG_TERM_GOAL} />,
  );
  expect(view.getByText(CHECKPOINT_GROUP_EMPTY_MESSAGE)).toBeDefined();

  view.rerender(
    <ParentGoalGroup
      {...commonProps()}
      checkpoints={[CHECKPOINT]}
      kind="longTerm"
      parent={LONG_TERM_GOAL}
    />,
  );

  expect(view.queryByText(CHECKPOINT_GROUP_EMPTY_MESSAGE)).toBeNull();
  expect(view.getByText(CHECKPOINT.content)).toBeDefined();
});

test("親名入りの追加導線から onAddCheckpoint が呼ばれる", () => {
  const onAddCheckpoint = vi.fn();
  const { getByRole } = renderWithMantine(
    <ParentGoalGroup
      {...commonProps()}
      kind="longTerm"
      onAddCheckpoint={onAddCheckpoint}
      parent={LONG_TERM_GOAL}
    />,
  );
  getByRole("button", { name: `${LONG_TERM_GOAL.content}にチェックポイントを追加` }).click();
  expect(onAddCheckpoint).toHaveBeenCalledOnce();
});

test("フォームを開いている間はそのグループの追加導線を出さない", () => {
  const { getByText, queryByRole } = renderWithMantine(
    <ParentGoalGroup
      {...commonProps()}
      form={<div>追加フォーム</div>}
      kind="longTerm"
      onAddCheckpoint={undefined}
      parent={LONG_TERM_GOAL}
    />,
  );
  expect(getByText("追加フォーム")).toBeDefined();
  expect(queryByRole("button", { name: /チェックポイントを追加/ })).toBeNull();
});

test("子の行から編集・削除が親の目標と区別して呼ばれる", () => {
  const onEditGoal = vi.fn();
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <ParentGoalGroup
      {...commonProps()}
      checkpoints={[CHECKPOINT]}
      kind="longTerm"
      onEditGoal={onEditGoal}
      onRemoveGoal={onRemoveGoal}
      parent={LONG_TERM_GOAL}
    />,
  );
  getByRole("button", { name: `${CHECKPOINT.content}を編集` }).click();
  getByRole("button", { name: `${LONG_TERM_GOAL.content}を削除` }).click();
  expect(onEditGoal).toHaveBeenCalledWith(CHECKPOINT);
  expect(onRemoveGoal).toHaveBeenCalledWith(LONG_TERM_GOAL);
});
