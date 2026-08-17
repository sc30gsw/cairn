import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { GoalForm } from "~/features/goals/components/goal-form";
import { CHECKPOINT_CROWDED_MESSAGE } from "~/features/goals/components/goal-form-fields";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import type { Goal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";
const NEXT_SUNDAY = "2026-08-23";

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

function formProps(overrides: Partial<Parameters<typeof GoalForm>[0]> = {}) {
  return {
    activeCheckpointCount: 0,
    goal: undefined,
    initialType: "mastery",
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    todayJst: TODAY,
    ...overrides,
  } satisfies Parameters<typeof GoalForm>[0];
}

test("習得を選ぶと達成の基準と期限の欄が出る", () => {
  const { getByRole } = renderWithMantine(<GoalForm {...formProps()} />);
  expect(getByRole("textbox", { name: "達成の基準" })).toBeDefined();
  expect(getByRole("textbox", { name: "目標の内容" })).toBeDefined();
});

test.each([
  ["exam", "目標スコア下限"],
  ["mastery", "達成の基準"],
] as const)("目標タイプ「%s」を選ぶと専用の入力欄に切り替わる", async (type, fieldLabel) => {
  const { getByRole } = renderWithMantine(<GoalForm {...formProps()} />);

  getByRole("combobox", { name: /目標タイプ/ }).click();
  getByRole("option", { hidden: true, name: GOAL_TYPE_LABELS[type] }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: fieldLabel })).toBeDefined();
  });
});

test("習得を新規作成すると期限の既定値は次の日曜になる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(<GoalForm {...formProps({ onSubmit })} />);

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
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
      type: "mastery",
    });
  });
});

test("習得を編集すると既存の期限のまま送信できる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalForm {...formProps({ goal: MASTERY_GOAL, onSubmit })} />,
  );

  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: MASTERY_GOAL.content,
      criterion: MASTERY_GOAL.criterion,
      deadline: MASTERY_GOAL.deadline,
      type: "mastery",
    });
  });
});

test("目標の内容が空なら保存できず、エラーが出る", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(<GoalForm {...formProps({ onSubmit })} />);

  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "止まらずに音読できる" },
  });
  getByRole("button", { name: "保存" }).click();

  expect(await findByText("具体的手順を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("習得の達成の基準が空なら保存できず、エラーが出る", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(<GoalForm {...formProps({ onSubmit })} />);

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "Unit 1-10 を音読する" },
  });
  getByRole("button", { name: "保存" }).click();

  expect(await findByText("達成の基準を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("試験のスコア下限が上限を超えるとエラーが出て送信できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <GoalForm {...formProps({ initialType: "exam", onSubmit })} />,
  );

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "公式問題集を1回分解く" },
  });
  fireEvent.change(getByRole("textbox", { name: "目標スコア下限" }), { target: { value: "850" } });
  fireEvent.change(getByRole("textbox", { name: "目標スコア上限" }), { target: { value: "730" } });
  getByRole("button", { name: "保存" }).click();

  expect(await findByText("目標点の下限が上限を超えています")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("編集時は目標タイプを変更できない", () => {
  const { getByRole } = renderWithMantine(<GoalForm {...formProps({ goal: MASTERY_GOAL })} />);
  expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
});

test("チェックポイントとして開くと文言がチェックポイントに揃い、タイプ選択は出ない", async () => {
  const onSubmit = vi.fn();
  const { getByRole, queryByRole } = renderWithMantine(
    <GoalForm {...formProps({ onSubmit, variant: "checkpoint" })} />,
  );
  expect(queryByRole("combobox", { name: /目標タイプ/ })).toBeNull();
  expect(queryByRole("textbox", { name: "目標の内容" })).toBeNull();

  fireEvent.change(getByRole("textbox", { name: "チェックポイントの内容" }), {
    target: { value: "Unit 1-10 を音読する" },
  });
  fireEvent.change(getByRole("textbox", { name: "達成の基準" }), {
    target: { value: "止まらずに音読できる" },
  });
  getByRole("button", { name: "チェックポイントを追加" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "Unit 1-10 を音読する",
      criterion: "止まらずに音読できる",
      deadline: NEXT_SUNDAY,
      type: "mastery",
    });
  });
});

test("追いかけ中が2件以上のときだけ、新規作成に助言が出る", () => {
  const { getByText } = renderWithMantine(
    <GoalForm {...formProps({ activeCheckpointCount: 2 })} />,
  );
  expect(getByText(CHECKPOINT_CROWDED_MESSAGE)).toBeDefined();
});

test("編集中は助言を出さない", () => {
  const { queryByText } = renderWithMantine(
    <GoalForm {...formProps({ activeCheckpointCount: 3, goal: MASTERY_GOAL })} />,
  );
  expect(queryByText(CHECKPOINT_CROWDED_MESSAGE)).toBeNull();
});
