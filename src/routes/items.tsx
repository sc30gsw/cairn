import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { OwnerGate } from "~/features/auth/components/owner-gate";
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

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
});

function ItemsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<ItemListPending />}>
        <ItemsReady />
      </Suspense>
    </OwnerGate>
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
      onApplyItemOrder={(input) => {
        void applyItemOrder(input);
      }}
    />
  );
}
