import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { PresetList } from "~/features/catalog/components/preset-list";
import { renderWithMemoryRouter } from "~/test-utils/render";

vi.mock("~/features/catalog/hooks/use-catalog-preset-actions", () => ({
  useCatalogPresetActions: () => ({
    onCreate: vi.fn(),
    onRemove: vi.fn(),
    onUpdate: vi.fn(),
  }),
}));

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: () => ({ data: [] }),
}));

const ITEMS = [
  { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
];

test("未編集(clean)のプリセット編集フォームは別端末での更新に追従する", async () => {
  const { getByRole, rerender } = await renderWithMemoryRouter(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 }]}
    />,
    "/presets",
  );

  expect((getByRole("textbox", { name: "月曜日の新しい名前" }) as HTMLInputElement).value).toBe(
    "月曜日",
  );

  rerender(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜授業", weekday: 1 }]}
    />,
  );

  expect((getByRole("textbox", { name: "月曜授業の新しい名前" }) as HTMLInputElement).value).toBe(
    "月曜授業",
  );
});

test("編集中(dirty)のプリセット編集フォームは別端末での更新で上書きしない", async () => {
  const { getByRole, rerender } = await renderWithMemoryRouter(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekday: 1 }]}
    />,
    "/presets",
  );

  fireEvent.change(getByRole("textbox", { name: "月曜日の新しい名前" }), {
    target: { value: "編集中の名前" },
  });

  rerender(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜授業", weekday: 1 }]}
    />,
  );

  expect((getByRole("textbox", { name: "月曜授業の新しい名前" }) as HTMLInputElement).value).toBe(
    "編集中の名前",
  );
});

test("雛形行の itemId は unwrapItemId(parseItemId(...)) で解決され、例外にならず描画される", async () => {
  const items = [
    { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
    { _id: "i2" as never, categoryId: "c1" as never, name: "英会話", sortOrder: 1 },
  ];
  const { getByRole } = await renderWithMemoryRouter(
    <PresetList
      items={items}
      presets={[
        {
          _id: "p1" as never,
          lines: [
            {
              content: "こんにちは",
              itemId: "i1" as never,
              itemName: "Distinction 2000",
              minutes: 30,
            },
          ],
          name: "月曜日",
          weekday: 1,
        },
      ]}
    />,
    "/presets",
  );

  expect(
    (getByRole("combobox", { name: "月曜日の雛形1のひとこと" }) as HTMLInputElement).value,
  ).toBe("こんにちは");
});
