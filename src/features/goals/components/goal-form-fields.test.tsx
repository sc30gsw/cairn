import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { GOAL_DATE_MESSAGE } from "~domain/domain";

import {
  CHECKPOINT_CROWDED_MESSAGE,
  ExamGoalFields,
  MasteryGoalFields,
} from "~/features/goals/components/goal-form-fields";
import { GOAL_FORM_COPY } from "~/features/goals/lib/goal-form-copy";
import type { Goal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const EXAM_GOAL = {
  _id: "goal-exam" as Goal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies Goal;

const MASTERY_GOAL = {
  _id: "goal-mastery" as Goal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  criterion: "止まらずに音読できる",
  deadline: "2026-09-06",
  type: "mastery",
} satisfies Goal;

function fieldsProps(overrides: Partial<Parameters<typeof MasteryGoalFields>[0]> = {}) {
  return {
    activeCheckpointCount: 0,
    copy: GOAL_FORM_COPY.checkpoint,
    goal: undefined,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    todayJst: TODAY,
    ...overrides,
  };
}

test("新規試験目標フォームは空欄で開く", () => {
  const { getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={undefined}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst={TODAY}
    />,
  );
  expect((getByRole("textbox", { name: "目標の内容" }) as HTMLInputElement).value).toBe("");
  expect((getByRole("textbox", { name: "目標スコア下限" }) as HTMLInputElement).value).toBe("");
});

test("習得目標を試験フォームに渡しても空欄で開く", () => {
  const { getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={MASTERY_GOAL}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst={TODAY}
    />,
  );
  expect((getByRole("textbox", { name: "目標の内容" }) as HTMLInputElement).value).toBe("");
});

test("新規習得フォームは次の日曜が期限の初期値になる", () => {
  const { getByDisplayValue } = renderWithMantine(<MasteryGoalFields {...fieldsProps()} />);
  expect(getByDisplayValue("2026-08-23")).toBeDefined();
});

test("新規習得フォームは保存できる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(<MasteryGoalFields {...fieldsProps({ onSubmit })} />);
  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: "新チェックポイント" },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "基準を満たす" },
  });
  getByRole("button", { name: "チェックポイントを追加" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "新チェックポイント",
      criterion: "基準を満たす",
      deadline: "2026-08-23",
      type: "mastery",
    });
  });
});

test("試験目標フォームは既存値で開き、保存できる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={EXAM_GOAL}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst={TODAY}
    />,
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

test("習得フォームは編集時に期限の既定値を空にしない", () => {
  const { getByDisplayValue } = renderWithMantine(
    <MasteryGoalFields {...fieldsProps({ goal: MASTERY_GOAL })} />,
  );
  expect(getByDisplayValue(MASTERY_GOAL.deadline)).toBeDefined();
});

test("新規チェックポイントが多いとき助言を出す", () => {
  const { getByText } = renderWithMantine(
    <MasteryGoalFields {...fieldsProps({ activeCheckpointCount: 2 })} />,
  );
  expect(getByText(CHECKPOINT_CROWDED_MESSAGE)).toBeDefined();
});

test("編集時は助言を出さない", () => {
  const { queryByText } = renderWithMantine(
    <MasteryGoalFields {...fieldsProps({ activeCheckpointCount: 2, goal: MASTERY_GOAL })} />,
  );
  expect(queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
});

test("キャンセルボタンで onCancel が呼ばれる", () => {
  const onCancel = vi.fn();
  const { getByRole } = renderWithMantine(<MasteryGoalFields {...fieldsProps({ onCancel })} />);
  getByRole("button", { name: "キャンセル" }).click();
  expect(onCancel).toHaveBeenCalledOnce();
});

test("試験フォームのスコア入力を空にできる", () => {
  const { getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={EXAM_GOAL}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst={TODAY}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "目標スコア下限" }), { target: { value: "" } });
  expect((getByRole("textbox", { name: "目標スコア下限" }) as HTMLInputElement).value).toBe("");
});

test("試験フォームは本番日が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={undefined}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst={TODAY}
    />,
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

test("試験フォームは内容が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={EXAM_GOAL}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst={TODAY}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), { target: { value: "  " } });
  getByRole("button", { name: "保存" }).click();
  expect(await findByText("具体的手順を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("試験フォームはスコア順序が逆なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={EXAM_GOAL}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst={TODAY}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "目標スコア下限" }), { target: { value: "850" } });
  fireEvent.change(getByRole("textbox", { name: "目標スコア上限" }), { target: { value: "730" } });
  getByRole("button", { name: "保存" }).click();
  expect(await findByText("目標点の下限が上限を超えています")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("試験フォームは上限スコアを空にできる", () => {
  const { getByRole } = renderWithMantine(
    <ExamGoalFields
      activeCheckpointCount={0}
      copy={GOAL_FORM_COPY.goal}
      goal={EXAM_GOAL}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst={TODAY}
    />,
  );
  fireEvent.change(getByRole("textbox", { name: "目標スコア上限" }), { target: { value: "" } });
  expect((getByRole("textbox", { name: "目標スコア上限" }) as HTMLInputElement).value).toBe("");
});

test("習得フォームは基準が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <MasteryGoalFields {...fieldsProps({ onSubmit })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: "新チェックポイント" },
  });
  getByRole("button", { name: "チェックポイントを追加" }).click();
  expect(await findByText("達成の基準を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("習得フォームは内容が空なら保存できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <MasteryGoalFields {...fieldsProps({ onSubmit })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "基準を満たす" },
  });
  getByRole("button", { name: "チェックポイントを追加" }).click();
  expect(await findByText("具体的手順を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});
