import { expect, test, vi } from "vite-plus/test";

import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { renderWithMantine } from "~/test-utils/render";

test("項目とプリセットの編集が見える", () => {
  const onCreate = vi.fn();
  const { getByRole } = renderWithMantine(
    <>
      <ItemList
        items={[{ _id: "i1" as never, category: "多聴", name: "Distinction 2000" }]}
        onCreate={onCreate}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />
      <PresetList
        onRemove={vi.fn()}
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
      />
    </>,
  );
  expect(getByRole("button", { name: "項目を追加" })).toBeDefined();
  expect(getByRole("button", { name: "Distinction 2000を削除" })).toBeDefined();
  expect(getByRole("button", { name: "月曜日を削除" })).toBeDefined();
});
