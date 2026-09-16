import { fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { MutationFailedError } from "~/lib/errors";
import { renderWithMemoryRouter } from "~/test-utils/render";

const catalogActions = vi.hoisted(() => ({
  onApplyItemOrder: vi.fn(),
  onCreateCategory: vi.fn(),
  onCreateItem: vi.fn(),
  onRemoveCategory: vi.fn(),
  onRemoveItem: vi.fn(),
  onRenameCategory: vi.fn(),
  onRenameItem: vi.fn(),
  onCreatePreset: vi.fn(),
  onRemovePreset: vi.fn(),
  onUpdatePreset: vi.fn(),
}));

vi.mock("~/features/catalog/hooks/use-catalog-item-actions", () => ({
  useCatalogItemActions: () => ({
    onApplyItemOrder: catalogActions.onApplyItemOrder,
    onCreateCategory: catalogActions.onCreateCategory,
    onCreateItem: catalogActions.onCreateItem,
    onRemoveCategory: catalogActions.onRemoveCategory,
    onRemoveItem: catalogActions.onRemoveItem,
    onRenameCategory: catalogActions.onRenameCategory,
    onRenameItem: catalogActions.onRenameItem,
  }),
}));

vi.mock("~/features/catalog/hooks/use-catalog-preset-actions", () => ({
  useCatalogPresetActions: () => ({
    onCreate: catalogActions.onCreatePreset,
    onRemove: catalogActions.onRemovePreset,
    onUpdate: catalogActions.onUpdatePreset,
  }),
}));

vi.mock("~/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return {
    useDnd: () => dnd,
  };
});

vi.mock("~/hooks/use-recent-concrete-actions", () => ({
  useRecentConcreteActions: () => ({ data: [] }),
}));

test("カテゴリーの下に学習内容が並び、カテゴリーも編集できる", { timeout: 10_000 }, async () => {
  const { getByRole } = await renderWithMemoryRouter(
    <>
      <ItemList
        categories={[
          { _id: "c1" as never, name: "多聴", sortOrder: 1 },
          { _id: "c2" as never, name: "英会話", sortOrder: 2 },
        ]}
        items={[
          { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        ]}
      />
      <PresetList
        items={[
          { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        ]}
        presets={[
          {
            _id: "p1" as never,
            lines: [
              { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
              {
                content: "英会話アプリを10分開く",
                itemId: "i1" as never,
                itemName: "英会話",
                minutes: 20,
              },
            ],
            name: "月曜日",
            weekdays: [1],
          },
        ]}
      />
    </>,
    "/presets",
  );
  expect(getByRole("button", { name: "カテゴリーを追加" })).toBeDefined();
  expect(getByRole("button", { name: "多聴を保存" })).toBeDefined();
  expect(getByRole("button", { name: "多聴を削除" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を保存" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を削除" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を別のカテゴリーへ移動" })).toBeDefined();
  expect(getByRole("button", { name: "プリセットを追加" })).toBeDefined();
  expect(getByRole("combobox", { name: "曜日" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を保存" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を削除" })).toBeDefined();
  expect(getByRole("combobox", { name: "月曜日の雛形1の項目" })).toBeDefined();
  expect(getByRole("combobox", { name: "月曜日の雛形2のひとこと" })).toBeDefined();
  expect(getByRole("button", { name: "雛形を足す" })).toBeDefined();
});

test("プリセット追加は未登録の曜日だけ選べ、1つだけならそれが初期値", async () => {
  const { getByRole } = await renderWithMemoryRouter(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
      ]}
      presets={[
        {
          _id: "p1" as never,
          lines: [],
          name: "月曜日",
          weekdays: [1],
        },
        {
          _id: "p2" as never,
          lines: [],
          name: "火曜日",
          weekdays: [2],
        },
        {
          _id: "p3" as never,
          lines: [],
          name: "水曜日",
          weekdays: [3],
        },
        {
          _id: "p4" as never,
          lines: [],
          name: "木曜日",
          weekdays: [4],
        },
        {
          _id: "p5" as never,
          lines: [],
          name: "金曜日",
          weekdays: [5],
        },
        {
          _id: "p6" as never,
          lines: [],
          name: "土曜日",
          weekdays: [6],
        },
      ]}
    />,
    "/presets",
  );

  const weekday = getByRole("combobox", { name: "曜日" });
  expect((weekday as HTMLInputElement).value).toBe("");
  expect(weekday.parentElement?.parentElement?.textContent).toContain("日曜日");
});

test("プリセット追加は未登録曜日が2つ以上なら初期値は空", async () => {
  const { getByRole } = await renderWithMemoryRouter(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
      ]}
      presets={[
        {
          _id: "p1" as never,
          lines: [],
          name: "月曜日",
          weekdays: [1],
        },
      ]}
    />,
    "/presets",
  );

  const weekday = getByRole("combobox", { name: "曜日" });
  expect((weekday as HTMLInputElement).value).toBe("");
  expect(weekday.getAttribute("placeholder")).toBe("曜日を選択");
});

test("プリセット雛形を足すと未使用の項目が選ばれる", async () => {
  const { getByRole } = await renderWithMemoryRouter(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        { _id: "i2" as never, categoryId: "c1" as never, name: "英会話", sortOrder: 1 },
      ]}
      presets={[
        {
          _id: "p1" as never,
          lines: [
            { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
          ],
          name: "月曜日",
          weekdays: [1],
        },
      ]}
    />,
    "/presets",
  );

  fireEvent.click(getByRole("button", { name: "雛形を足す" }));
  expect((getByRole("combobox", { name: "月曜日の雛形2の項目" }) as HTMLInputElement).value).toBe(
    "英会話",
  );
});

test("プリセット雛形ですべての項目を使うと雛形を足すは無効", async () => {
  const { getByRole } = await renderWithMemoryRouter(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        { _id: "i2" as never, categoryId: "c1" as never, name: "英会話", sortOrder: 1 },
      ]}
      presets={[
        {
          _id: "p1" as never,
          lines: [
            { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
            { content: "", itemId: "i2" as never, itemName: "英会話", minutes: 20 },
          ],
          name: "月曜日",
          weekdays: [1],
        },
      ]}
    />,
    "/presets",
  );

  const addLine = getByRole("button", { name: "雛形を足す" });
  expect((addLine as HTMLButtonElement).disabled).toBe(true);
});

const CATEGORY = { _id: "c1" as never, name: "多聴", sortOrder: 1 };
const SAVE_FAILED = new MutationFailedError({
  cause: new Error("offline"),
  message: "保存失敗",
});

test("カテゴリーを追加すると新しいカテゴリーは空になる", async () => {
  catalogActions.onCreateCategory.mockReset();
  catalogActions.onCreateCategory.mockResolvedValue(Result.ok(null));
  const { getByRole } = await renderWithMemoryRouter(
    <ItemList categories={[]} items={[]} />,
    "/presets",
  );
  fireEvent.change(getByRole("textbox", { name: "新しいカテゴリー" }), {
    target: { value: "検証カテゴリ2" },
  });
  fireEvent.click(getByRole("button", { name: "カテゴリーを追加" }));

  await waitFor(() => {
    expect(catalogActions.onCreateCategory).toHaveBeenCalledWith({ name: "検証カテゴリ2" });
  });
  expect((getByRole("textbox", { name: "新しいカテゴリー" }) as HTMLInputElement).value).toBe("");
});

test("カテゴリーの追加失敗では入力を消さない", async () => {
  catalogActions.onCreateCategory.mockReset();
  catalogActions.onCreateCategory.mockResolvedValue(Result.err(SAVE_FAILED));
  const { getByRole } = await renderWithMemoryRouter(
    <ItemList categories={[]} items={[]} />,
    "/presets",
  );
  fireEvent.change(getByRole("textbox", { name: "新しいカテゴリー" }), {
    target: { value: "検証カテゴリ2" },
  });
  fireEvent.click(getByRole("button", { name: "カテゴリーを追加" }));

  await waitFor(() => expect(catalogActions.onCreateCategory).toHaveBeenCalledOnce());
  expect((getByRole("textbox", { name: "新しいカテゴリー" }) as HTMLInputElement).value).toBe(
    "検証カテゴリ2",
  );
});

test("学習内容を追加すると追加欄は空になり項目名は残る", async () => {
  catalogActions.onCreateItem.mockReset();
  catalogActions.onCreateItem.mockResolvedValue(Result.ok(null));
  const { getByRole, rerender } = await renderWithMemoryRouter(
    <ItemList categories={[CATEGORY]} items={[]} />,
    "/presets",
  );
  fireEvent.change(getByRole("textbox", { name: "多聴に学習内容を追加" }), {
    target: { value: "検証項目2" },
  });
  fireEvent.click(getByRole("button", { name: "多聴に学習内容を追加" }));

  await waitFor(() => {
    expect(catalogActions.onCreateItem).toHaveBeenCalledWith({
      categoryId: "c1",
      name: "検証項目2",
    });
  });
  expect((getByRole("textbox", { name: "多聴に学習内容を追加" }) as HTMLInputElement).value).toBe(
    "",
  );

  rerender(
    <ItemList
      categories={[CATEGORY]}
      items={[{ _id: "i2" as never, categoryId: "c1" as never, name: "検証項目2", sortOrder: 0 }]}
    />,
  );
  expect((getByRole("textbox", { name: "検証項目2の名前" }) as HTMLInputElement).value).toBe(
    "検証項目2",
  );
});

test("学習内容の追加失敗では入力を消さない", async () => {
  catalogActions.onCreateItem.mockReset();
  catalogActions.onCreateItem.mockResolvedValue(Result.err(SAVE_FAILED));
  const { getByRole } = await renderWithMemoryRouter(
    <ItemList categories={[CATEGORY]} items={[]} />,
    "/presets",
  );
  fireEvent.change(getByRole("textbox", { name: "多聴に学習内容を追加" }), {
    target: { value: "検証項目2" },
  });
  fireEvent.click(getByRole("button", { name: "多聴に学習内容を追加" }));

  await waitFor(() => expect(catalogActions.onCreateItem).toHaveBeenCalledOnce());
  expect((getByRole("textbox", { name: "多聴に学習内容を追加" }) as HTMLInputElement).value).toBe(
    "検証項目2",
  );
});

test("カテゴリー名の保存後も編集欄は新しい名前のまま", async () => {
  catalogActions.onRenameCategory.mockReset();
  catalogActions.onRenameCategory.mockResolvedValue(Result.ok(null));
  const { getByRole } = await renderWithMemoryRouter(
    <ItemList categories={[CATEGORY]} items={[]} />,
    "/presets",
  );
  fireEvent.change(getByRole("textbox", { name: "多聴の名前" }), {
    target: { value: "検証カテゴリ2" },
  });
  fireEvent.click(getByRole("button", { name: "多聴を保存" }));

  await waitFor(() => {
    expect(catalogActions.onRenameCategory).toHaveBeenCalledWith({
      categoryId: "c1",
      name: "検証カテゴリ2",
    });
  });
  expect((getByRole("textbox", { name: "多聴の名前" }) as HTMLInputElement).value).toBe(
    "検証カテゴリ2",
  );
});
