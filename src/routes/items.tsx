import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ItemList } from "~/features/catalog/components/item-list";
import { useEnsureCatalog } from "~/features/catalog/hooks/use-ensure-catalog";
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
  const { data: categories } = useSuspenseQuery(convexQuery(api.categories.list, {}));
  const { data: items } = useSuspenseQuery(convexQuery(api.items.list, {}));
  const createCategory = useConvexMutation(api.categories.create);
  const renameCategory = useConvexMutation(api.categories.rename);
  const removeCategory = useConvexMutation(api.categories.remove);
  const createItem = useConvexMutation(api.items.create);
  const renameItem = useConvexMutation(api.items.rename);
  const reorderItems = useConvexMutation(api.items.reorder);
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
      onRenameItem={(input) => renameItem.mutateAsync(input)}
      onReorderItems={(input) => reorderItems.mutateAsync(input)}
    />
  );
}
