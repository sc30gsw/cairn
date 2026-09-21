import { fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";
import { PLAN_FROZEN_MESSAGE } from "~domain/planEvent";

import type { Id } from "~/../convex/_generated/dataModel";
import { BoardScheduleEventForm } from "~/features/plan/components/board-schedule-event-form";
import type { PlanCatalogItem } from "~/features/plan/types/plan";
import { renderWithMantine } from "~/test-utils/render";

const onSubmit = vi.fn(async () => Result.ok(null));

function sampleItem(id: string, name: string): PlanCatalogItem {
  return {
    _id: id as Id<"items">,
    categoryId: "c1" as PlanCatalogItem["categoryId"],
    name,
    sortOrder: 0,
  };
}

test("予定は高・中・低から選んで、項目なしでも保存できる", async () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByRole, getByLabelText, findByRole } = renderWithMantine(
    <BoardScheduleEventForm
      dateJst="2026-08-17"
      initialValues={{
        end,
        eventId: undefined,
        itemId: undefined,
        priority: "medium",
        start,
        title: "X を見る",
      }}
      items={[sampleItem("i1", "Distinction"), sampleItem("i2", "金フレ")]}
      onClose={() => undefined}
      onSubmit={onSubmit}
      opened
    />,
  );

  expect(getByRole("dialog", { hidden: true }).textContent).toContain("予定を追加");
  expect(getByRole("button", { name: "保存" })).toBeDefined();
  expect(getByLabelText("タイトル")).toBeDefined();
  fireEvent.click(getByRole("combobox", { name: "優先度" }));
  expect(await findByRole("option", { name: "低" })).toBeDefined();
  fireEvent.click(await findByRole("option", { name: "低" }));
  fireEvent.click(getByRole("combobox", { name: "優先度" }));
  expect((await findByRole("listbox")).querySelectorAll("[role=option]").length).toBe(3);
  fireEvent.click(getByRole("option", { name: "低" }));
  fireEvent.click(getByRole("button", { name: "保存" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ priority: "low", title: "X を見る" }),
  );
});

test("項目を選ぶとタイトル欄は隠れる", () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardScheduleEventForm
      dateJst="2026-08-17"
      initialValues={{
        end,
        eventId: undefined,
        itemId: "i1" as Id<"items">,
        priority: "medium",
        start,
        title: "",
      }}
      items={[sampleItem("i1", "Distinction")]}
      onClose={() => undefined}
      onSubmit={onSubmit}
      opened
    />,
  );

  expect(queryByLabelText("タイトル")).toBeNull();
  expect(getByRole("combobox", { name: "項目" })).toBeDefined();
});

test("タイトルがあると項目欄は隠れる", () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByLabelText, queryByRole } = renderWithMantine(
    <BoardScheduleEventForm
      dateJst="2026-08-17"
      initialValues={{
        end,
        eventId: undefined,
        itemId: "i1" as Id<"items">,
        priority: "medium",
        start,
        title: "図書館",
      }}
      items={[sampleItem("i1", "Distinction")]}
      onClose={() => undefined}
      onSubmit={onSubmit}
      opened
    />,
  );

  expect(queryByRole("combobox", { name: "項目" })).toBeNull();
  expect(getByLabelText("タイトル")).toBeDefined();
});

test("記録を生やした予定は項目を変えられない", () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByRole, getByText } = renderWithMantine(
    <BoardScheduleEventForm
      dateJst="2026-08-17"
      frozen
      initialValues={{
        end,
        eventId: "event-1" as Id<"planEvents">,
        itemId: "i1" as Id<"items">,
        priority: "high",
        start,
        title: "Part 7",
      }}
      items={[sampleItem("i1", "Distinction")]}
      onClose={() => undefined}
      onSubmit={onSubmit}
      opened
    />,
  );

  expect(getByRole("dialog", { hidden: true }).textContent).toContain("予定を編集");
  expect(getByRole("combobox", { name: "項目" }).hasAttribute("disabled")).toBe(true);
  expect(getByText(PLAN_FROZEN_MESSAGE)).toBeDefined();
});
