import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/catalog/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return {
    useDnd: () => dnd,
  };
});

test("カテゴリーの下に学習内容が並び、カテゴリーも編集できる", { timeout: 10_000 }, () => {
  const { getByRole, getByLabelText } = renderWithMantine(
    <>
      <ItemList
        categories={[
          { _id: "c1" as never, name: "多聴", sortOrder: 1 },
          { _id: "c2" as never, name: "英会話", sortOrder: 2 },
        ]}
        items={[
          { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        ]}
        onCreateCategory={vi.fn()}
        onCreateItem={vi.fn()}
        onRemoveCategory={vi.fn()}
        onRemoveItem={vi.fn()}
        onRenameCategory={vi.fn()}
        onRenameItem={vi.fn()}
        onApplyItemOrder={vi.fn()}
      />
      <PresetList
        items={[
          { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        ]}
        onCreate={vi.fn()}
        onRemove={vi.fn()}
        onUpdate={vi.fn()}
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
            weekday: 1,
          },
        ]}
      />
    </>,
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
  expect(getByLabelText("月曜日の雛形2の具体的手順")).toBeDefined();
  expect(getByRole("button", { name: "雛形を足す" })).toBeDefined();
});

test("プリセット追加は未登録の曜日だけ選べ、1つだけならそれが初期値", () => {
  const { getByRole } = renderWithMantine(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
      ]}
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
  expect((weekday as HTMLInputElement).value).toBe("日曜日");
});

test("プリセット追加は未登録曜日が2つ以上なら初期値は空", () => {
  const { getByRole } = renderWithMantine(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
      ]}
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
  expect((weekday as HTMLInputElement).value).toBe("");
  expect(weekday.getAttribute("placeholder")).toBe("曜日を選ぶ");
});

test("プリセット雛形を足すと未使用の項目が選ばれる", () => {
  const { getByRole } = renderWithMantine(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        { _id: "i2" as never, categoryId: "c1" as never, name: "英会話", sortOrder: 1 },
      ]}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
      onUpdate={vi.fn()}
      presets={[
        {
          _id: "p1" as never,
          lines: [
            { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
          ],
          name: "月曜日",
          weekday: 1,
        },
      ]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "雛形を足す" }));
  expect((getByRole("combobox", { name: "月曜日の雛形2の項目" }) as HTMLInputElement).value).toBe(
    "英会話",
  );
});

test("プリセット雛形ですべての項目を使うと雛形を足すは無効", () => {
  const { getByRole } = renderWithMantine(
    <PresetList
      items={[
        { _id: "i1" as never, categoryId: "c1" as never, name: "Distinction 2000", sortOrder: 0 },
        { _id: "i2" as never, categoryId: "c1" as never, name: "英会話", sortOrder: 1 },
      ]}
      onCreate={vi.fn()}
      onRemove={vi.fn()}
      onUpdate={vi.fn()}
      presets={[
        {
          _id: "p1" as never,
          lines: [
            { content: "", itemId: "i1" as never, itemName: "Distinction 2000", minutes: 30 },
            { content: "", itemId: "i2" as never, itemName: "英会話", minutes: 20 },
          ],
          name: "月曜日",
          weekday: 1,
        },
      ]}
    />,
  );

  const addLine = getByRole("button", { name: "雛形を足す" });
  expect((addLine as HTMLButtonElement).disabled).toBe(true);
});
