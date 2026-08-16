import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ItemList } from "~/features/catalog/components/item-list";
import { useCategoriesList, useItemsList } from "~/features/catalog/hooks/catalog-queries";
import { useEnsureCatalog } from "~/features/catalog/hooks/use-ensure-catalog";
import { useApplyItemOrder, useRenameItem } from "~/features/catalog/hooks/use-rename-item";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
});

function ItemsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<PendingComponent />}>
        <ItemsReady />
      </Suspense>
    </OwnerGate>
  );
}

function ItemsReady() {
  useEnsureCatalog();
  const { data: categories } = useCategoriesList();
  const { data: items } = useItemsList();
  const createCategory = useConvexMutation(api.categories.create);
  const renameCategory = useConvexMutation(api.categories.rename);
  const removeCategory = useConvexMutation(api.categories.remove);
  const createItem = useConvexMutation(api.items.create);
  const renameItem = useRenameItem();
  const applyItemOrder = useApplyItemOrder();
  const removeItem = useConvexMutation(api.items.remove);

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
