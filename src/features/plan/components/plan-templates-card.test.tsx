import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  FORGOTTEN_TEMPLATE_LABEL,
  PlanTemplatesCard,
} from "~/features/plan/components/plan-templates-card";
import type { PlanCatalogItem, PlanTemplateDto } from "~/features/plan/types/plan";
import { renderWithMantine } from "~/test-utils/render";

const { applyMutate, forgottenMutate, saveMutate } = vi.hoisted(() => ({
  applyMutate: vi.fn(async () => ({ applied: true })),
  forgottenMutate: vi.fn(async () => null),
  saveMutate: vi.fn(async () => "tmpl-1"),
}));

vi.mock("~/features/plan/hooks/plan-mutations", () => ({
  usePlanTemplateApply: () => ({ mutateAsync: applyMutate }),
  usePlanTemplateRemove: () => ({ mutateAsync: vi.fn(async () => null) }),
  usePlanTemplateSave: () => ({ mutateAsync: saveMutate }),
  usePlanTemplateSetForgotten: () => ({ mutateAsync: forgottenMutate }),
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
    <PlanTemplatesCard dateJst="2026-08-17" hasEvents items={[item]} templates={[morning]} />,
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
  });
});

test("保存は項目なしを none から外して送る", async () => {
  saveMutate.mockClear();
  const { getByRole } = renderWithMantine(
    <PlanTemplatesCard
      dateJst="2026-08-17"
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
});
