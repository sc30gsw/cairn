import { Suspense } from "react";

import { ItemList } from "~/features/catalog/components/item-list";
import { ItemListPending } from "~/features/catalog/components/item-list-pending";
import {
  useApplyItemOrder,
  useCreateCategory,
  useCreateItem,
  useRemoveCategory,
  useRemoveItem,
  useRenameCategory,
  useRenameItem,
} from "~/features/catalog/hooks/catalog-mutations";
import { useItemsList } from "~/features/catalog/hooks/catalog-queries";
import { useCategoriesList } from "~/hooks/use-categories-list";
import { runMutation } from "~/lib/run-mutation";

export function ItemsPage() {
  return (
    <Suspense fallback={<ItemListPending />}>
      <ItemsReady />
    </Suspense>
  );
}

function ItemsReady() {
  const { data: categories } = useCategoriesList();
  const { data: items } = useItemsList();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const removeCategory = useRemoveCategory();
  const createItem = useCreateItem();
  const renameItem = useRenameItem();
  const applyItemOrder = useApplyItemOrder();
  const removeItem = useRemoveItem();

  return (
    <ItemList
      categories={categories}
      items={items}
      onApplyItemOrder={(input) => {
        void runMutation(() => applyItemOrder(input), { successMessage: "並び順を更新しました" });
      }}
      onCreateCategory={(input) => {
        void runMutation(() => createCategory.mutateAsync(input), {
          successMessage: "カテゴリーを追加しました",
        });
      }}
      onCreateItem={(input) => {
        void runMutation(() => createItem.mutateAsync(input), {
          successMessage: "項目を追加しました",
        });
      }}
      onRemoveCategory={(categoryId) => {
        void runMutation(() => removeCategory.mutateAsync({ categoryId }), {
          successMessage: "カテゴリーを削除しました",
        });
      }}
      onRemoveItem={(itemId) => {
        void runMutation(() => removeItem.mutateAsync({ itemId }), {
          successMessage: "項目を削除しました",
        });
      }}
      onRenameCategory={(input) => {
        void runMutation(() => renameCategory.mutateAsync(input), {
          successMessage: "カテゴリー名を変更しました",
        });
      }}
      onRenameItem={(input) => {
        void runMutation(() => renameItem(input), { successMessage: "項目名を変更しました" });
      }}
    />
  );
}
