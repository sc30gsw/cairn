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
  expect(getByRole("combobox", { name: "曜日" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を保存" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を削除" })).toBeDefined();
  expect(getByRole("combobox", { name: "月曜日の雛形1の項目" })).toBeDefined();
  expect(getByLabelText("月曜日の雛形2の内容")).toBeDefined();
  expect(getByRole("button", { name: "雛形を足す" })).toBeDefined();
});

test("プリセット追加は未登録の曜日だけ選べ、1つだけならそれが初期値", () => {
  const { getByRole, queryByRole } = renderWithMantine(
    <PresetList
      items={[{ _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000" }]}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
      onUpdate={vi.fn()}
      presets={[
        {
          _id: "p1" as never,
          lines: [],
          name: "月曜日",
          weekday: 1,
        },
        {
          _id: "p2" as never,
          lines: [],
          name: "火曜日",
          weekday: 2,
        },
        {
          _id: "p3" as never,
          lines: [],
          name: "水曜日",
          weekday: 3,
        },
        {
          _id: "p4" as never,
          lines: [],
          name: "木曜日",
          weekday: 4,
        },
        {
          _id: "p5" as never,
          lines: [],
          name: "金曜日",
          weekday: 5,
        },
        {
          _id: "p6" as never,
          lines: [],
          name: "土曜日",
          weekday: 6,
        },
      ]}
    />,
  );

  const weekday = getByRole("combobox", { name: "曜日" });
  expect(weekday.textContent).toBe("日曜日");
  expect(queryByRole("option", { hidden: true, name: "月曜日" })).toBeNull();
  expect(getByRole("option", { hidden: true, name: "日曜日" })).toBeDefined();
});

test("プリセット追加は未登録曜日が2つ以上なら初期値は空", () => {
  const { getByRole } = renderWithMantine(
    <PresetList
      items={[{ _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000" }]}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
      onUpdate={vi.fn()}
      presets={[
        {
          _id: "p1" as never,
          lines: [],
          name: "月曜日",
          weekday: 1,
        },
      ]}
    />,
  );

  const weekday = getByRole("combobox", { name: "曜日" });
  expect(weekday.textContent).toBe("曜日を選ぶ");
});
