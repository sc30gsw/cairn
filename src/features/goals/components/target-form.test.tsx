import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { TargetForm } from "~/features/goals/components/target-form";
import type { TargetProgress } from "~/features/goals/types/target";
import { renderWithMantine } from "~/test-utils/render";
import type { CategoryDto } from "~/types/category";

const INPUT_CATEGORY = {
  _id: "category-input" as CategoryDto["_id"],
  name: "インプット",
  sortOrder: 0,
} satisfies CategoryDto;

const OUTPUT_CATEGORY = {
  _id: "category-output" as CategoryDto["_id"],
  name: "アウトプット",
  sortOrder: 1,
} satisfies CategoryDto;

const EXISTING_TARGET = {
  _id: "target-input" as TargetProgress["_id"],
  achieved: false,
  categoryId: INPUT_CATEGORY._id,
  categoryName: INPUT_CATEGORY.name,
  current: 60,
  metric: "minutes",
  targetValue: 120,
} satisfies TargetProgress;

test("カテゴリーが無ければ案内だけを出す", () => {
  const { getByText, queryByRole } = renderWithMantine(
    <TargetForm categories={[]} onSave={vi.fn()} targets={[]} />,
  );
  expect(getByText("先にカテゴリーを作ると、週間ターゲットを置けます。")).toBeDefined();
  expect(queryByRole("textbox", { name: "目標値" })).toBeNull();
});

test("既存ターゲットがあるカテゴリーは更新ラベルと説明になる", () => {
  const { getByRole, getByText } = renderWithMantine(
    <TargetForm
      categories={[INPUT_CATEGORY, OUTPUT_CATEGORY]}
      onSave={vi.fn()}
      targets={[EXISTING_TARGET]}
    />,
  );
  expect(getByRole("button", { name: "ターゲットを更新" })).toBeDefined();
  expect(
    getByText("このカテゴリーには既にターゲットがあります。保存すると置き換わります。"),
  ).toBeDefined();
});

test("カテゴリーを切り替えると新規追加ラベルになる", async () => {
  const onSave = vi.fn();
  const { getByRole } = renderWithMantine(
    <TargetForm
      categories={[INPUT_CATEGORY, OUTPUT_CATEGORY]}
      onSave={onSave}
      targets={[EXISTING_TARGET]}
    />,
  );
  getByRole("combobox", { name: "カテゴリー" }).click();
  getByRole("option", { hidden: true, name: OUTPUT_CATEGORY.name }).click();
  await waitFor(() => {
    expect(getByRole("button", { name: "ターゲットを追加" })).toBeDefined();
  });

  fireEvent.change(getByRole("textbox", { name: "目標値" }), { target: { value: "4" } });
  getByRole("radio", { name: "実施日" }).click();
  getByRole("button", { name: "ターゲットを追加" }).click();

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith({
      categoryId: OUTPUT_CATEGORY._id,
      metric: "days",
      targetValue: 4,
    });
  });
});
