import { fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { PresetList } from "~/features/catalog/components/preset-list";
import { shimmerId } from "~/lib/shimmer-id";
import { renderWithMemoryRouter } from "~/test-utils/render";
import type { PresetDto } from "~/types/item";

const actionMocks = vi.hoisted(() => ({
  onCreate: vi.fn(),
  onRemove: vi.fn(),
  onUpdate: vi.fn(),
}));

vi.mock("~/features/catalog/hooks/use-catalog-preset-actions", () => ({
  useCatalogPresetActions: () => ({
    onCreate: actionMocks.onCreate,
    onRemove: actionMocks.onRemove,
    onUpdate: actionMocks.onUpdate,
  }),
}));

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: () => ({ data: [] }),
}));

const ITEMS = [
  { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
];
const PRESET_ID = shimmerId<PresetDto["_id"]>("preset-list");

beforeEach(() => {
  vi.clearAllMocks();
});

test("作成フォームで空き曜日を検索・複数選択でき、使用中の曜日は選べない", async () => {
  const { getByRole, getByText } = await renderWithMemoryRouter(
    <PresetList
      items={ITEMS}
      presets={[{ _id: PRESET_ID, lines: [], name: "月曜日", weekdays: [1] }]}
    />,
    "/presets",
  );

  fireEvent.change(getByRole("textbox", { name: "プリセット名" }), {
    target: { value: "平日後半" },
  });
  const weekdayInput = getByRole("combobox", { name: "曜日" });
  fireEvent.click(weekdayInput);
  fireEvent.click(getByRole("option", { name: "月曜日（使用中）" }));
  fireEvent.change(weekdayInput, { target: { value: "該当なし" } });
  expect(getByText("該当する曜日はありません")).toBeDefined();
  fireEvent.change(weekdayInput, { target: { value: "" } });
  fireEvent.click(getByRole("option", { name: "火曜日" }));
  fireEvent.click(getByRole("option", { name: "水曜日" }));
  fireEvent.click(getByRole("button", { name: "プリセットを追加" }));

  await waitFor(() => {
    expect(actionMocks.onCreate).toHaveBeenCalledWith({
      lines: [],
      name: "平日後半",
      weekdays: [2, 3],
    });
  });
});

test("未編集(clean)のプリセット編集フォームは別端末での更新に追従する", async () => {
  const { getByRole, rerender } = await renderWithMemoryRouter(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekdays: [1] }]}
    />,
    "/presets",
  );

  expect((getByRole("textbox", { name: "月曜日の新しい名前" }) as HTMLInputElement).value).toBe(
    "月曜日",
  );

  rerender(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜授業", weekdays: [1] }]}
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
      presets={[{ _id: "p1" as never, lines: [], name: "月曜日", weekdays: [1] }]}
    />,
    "/presets",
  );

  fireEvent.change(getByRole("textbox", { name: "月曜日の新しい名前" }), {
    target: { value: "編集中の名前" },
  });

  rerender(
    <PresetList
      items={ITEMS}
      presets={[{ _id: "p1" as never, lines: [], name: "月曜授業", weekdays: [1] }]}
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
          weekdays: [1],
        },
      ]}
    />,
    "/presets",
  );

  expect(
    (getByRole("combobox", { name: "月曜日の雛形1のひとこと" }) as HTMLInputElement).value,
  ).toBe("こんにちは");
});
