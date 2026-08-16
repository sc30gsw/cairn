import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import {
  useCreatePreset,
  useRemovePreset,
  useUpdatePreset,
} from "~/features/catalog/hooks/catalog-mutations";
import { useItemsList, usePresetsList } from "~/features/catalog/hooks/catalog-queries";
import { useEnsureCatalog } from "~/features/catalog/hooks/use-ensure-catalog";

export const Route = createFileRoute("/presets")({
  component: PresetsRoute,
});

function PresetsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<PresetListPending />}>
        <PresetsReady />
      </Suspense>
    </OwnerGate>
  );
}

function PresetsReady() {
  useEnsureCatalog();
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const removePreset = useRemovePreset();

  return (
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
  );
}
