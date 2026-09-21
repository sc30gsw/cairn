import { fireEvent, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  FORGOTTEN_TEMPLATE_LABEL,
  PLAN_TEMPLATE_DELETE_TOOLTIP,
  planTemplateApplyTooltip,
  planTemplateUnapplyTooltip,
  PlanTemplatesCard,
} from "~/features/plan/components/plan-templates-card";
import {
  PLAN_TEMPLATE_APPLY_BODY,
  PLAN_TEMPLATE_APPLY_CONFIRM,
  planTemplateApplyTitle,
} from "~/features/plan/lib/open-plan-template-apply-confirm";
import {
  PLAN_TEMPLATE_REMOVE_BODY,
  PLAN_TEMPLATE_REMOVE_CONFIRM,
  planTemplateRemoveTitle,
} from "~/features/plan/lib/open-plan-template-remove-confirm";
import {
  PLAN_TEMPLATE_UNAPPLY_BODY,
  PLAN_TEMPLATE_UNAPPLY_CONFIRM,
  planTemplateUnapplyTitle,
} from "~/features/plan/lib/open-plan-template-unapply-confirm";
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

const evening: PlanTemplateDto = {
  _id: "tmpl-2" as Id<"planTemplates">,
  events: [],
  forgotten: false,
  name: "夜の型",
};

test("occupancy のこの日の予定トグルは残る", () => {
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-09-21"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  expect(getByRole("button", { name: "2026/09/21 の予定を確認します" })).toBeDefined();
});

test("閉じたカードには予定ダンプを出さない", () => {
  const { queryByText } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  expect(queryByText("07:00–07:50 多読、20:00–21:00 X を見る")).toBeNull();
});

test("2枚の保存済みカードを同時に開ける", () => {
  const { getByRole, getByText } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning, evening]}
    />,
  );

  fireEvent.click(getByText("平日の型").closest("button") as HTMLButtonElement);
  fireEvent.click(getByText("夜の型").closest("button") as HTMLButtonElement);
  expect(getByRole("textbox", { name: "平日の型の名前" })).toBeDefined();
  expect(getByRole("textbox", { name: "夜の型の名前" })).toBeDefined();
});

test("予定がある日でも適用は有効で、置き換え確認のあと apply する", async () => {
  applyMutate.mockClear();
  const applyTooltip = planTemplateApplyTooltip("2026-09-21");
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-09-21"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning]}
    />,
  );

  const applyButton = getByRole("button", { name: applyTooltip });
  expect((applyButton as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(applyButton);

  const dialog = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: planTemplateApplyTitle(morning.name, "2026-09-21") }),
  );
  expect(within(dialog).getByText(PLAN_TEMPLATE_APPLY_BODY)).toBeDefined();
  fireEvent.click(
    within(dialog).getByRole("button", { hidden: true, name: PLAN_TEMPLATE_APPLY_CONFIRM }),
  );
  await waitFor(() => {
    expect(applyMutate).toHaveBeenCalledWith({
      dateJst: "2026-09-21",
      templateId: morning._id,
      todayJst: "2026-08-17",
    });
  });
});

test("appliedTemplateId が無いときは解除を出さない", () => {
  const unapplyTooltip = planTemplateUnapplyTooltip("2026-08-17");
  const { queryByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning]}
    />,
  );

  expect(queryByRole("button", { name: unapplyTooltip })).toBeNull();
});

test("appliedTemplateId が一致するカードだけ解除でき、確認後に unapply する", async () => {
  unapplyMutate.mockClear();
  const unapplyTooltip = planTemplateUnapplyTooltip("2026-09-21");
  const { getAllByRole, getByRole, queryByRole } = renderWithMantine(
    <PlanTemplatesCard
      appliedTemplateId={morning._id}
      dateJst="2026-09-21"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning, evening]}
    />,
  );

  expect(getByRole("button", { name: unapplyTooltip })).toBeDefined();
  expect(queryByRole("button", { name: planTemplateUnapplyTooltip("2026-09-21") })).toBeDefined();
  expect(getAllByRole("button", { name: unapplyTooltip })).toHaveLength(1);

  fireEvent.click(getByRole("button", { name: unapplyTooltip }));
  const dialog = await vi.waitFor(() =>
    getByRole("dialog", {
      hidden: true,
      name: planTemplateUnapplyTitle(morning.name, "2026-09-21"),
    }),
  );
  expect(within(dialog).getByText(PLAN_TEMPLATE_UNAPPLY_BODY)).toBeDefined();
  fireEvent.click(
    within(dialog).getByRole("button", { hidden: true, name: PLAN_TEMPLATE_UNAPPLY_CONFIRM }),
  );
  await waitFor(() => {
    expect(unapplyMutate).toHaveBeenCalledWith({
      dateJst: "2026-09-21",
      todayJst: "2026-08-17",
    });
  });
});

test("・・・には適用と削除があり、適用元だけ解除が出る", () => {
  const { getAllByRole, getByRole } = renderWithMantine(
    <PlanTemplatesCard
      appliedTemplateId={morning._id}
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents
      items={[item]}
      templates={[morning, evening]}
    />,
  );

  const morningMenuButton = getAllByRole("button", { name: "この計画の操作" })[0];
  expect(morningMenuButton).toBeDefined();
  fireEvent.click(morningMenuButton as HTMLElement);
  const appliedMenu = getByRole("menu");
  expect(within(appliedMenu).getByRole("menuitem", { name: "適用" })).toBeDefined();
  expect(within(appliedMenu).getByRole("menuitem", { name: "解除" })).toBeDefined();
  expect(within(appliedMenu).getByRole("menuitem", { name: "削除" })).toBeDefined();

  fireEvent.keyDown(document.body, { key: "Escape" });
  const eveningMenuButton = getAllByRole("button", { name: "この計画の操作" })[1];
  expect(eveningMenuButton).toBeDefined();
  fireEvent.click(eveningMenuButton as HTMLElement);
  const otherMenu = getAllByRole("menu").at(-1);
  expect(otherMenu).toBeDefined();
  expect(within(otherMenu as HTMLElement).getByRole("menuitem", { name: "適用" })).toBeDefined();
  expect(within(otherMenu as HTMLElement).queryByRole("menuitem", { name: "解除" })).toBeNull();
  expect(within(otherMenu as HTMLElement).getByRole("menuitem", { name: "削除" })).toBeDefined();
});

test("開いたフッタは左に予定を追加、右に削除と保存", () => {
  const { getByRole, getByText } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByText("平日の型").closest("button") as HTMLButtonElement);
  const footer = getByRole("textbox", { name: "平日の型の名前" }).closest("form");
  expect(footer).not.toBeNull();
  const buttons = within(footer as HTMLElement).getAllByRole("button");
  const labels = buttons.map((button) => button.textContent);
  expect(labels).toContain("予定を追加");
  expect(labels).toContain("削除");
  expect(labels).toContain("保存");
  expect(labels.indexOf("予定を追加")).toBeLessThan(labels.indexOf("削除"));
  expect(labels.indexOf("削除")).toBeLessThan(labels.indexOf("保存"));
});

test("優先度は高・中・低だけで色名括弧は出さない", async () => {
  const { getByRole, getByText, queryByText } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByText("平日の型").closest("button") as HTMLButtonElement);
  fireEvent.click(getByRole("combobox", { name: "平日の型の予定1の優先度" }));
  await waitFor(() => {
    expect(getByRole("option", { name: "高" })).toBeDefined();
    expect(getByRole("option", { name: "中" })).toBeDefined();
    expect(getByRole("option", { name: "低" })).toBeDefined();
  });
  expect(queryByText("Banana")).toBeNull();
  expect(queryByText("Sage")).toBeNull();
  expect(queryByText("Graphite")).toBeNull();
});

test("計画し忘れたときに使うスイッチはカードごとにあり、オンは1つだけ", () => {
  forgottenMutate.mockClear();
  const { getAllByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning, evening]}
    />,
  );

  const toggles = getAllByRole("switch", { name: FORGOTTEN_TEMPLATE_LABEL });
  expect(toggles).toHaveLength(2);
  expect((toggles[0] as HTMLInputElement).checked).toBe(true);
  expect((toggles[1] as HTMLInputElement).checked).toBe(false);
  const morningToggle = toggles[0];
  expect(morningToggle).toBeDefined();
  fireEvent.click(morningToggle as HTMLElement);
  expect(forgottenMutate).toHaveBeenCalledWith({ templateId: null });
});

test("空の日は確認なしで適用する", () => {
  applyMutate.mockClear();
  const applyTooltip = planTemplateApplyTooltip("2026-08-17");
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

  fireEvent.click(getByRole("button", { name: applyTooltip }));
  expect(applyMutate).toHaveBeenCalledWith({
    dateJst: "2026-08-17",
    templateId: morning._id,
    todayJst: "2026-08-17",
  });
  expect(queryByRole("dialog", { hidden: true })).toBeNull();
});

test("保存は項目なしを none から外して送る", async () => {
  saveMutate.mockClear();
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

  fireEvent.click(getByText("平日の型").closest("button") as HTMLButtonElement);
  fireEvent.click(getByRole("button", { name: "この計画を保存します" }));
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

test("削除は確認してから消し、キャンセルでは残す", async () => {
  removeMutate.mockClear();
  const { getByRole, getByText } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
      events={[]}
      externals={[]}
      hasEvents={false}
      items={[item]}
      templates={[morning]}
    />,
  );

  fireEvent.click(getByText("平日の型").closest("button") as HTMLButtonElement);
  fireEvent.click(getByRole("button", { name: PLAN_TEMPLATE_DELETE_TOOLTIP }));
  const canceled = await vi.waitFor(() =>
    getByRole("dialog", { hidden: true, name: planTemplateRemoveTitle(morning.name) }),
  );
  expect(within(canceled).getByText(PLAN_TEMPLATE_REMOVE_BODY)).toBeDefined();
  fireEvent.click(within(canceled).getByRole("button", { hidden: true, name: "キャンセル" }));
  expect(removeMutate).not.toHaveBeenCalled();

  fireEvent.click(getByRole("button", { name: PLAN_TEMPLATE_DELETE_TOOLTIP }));
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
