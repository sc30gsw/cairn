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
import { useCategoriesList, useItemsList } from "~/features/catalog/hooks/catalog-queries";

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
        void applyItemOrder(input);
      }}
      onCreateCategory={(input) => {
        void createCategory.mutateAsync(input);
      }}
      onCreateItem={(input) => {
        void createItem.mutateAsync(input);
      }}
      onRemoveCategory={(categoryId) => {
        void removeCategory.mutateAsync({ categoryId });
      }}
      onRemoveItem={(itemId) => {
        void removeItem.mutateAsync({ itemId });
      }}
      onRenameCategory={(input) => {
        void renameCategory.mutateAsync(input);
      }}
      onRenameItem={(input) => {
        void renameItem(input);
      }}
    />
  );
}
