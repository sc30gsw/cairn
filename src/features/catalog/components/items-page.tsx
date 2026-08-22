import { Suspense } from "react";

import { ItemList } from "~/features/catalog/components/item-list";
import { ItemListPending } from "~/features/catalog/components/item-list-pending";
import { useItemsList } from "~/features/catalog/hooks/catalog-queries";
import { useCategoriesList } from "~/hooks/use-categories-list";

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

  return <ItemList categories={categories} items={items} />;
}
