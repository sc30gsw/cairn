import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { CHECKPOINT_HAS_CHILDREN_MESSAGE, GOAL_DATE_MESSAGE } from "~domain/domain";

import {
  CHECKPOINT_CROWDED_MESSAGE,
  CheckpointGoalFields,
  ExamGoalFields,
  LongTermGoalFields,
  MasteryEditFields,
} from "~/features/goals/components/goal-form-fields";
import { GOAL_FORM_COPY } from "~/features/goals/lib/goal-form-copy";
import type { ExamGoal, Goal, MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";
const NEXT_SUNDAY = "2026-08-23";

const EXAM_GOAL = {
  _id: "goal-exam" as ExamGoal["_id"],
  content: "金のフレーズを1 Unit 音読する",
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

function fieldsProps(overrides: Partial<Parameters<typeof MasteryEditFields>[0]> = {}) {
  return {
    activeCheckpointCount: 0,
    copy: GOAL_FORM_COPY.checkpoint,
    goal: undefined,
    goals: GOALS,
    hasChildCheckpoints: false,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    parent: EXAM_GOAL,
    todayJst: TODAY,
    ...overrides,
  } satisfies Parameters<typeof MasteryEditFields>[0];
}

test("新規本番目標フォームは空欄で開く", () => {
  const { getByRole } = renderWithMantine(
    <ExamGoalFields {...fieldsProps({ copy: GOAL_FORM_COPY.exam, parent: undefined })} />,
  );
  expect((getByRole("textbox", { name: "目標の内容" }) as HTMLInputElement).value).toBe("");
  expect((getByRole("textbox", { name: "目標スコア下限" }) as HTMLInputElement).value).toBe("");
});

test("本番目標フォームは既存値で開き、exam ペイロードで送信する", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <ExamGoalFields {...fieldsProps({ copy: GOAL_FORM_COPY.exam, goal: EXAM_GOAL, onSubmit })} />,
  );
  expect((getByRole("textbox", { name: "目標の内容" }) as HTMLInputElement).value).toBe(
    EXAM_GOAL.content,
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

test("本番目標フォームは本番日が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <ExamGoalFields {...fieldsProps({ copy: GOAL_FORM_COPY.exam, onSubmit })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "900点を取る" },
  });
  fireEvent.change(getByRole("textbox", { name: "目標スコア下限" }), { target: { value: "730" } });
  fireEvent.change(getByRole("textbox", { name: "目標スコア上限" }), { target: { value: "850" } });
  getByRole("button", { name: "保存" }).click();
  expect(await findByText(GOAL_DATE_MESSAGE)).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("新規長期目標フォームには期限欄が無く、期限も親も付けずに送信する", async () => {
  const onSubmit = vi.fn();
  const { getByRole, queryByLabelText } = renderWithMantine(
    <LongTermGoalFields {...fieldsProps({ copy: GOAL_FORM_COPY.longTerm, onSubmit })} />,
  );
  expect(queryByLabelText(/期限/)).toBeNull();

  fireEvent.change(getByRole("textbox", { name: "長期目標の内容" }), {
    target: { value: "音読を毎日続けられる" },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "1週間続けられる" },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "音読を毎日続けられる",
      criterion: "1週間続けられる",
      deadline: undefined,
      parentGoalId: undefined,
      type: "mastery",
    });
  });
});

test("新規チェックポイントは親を読み取り専用で見せ、期限の既定が次の日曜になる", async () => {
  const onSubmit = vi.fn();
  const { getByDisplayValue, getByRole, getByText, queryByRole } = renderWithMantine(
    <CheckpointGoalFields {...fieldsProps({ onSubmit })} />,
  );
  expect(getByText(EXAM_GOAL.content)).toBeDefined();
  expect(queryByRole("combobox", { name: /親/ })).toBeNull();
  expect(getByDisplayValue(NEXT_SUNDAY)).toBeDefined();

  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: "Unit 1-10 を音読する" },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "止まらずに音読できる" },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "Unit 1-10 を音読する",
      criterion: "止まらずに音読できる",
      deadline: NEXT_SUNDAY,
      parentGoalId: EXAM_GOAL._id,
      type: "mastery",
    });
  });
});

test("新規チェックポイントは基準が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <CheckpointGoalFields {...fieldsProps({ onSubmit })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: "Unit 1-10 を音読する" },
  });
  getByRole("button", { name: "保存" }).click();
  expect(await findByText("達成の基準を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("追いかけ中が2件以上なら助言を出し、1件なら出さない", () => {
  const crowded = renderWithMantine(
    <CheckpointGoalFields {...fieldsProps({ activeCheckpointCount: 2 })} />,
  );
  expect(crowded.getByText(CHECKPOINT_CROWDED_MESSAGE)).toBeDefined();
  crowded.unmount();

  const calm = renderWithMantine(
    <CheckpointGoalFields {...fieldsProps({ activeCheckpointCount: 1 })} />,
  );
  expect(calm.queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
});

test("チェックポイントの編集は期限と親を保ったまま送信できる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <MasteryEditFields {...fieldsProps({ goal: CHECKPOINT, onSubmit })} />,
  );
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: CHECKPOINT.content,
      criterion: CHECKPOINT.criterion,
      deadline: CHECKPOINT.deadline,
      parentGoalId: EXAM_GOAL._id,
      type: "mastery",
    });
  });
});

test("長期目標の編集では親 Select を出さない(期限が無いので親も無い)", () => {
  const { queryByRole } = renderWithMantine(
    <MasteryEditFields {...fieldsProps({ copy: GOAL_FORM_COPY.longTerm, goal: LONG_TERM_GOAL })} />,
  );
  expect(queryByRole("combobox", { name: /親/ })).toBeNull();
});

test("子を持つ長期目標では期限が disabled になり、理由を出す", () => {
  const { getByText, getByLabelText } = renderWithMantine(
    <MasteryEditFields
      {...fieldsProps({
        copy: GOAL_FORM_COPY.longTerm,
        goal: LONG_TERM_GOAL,
        hasChildCheckpoints: true,
      })}
    />,
  );
  expect(getByText(CHECKPOINT_HAS_CHILDREN_MESSAGE)).toBeDefined();
  expect((getByLabelText(/期限/) as HTMLInputElement).disabled).toBe(true);
});
