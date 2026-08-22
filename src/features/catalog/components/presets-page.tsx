import { Suspense } from "react";

import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import { useItemsList, usePresetsList } from "~/features/catalog/hooks/catalog-queries";

export function PresetsPage() {
  return (
    <Suspense fallback={<PresetListPending />}>
      <PresetsReady />
    </Suspense>
  );
}

function PresetsReady() {
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();

  return <PresetList items={items} presets={presets} />;
}
