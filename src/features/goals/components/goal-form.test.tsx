import { waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { GoalForm } from "~/features/goals/components/goal-form";
import { GOAL_FORM_COPY } from "~/features/goals/lib/goal-form-copy";
import {
  scopeCategoriesFixture,
  scopeItemsFixture,
} from "~/features/goals/mocks/goal-scope-fixture";
import type { ExamGoal, Goal, MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";
const NEXT_SUNDAY = "2026-08-23";

const EXAM_GOAL = {
  _id: "goal-exam" as ExamGoal["_id"],
  content: "900点を取る",
  createdAt: 1_755_000_000_000,
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
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
  content: "Unit 1-10 を音読する",
  createdAt: 1_755_000_200_000,
  criterion: "止まらずに音読できる",
  deadline: "2026-09-06",
  parentGoalId: EXAM_GOAL._id,
  type: "mastery",
} satisfies MasteryGoal;

const GOALS: Goal[] = [EXAM_GOAL, LONG_TERM_GOAL, CHECKPOINT];

function formProps(overrides: Partial<Parameters<typeof GoalForm>[0]> = {}) {
  return {
    activeCheckpointCount: 0,
    categories: scopeCategoriesFixture,
    goal: undefined,
    goals: GOALS,
    hasChildCheckpoints: false,
    items: scopeItemsFixture,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    parent: undefined,
    todayJst: TODAY,
    variant: "longTerm",
    ...overrides,
  } satisfies Parameters<typeof GoalForm>[0];
}

test("どの区分でも目標タイプの Select は出ない", () => {
  const { queryByRole } = renderWithMantine(<GoalForm {...formProps()} />);
  expect(queryByRole("combobox", { name: /目標タイプ/ })).toBeNull();
});

test("新規長期目標は長期目標の語で開き、期限欄を出さない", () => {
  const { getByRole, queryByLabelText } = renderWithMantine(<GoalForm {...formProps()} />);
  expect(getByRole("heading", { name: GOAL_FORM_COPY.longTerm.createTitle })).toBeDefined();
  expect(getByRole("textbox", { name: GOAL_FORM_COPY.longTerm.contentLabel })).toBeDefined();
  expect(queryByLabelText(/期限/)).toBeNull();
});

test("新規チェックポイントはチェックポイントの語で開き、親を読み取り専用で見せる", () => {
  const { getByDisplayValue, getByRole, getByText } = renderWithMantine(
    <GoalForm {...formProps({ parent: EXAM_GOAL, variant: "checkpoint" })} />,
  );
  expect(getByRole("heading", { name: GOAL_FORM_COPY.checkpoint.createTitle })).toBeDefined();
  expect(getByText(EXAM_GOAL.content)).toBeDefined();
  expect(getByDisplayValue(NEXT_SUNDAY)).toBeDefined();
});

test("新規本番目標はスコア欄つきで開く", () => {
  const { getByRole } = renderWithMantine(<GoalForm {...formProps({ variant: "exam" })} />);
  expect(getByRole("heading", { name: GOAL_FORM_COPY.exam.createTitle })).toBeDefined();
  expect(getByRole("textbox", { name: "目標スコア下限" })).toBeDefined();
});

test("チェックポイントの編集はチェックポイントの語で開き、送信ラベルは保存になる", () => {
  const { getByRole } = renderWithMantine(
    <GoalForm {...formProps({ goal: CHECKPOINT, variant: "checkpoint" })} />,
  );
  expect(getByRole("heading", { name: GOAL_FORM_COPY.checkpoint.editTitle })).toBeDefined();
  expect(getByRole("button", { name: "保存" })).toBeDefined();
});

test("長期目標の編集は長期目標の語で開く", () => {
  const { getByRole } = renderWithMantine(
    <GoalForm {...formProps({ goal: LONG_TERM_GOAL, variant: "longTerm" })} />,
  );
  expect(getByRole("heading", { name: GOAL_FORM_COPY.longTerm.editTitle })).toBeDefined();
});

test("習得の編集で期限を消すと長期目標への移行を予告し、親 Select が消える", async () => {
  const { findByText, getByRole, queryByRole } = renderWithMantine(
    <GoalForm {...formProps({ goal: CHECKPOINT, variant: "checkpoint" })} />,
  );
  expect(getByRole("combobox", { name: /親/ })).toBeDefined();

  getByRole("button", { name: /期限.*を消す/ }).click();

  expect(await findByText("保存すると期限が外れ、長期目標へ移ります")).toBeDefined();
  expect(queryByRole("combobox", { name: /親/ })).toBeNull();
});

test("本番目標の編集は exam ペイロードで送信する", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalForm {...formProps({ goal: EXAM_GOAL, onSubmit, variant: "exam" })} />,
  );
  getByRole("button", { name: "保存" }).click();
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: EXAM_GOAL.content,
      examDate: EXAM_GOAL.examDate,
      maxScore: EXAM_GOAL.maxScore,
      minScore: EXAM_GOAL.minScore,
      type: "exam",
    });
  });
});

test("キャンセルボタンで onCancel が呼ばれる", () => {
  const onCancel = vi.fn();
  const { getByRole } = renderWithMantine(<GoalForm {...formProps({ onCancel })} />);
  getByRole("button", { name: "キャンセル" }).click();
  expect(onCancel).toHaveBeenCalledOnce();
});
