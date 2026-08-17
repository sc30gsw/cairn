import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { GoalForm } from "~/features/goals/components/goal-form";
import { GOAL_TYPE_LABELS } from "~/features/goals/lib/goal-type-labels";
import { renderWithMantine } from "~/test-utils/render";

test("ペースを選ぶと実施日数と最低分数の欄が出る", () => {
  const { getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="pace"
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  expect(getByRole("textbox", { name: "週の実施日数" })).toBeDefined();
  expect(getByRole("textbox", { name: "1日あたり最低分数" })).toBeDefined();
});

test("ペース目標を送信するとタイプ付きのペイロードになる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="pace"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "帰宅後に Distinction を1セット解く" },
  });
  fireEvent.change(getByRole("textbox", { name: "週の実施日数" }), { target: { value: "3" } });
  fireEvent.change(getByRole("textbox", { name: "1日あたり最低分数" }), {
    target: { value: "20" },
  });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "帰宅後に Distinction を1セット解く",
      dailyFloorMinutes: 20,
      daysPerWeek: 3,
      type: "pace",
    });
  });
});

test("目標の内容が空なら保存できず、エラーが出る", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="pace"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.change(getByRole("textbox", { name: "週の実施日数" }), { target: { value: "3" } });
  fireEvent.change(getByRole("textbox", { name: "1日あたり最低分数" }), {
    target: { value: "20" },
  });
  getByRole("button", { name: "保存" }).click();

  expect(await findByText("具体的手順を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("編集時は目標タイプを変更できない", () => {
  const { getByRole } = renderWithMantine(
    <GoalForm
      goal={{
        _id: "goal-pace" as never,
        content: "帰宅後に Distinction を1セット解く",
        dailyFloorMinutes: 20,
        daysPerWeek: 3,
        type: "pace",
      }}
      initialType="pace"
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst="2026-08-17"
    />,
  );
  expect(getByRole("combobox", { name: /目標タイプ/ }).hasAttribute("disabled")).toBe(true);
});

test.each([
  ["exam", "目標スコア下限"],
  ["pace", "週の実施日数"],
  ["volume", "目標量"],
  ["mastery", "達成の基準"],
  ["other", "メモ（任意）"],
] as const)("目標タイプ「%s」を選ぶと専用の入力欄に切り替わる", async (type, fieldLabel) => {
  const { getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="pace"
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
      todayJst="2026-08-17"
    />,
  );

  getByRole("combobox", { name: /目標タイプ/ }).click();
  getByRole("option", { hidden: true, name: GOAL_TYPE_LABELS[type] }).click();

  await waitFor(() => {
    expect(getByRole("textbox", { name: fieldLabel })).toBeDefined();
  });
});

test("試験のスコア下限が上限を超えるとエラーが出て送信できない", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="exam"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst="2026-08-17"
    />,
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

test("習得の達成の基準が空なら保存できず、エラーが出る", async () => {
  const onSubmit = vi.fn();
  const { findByText, getByRole } = renderWithMantine(
    <GoalForm
      goal={undefined}
      initialType="mastery"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.change(getByRole("textbox", { name: "目標の内容" }), {
    target: { value: "Unit 1-10 を音読する" },
  });
  getByRole("button", { name: "保存" }).click();

  expect(await findByText("達成の基準を入力してください")).toBeDefined();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("達成量目標を編集して送信するとタイプ付きのペイロードになる", async () => {
  const onSubmit = vi.fn();
  const { getByRole } = renderWithMantine(
    <GoalForm
      goal={{
        _id: "goal-volume" as never,
        content: "公式問題集を1回分ずつ解く",
        currentAmount: 3,
        deadline: "2026-09-20",
        startAmount: 0,
        targetAmount: 10,
        type: "volume",
        unit: "回",
      }}
      initialType="volume"
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.change(getByRole("textbox", { name: "目標量" }), { target: { value: "20" } });
  getByRole("button", { name: "保存" }).click();

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      content: "公式問題集を1回分ずつ解く",
      deadline: "2026-09-20",
      startAmount: 0,
      targetAmount: 20,
      type: "volume",
      unit: "回",
    });
  });
});
