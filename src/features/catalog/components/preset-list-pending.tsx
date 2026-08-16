import { Shimmer } from "@shimmer-from-structure/react";

import { PresetList } from "~/features/catalog/components/preset-list";
import {
  catalogShimmerItems,
  catalogShimmerPresets,
} from "~/features/catalog/lib/catalog-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function PresetListPending() {
  return (
    <Shimmer loading>
      <PresetList
        items={catalogShimmerItems}
        onCreate={shimmerNoop}
        onRemove={shimmerNoop}
        onUpdate={shimmerNoop}
        presets={catalogShimmerPresets}
      />
    </Shimmer>
  );
}
