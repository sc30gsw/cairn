import { Suspense } from "react";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import {
  useCreatePreset,
  useRemovePreset,
  useUpdatePreset,
} from "~/features/catalog/hooks/catalog-mutations";
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
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const removePreset = useRemovePreset();

  return (
    <ConcreteActionTour screen="presets">
      <PresetList
        items={items}
        onCreate={(input) => {
          void createPreset.mutateAsync(input);
        }}
        onRemove={(presetId) => {
          void removePreset.mutateAsync({ presetId });
        }}
        onUpdate={(input) => {
          void updatePreset.mutateAsync(input);
        }}
        presets={presets}
      />
    </ConcreteActionTour>
  );
}
