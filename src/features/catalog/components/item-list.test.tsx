import { expect, test, vi } from "vite-plus/test";

import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { renderWithMantine } from "~/test-utils/render";

test("項目とプリセットの編集が見える", () => {
  const onCreate = vi.fn();
  const onUpdate = vi.fn();
  const { getByRole, getByLabelText } = renderWithMantine(
    <>
      <ItemList
        items={[{ _id: "i1" as never, category: "多聴", name: "Distinction 2000" }]}
        onCreate={onCreate}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
      <PresetList
        items={[{ _id: "i1" as never, category: "多聴", name: "Distinction 2000" }]}
        onCreate={vi.fn()}
        onRemove={vi.fn()}
        onUpdate={onUpdate}
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
  expect(getByRole("button", { name: "項目を追加" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を改名" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を削除" })).toBeDefined();
  expect(getByRole("button", { name: "プリセットを追加" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を保存" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を削除" })).toBeDefined();
  expect(getByRole("combobox", { name: "月曜日の雛形1の項目" })).toBeDefined();
  expect(getByLabelText("月曜日の雛形2の内容")).toBeDefined();
  expect(getByRole("button", { name: "雛形を足す" })).toBeDefined();
});
