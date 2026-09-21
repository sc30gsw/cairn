import { fireEvent, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  FORGOTTEN_TEMPLATE_LABEL,
  PLAN_TEMPLATE_UNAPPLY_LABEL,
  PlanTemplatesCard,
} from "~/features/plan/components/plan-templates-card";
import {
  PLAN_TEMPLATE_REMOVE_BODY,
  PLAN_TEMPLATE_REMOVE_CONFIRM,
  planTemplateRemoveTitle,
} from "~/features/plan/lib/open-plan-template-remove-confirm";
import type { PlanCatalogItem, PlanTemplateDto } from "~/features/plan/types/plan";
import { renderWithMantine } from "~/test-utils/render";

const { applyMutate, forgottenMutate, removeMutate, saveMutate, unapplyMutate } = vi.hoisted(
  () => ({
    applyMutate: vi.fn(async () => ({ applied: true })),
    forgottenMutate: vi.fn(async () => null),
    removeMutate: vi.fn(async () => null),
    saveMutate: vi.fn(async () => "tmpl-1"),
    unapplyMutate: vi.fn(async () => ({ cleared: true })),
  }),
);

vi.mock("~/features/plan/hooks/plan-mutations", () => ({
  usePlanTemplateApply: () => ({ mutateAsync: applyMutate }),
  usePlanTemplateRemove: () => ({ mutateAsync: removeMutate }),
  usePlanTemplateSave: () => ({ mutateAsync: saveMutate }),
  usePlanTemplateSetForgotten: () => ({ mutateAsync: forgottenMutate }),
  usePlanTemplateUnapply: () => ({ mutateAsync: unapplyMutate }),
}));

vi.mock("~/hooks/use-today-jst", () => ({
  useTodayJst: () => "2026-08-17",
}));

vi.mock("~/lib/run-mutation", async () => {
  const { Result } = await import("better-result");
  return {
    runMutation: async (run: () => Promise<unknown>) => Result.ok(await run()),
  };
});

const item = {
  _id: "item-1" as Id<"items">,
  name: "多読",
} as PlanCatalogItem;

const morning: PlanTemplateDto = {
  _id: "tmpl-1" as Id<"planTemplates">,
  events: [
    {
      _id: "tev-1" as Id<"planTemplateEvents">,
      endTime: "07:50",
      itemId: item._id,
      priority: "high",
      startTime: "07:00",
      title: "朝の多読",
    },
    {
      _id: "tev-2" as Id<"planTemplateEvents">,
      endTime: "21:00",
      priority: "low",
      startTime: "20:00",
      title: "X を見る",
    },
  ],
  forgotten: true,
  name: "平日の型",
};

test("計画し忘れたときに使うスイッチは1つで、予定がある日の適用は押せない", () => {
  forgottenMutate.mockClear();
  applyMutate.mockClear();
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning]}
    />,
  );

  const toggle = getByRole("switch", { name: FORGOTTEN_TEMPLATE_LABEL });
  expect((toggle as HTMLInputElement).checked).toBe(true);
  fireEvent.click(toggle);
  expect(forgottenMutate).toHaveBeenCalledWith({ templateId: null });

  expect((getByRole("button", { name: "この日に適用" }) as HTMLButtonElement).disabled).toBe(true);
  expect(applyMutate).not.toHaveBeenCalled();
});

test("空の日なら選んだ雛形を適用する", () => {
  applyMutate.mockClear();
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "平日の型を編集" }));
  fireEvent.click(getByRole("button", { name: "この日に適用" }));
  expect(applyMutate).toHaveBeenCalledWith({
    dateJst: "2026-08-17",
    templateId: morning._id,
    todayJst: "2026-08-17",
  });
});

test("保存は項目なしを none から外して送る", async () => {
  saveMutate.mockClear();
  const { getByRole, queryByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "平日の型を編集" }));
  fireEvent.click(getByRole("button", { name: "保存" }));
  await waitFor(() => {
    expect(saveMutate).toHaveBeenCalledWith({
      events: [
        {
          endTime: "07:50",
          itemId: item._id,
          priority: "high",
          startTime: "07:00",
          templateEventId: "tev-1",
          title: "朝の多読",
        },
        {
          endTime: "21:00",
          itemId: undefined,
          priority: "low",
          startTime: "20:00",
          templateEventId: "tev-2",
          title: "X を見る",
        },
      ],
      name: "平日の型",
      templateId: morning._id,
    });
  });
  expect(queryByRole("textbox", { name: "平日の型の名前" })).toBeNull();
});

test("保存した雛形の名前を変えて保存すると更新が送られ、編集欄が閉じる", async () => {
  saveMutate.mockClear();
  const { getByRole, queryByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "平日の型を編集" }));
  fireEvent.change(getByRole("textbox", { name: "平日の型の名前" }), {
    target: { value: "夜の型" },
  });
  fireEvent.click(getByRole("button", { name: "保存" }));
  await waitFor(() => {
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "夜の型",
        templateId: morning._id,
      }),
    );
  });
  expect(queryByRole("textbox", { name: "平日の型の名前" })).toBeNull();
});

test("保存した雛形は予定の要約を出し、タイトルとトグルで詳細を開閉する", () => {
  const { getByRole, getByText, queryByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  expect(getByRole("button", { name: "平日の型を編集" })).toBeDefined();
  expect(getByRole("button", { name: "平日の型を削除" })).toBeDefined();
  expect(getByRole("button", { name: "平日の型の詳細を開く" })).toBeDefined();
  expect(getByText("07:00–07:50 多読、20:00–21:00 X を見る")).toBeDefined();
  expect(queryByRole("button", { name: /^編集$/ })).toBeNull();
  expect(queryByRole("textbox", { name: "平日の型の名前" })).toBeNull();
  expect(queryByRole("button", { name: "24:00に設定" })).toBeNull();

  fireEvent.click(getByRole("button", { name: "平日の型を編集" }));
  expect(getByRole("textbox", { name: "平日の型の名前" })).toBeDefined();
  expect(getByRole("button", { name: "平日の型の詳細を閉じる" })).toBeDefined();

  fireEvent.click(getByRole("button", { name: "平日の型を編集" }));
  expect(queryByRole("textbox", { name: "平日の型の名前" })).toBeNull();
  expect(getByRole("button", { name: "平日の型の詳細を開く" })).toBeDefined();

  fireEvent.click(getByRole("button", { name: "平日の型の詳細を開く" }));
  expect(getByRole("textbox", { name: "平日の型の名前" })).toBeDefined();
  fireEvent.click(getByRole("button", { name: "平日の型の詳細を閉じる" }));
  expect(queryByRole("textbox", { name: "平日の型の名前" })).toBeNull();
});

test("予定がある日は適用を解除できる", () => {
  unapplyMutate.mockClear();
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByRole("button", { name: PLAN_TEMPLATE_UNAPPLY_LABEL }));
  expect(unapplyMutate).toHaveBeenCalledWith({
    dateJst: "2026-08-17",
    todayJst: "2026-08-17",
  });
});

test("削除は確認してから消し、キャンセルでは残す", async () => {
  removeMutate.mockClear();
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "平日の型を削除" }));
  const canceled = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: planTemplateRemoveTitle(morning.name) }),
  );
  expect(within(canceled).getByText(PLAN_TEMPLATE_REMOVE_BODY)).toBeDefined();
  fireEvent.click(within(canceled).getByRole("button", { hidden: true, name: "キャンセル" }));
  expect(removeMutate).not.toHaveBeenCalled();

  fireEvent.click(getByRole("button", { name: "平日の型を削除" }));
  const confirmed = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: planTemplateRemoveTitle(morning.name) }),
  );
  fireEvent.click(
    within(confirmed).getByRole("button", { hidden: true, name: PLAN_TEMPLATE_REMOVE_CONFIRM }),
  );
  await waitFor(() => {
    expect(removeMutate).toHaveBeenCalledWith({ templateId: morning._id });
  });
});
