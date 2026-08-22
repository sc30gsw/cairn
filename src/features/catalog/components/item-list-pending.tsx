import { Shimmer } from "@shimmer-from-structure/react";

import { ItemList } from "~/features/catalog/components/item-list";
import {
  catalogShimmerCategories,
  catalogShimmerItems,
} from "~/features/catalog/lib/catalog-shimmer-template";

export function ItemListPending() {
  return (
    <Shimmer loading>
      <ItemList categories={catalogShimmerCategories} items={catalogShimmerItems} />
    </Shimmer>
  );
}
