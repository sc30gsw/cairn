import { Shimmer } from "@shimmer-from-structure/react";

import { ItemList } from "~/features/catalog/components/item-list";
import {
  catalogShimmerCategories,
  catalogShimmerItems,
} from "~/features/catalog/lib/catalog-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function ItemListPending() {
  return (
    <Shimmer loading>
      <ItemList
        categories={catalogShimmerCategories}
        items={catalogShimmerItems}
        onApplyItemOrder={shimmerNoop}
        onCreateCategory={shimmerNoop}
        onCreateItem={shimmerNoop}
        onRemoveCategory={shimmerNoop}
        onRemoveItem={shimmerNoop}
        onRenameCategory={shimmerNoop}
        onRenameItem={shimmerNoop}
      />
    </Shimmer>
  );
}
