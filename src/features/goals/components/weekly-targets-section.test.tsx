import { fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { WeeklyTargetsSection } from "~/features/goals/components/weekly-targets-section";
import type { TargetProgress } from "~/features/goals/types/target";
import { renderWithMantine } from "~/test-utils/render";
import type { CategoryDto } from "~/types/category";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: Record<"children", ReactNode>) => <a href="/review">{children}</a>,
}));

const { onRemoveTarget, onSaveTarget } = vi.hoisted(() => ({
  onRemoveTarget: vi.fn(),
  onSaveTarget: vi.fn(),
}));

vi.mock("~/features/goals/hooks/use-goals-board-actions", () => ({
  useWeeklyTargetActions: () => ({
    onRemoveTarget,
    onSaveTarget,
  }),
}));

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

const CATEGORIES = [INPUT_CATEGORY, OUTPUT_CATEGORY];

const ACHIEVED_TARGET = {
  _id: "target-input" as TargetProgress["_id"],
  achieved: true,
  categoryId: INPUT_CATEGORY._id,
  categoryName: INPUT_CATEGORY.name,
  current: 180,
  metric: "minutes",
  targetValue: 120,
} satisfies TargetProgress;

const MISSED_TARGET = {
  _id: "target-output" as TargetProgress["_id"],
  achieved: false,
  categoryId: OUTPUT_CATEGORY._id,
  categoryName: OUTPUT_CATEGORY.name,
  current: 2,
  metric: "days",
  targetValue: 4,
} satisfies TargetProgress;

function sectionProps(targets: TargetProgress[], categories: CategoryDto[] = CATEGORIES) {
  return {
    categories,
    targets,
  };
}

test("全ターゲット達成時は緑バッジになる", () => {
  const { getByText } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([ACHIEVED_TARGET])} />,
  );
  expect(getByText("1/1 達成")).toBeDefined();
});

test("ターゲットの進捗と達成サマリが見える", () => {
  const { getByRole, getByText } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([ACHIEVED_TARGET, MISSED_TARGET])} />,
  );
  expect(getByText("1/2 達成")).toBeDefined();
  expect(getByText("180 / 120 分（100%）")).toBeDefined();
  expect(getByText("2 / 4 日（50%）")).toBeDefined();
  expect(getByRole("progressbar", { name: "インプットの進捗" })).toBeDefined();
  expect(getByText("インプットは達成")).toBeDefined();
});

test("ターゲットがゼロ件ならサマリを出さず、置くよう促す", () => {
  const { getByText, queryByText } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([])} />,
  );
  expect(queryByText(/達成$/)).toBeNull();
  expect(
    getByText("まだターゲットがありません。カテゴリーを選んで置いてみましょう。"),
  ).toBeDefined();
});

test("削除アイコンで onRemoveTarget がターゲットIDとともに呼ばれる", () => {
  onRemoveTarget.mockClear();
  const { getByRole } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([MISSED_TARGET])} />,
  );
  getByRole("button", { name: "アウトプットのターゲットを削除" }).click();
  expect(onRemoveTarget).toHaveBeenCalledWith(MISSED_TARGET._id);
});

test("計器と目標値を入れて追加すると onSaveTarget がカテゴリIDつきで呼ばれる", async () => {
  onSaveTarget.mockClear();
  const { getByRole } = renderWithMantine(<WeeklyTargetsSection {...sectionProps([])} />);
  fireEvent.change(getByRole("textbox", { name: "目標値" }), { target: { value: "120" } });
  getByRole("button", { name: "ターゲットを追加" }).click();

  await waitFor(() => {
    expect(onSaveTarget).toHaveBeenCalledWith({
      categoryId: INPUT_CATEGORY._id,
      metric: "minutes",
      targetValue: 120,
    });
  });
});

test("計器を実施日にすると目標値の単位が変わり、7日を超えるとエラーになる", async () => {
  onSaveTarget.mockClear();
  const { getByRole, getByText } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([])} />,
  );
  getByRole("radio", { name: "実施日" }).click();
  await waitFor(() => {
    expect((getByRole("textbox", { name: "目標値" }) as HTMLInputElement).value).toContain("日");
  });

  fireEvent.change(getByRole("textbox", { name: "目標値" }), { target: { value: "8" } });
  getByRole("button", { name: "ターゲットを追加" }).click();

  await waitFor(() => {
    expect(getByText("実施日の目標は7日までです")).toBeDefined();
  });
  expect(onSaveTarget).not.toHaveBeenCalled();
});

test("既にターゲットのあるカテゴリーは編集扱いになり、既存値が入る", () => {
  const { getByRole } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([ACHIEVED_TARGET])} />,
  );
  expect(getByRole("button", { name: "ターゲットを更新" })).toBeDefined();
  expect((getByRole("textbox", { name: "目標値" }) as HTMLInputElement).value).toBe("120 分");
});

test("カテゴリーが1件も無ければフォームの代わりに案内を出す", () => {
  const { getByText, queryByRole } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([], [])} />,
  );
  expect(getByText("先にカテゴリーを作ると、週間ターゲットを置けます。")).toBeDefined();
  expect(queryByRole("textbox", { name: "目標値" })).toBeNull();
});

test("週間ターゲット節から週次レビューへの導線がある", () => {
  const { getByRole } = renderWithMantine(
    <WeeklyTargetsSection {...sectionProps([ACHIEVED_TARGET])} />,
  );
  expect(getByRole("link", { name: "今週のレビュー" })).toBeDefined();
});
