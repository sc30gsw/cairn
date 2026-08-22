import { Shimmer } from "@shimmer-from-structure/react";

import { PresetList } from "~/features/catalog/components/preset-list";
import {
  catalogShimmerItems,
  catalogShimmerPresets,
} from "~/features/catalog/lib/catalog-shimmer-template";

export function PresetListPending() {
  return (
    <Shimmer loading>
      <PresetList items={catalogShimmerItems} presets={catalogShimmerPresets} />
    </Shimmer>
  );
}
