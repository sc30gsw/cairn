import { expect, test, vi } from "vite-plus/test";

import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { renderWithMantine } from "~/test-utils/render";

test("カテゴリーの下に学習内容が並び、カテゴリーも編集できる", () => {
  const { getByRole, getByLabelText } = renderWithMantine(
    <>
      <ItemList
        categories={[{ _id: "c1" as never, name: "多聴", sortOrder: 1 }]}
        items={[{ _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000" }]}
        onCreateCategory={vi.fn()}
        onCreateItem={vi.fn()}
        onRemoveCategory={vi.fn()}
        onRemoveItem={vi.fn()}
        onRenameCategory={vi.fn()}
        onRenameItem={vi.fn()}
      />
      <PresetList
        items={[{ _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000" }]}
        onCreate={vi.fn()}
        onRemove={vi.fn()}
        onUpdate={vi.fn()}
        presets={[
          {
            _id: "p1" as never,
            lines: [
              { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
              { content: "会話", itemId: "i1" as never, itemName: "英会話", minutes: 20 },
            ],
            name: "月曜日",
            weekday: 1,
          },
        ]}
      />
    </>,
  );
  expect(getByRole("button", { name: "カテゴリーを追加" })).toBeDefined();
  expect(getByRole("button", { name: "学習内容を追加" })).toBeDefined();
  expect(getByRole("button", { name: "多聴を更新" })).toBeDefined();
  expect(getByRole("button", { name: "多聴を削除" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を更新" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を削除" })).toBeDefined();
  expect(getByRole("combobox", { name: "Distinction 2000のカテゴリー" })).toBeDefined();
  expect(getByRole("button", { name: "プリセットを追加" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を保存" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を削除" })).toBeDefined();
  expect(getByRole("combobox", { name: "月曜日の雛形1の項目" })).toBeDefined();
  expect(getByLabelText("月曜日の雛形2の内容")).toBeDefined();
  expect(getByRole("button", { name: "雛形を足す" })).toBeDefined();
});
