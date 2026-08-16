import { Suspense } from "react";

import { PresetList } from "~/features/catalog/components/preset-list";
import { PresetListPending } from "~/features/catalog/components/preset-list-pending";
import {
  useCreatePreset,
  useRemovePreset,
  useUpdatePreset,
} from "~/features/catalog/hooks/catalog-mutations";
import { useItemsList, usePresetsList } from "~/features/catalog/hooks/catalog-queries";
import { runMutation } from "~/lib/run-mutation";

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
    <PresetList
      items={items}
      onCreate={(input) => {
        void runMutation(() => createPreset.mutateAsync(input), {
          successMessage: "プリセットを追加しました",
        });
      }}
      onRemove={(presetId) => {
        void runMutation(() => removePreset.mutateAsync({ presetId }), {
          successMessage: "プリセットを削除しました",
        });
      }}
      onUpdate={(input) => {
        void runMutation(() => updatePreset.mutateAsync(input), {
          successMessage: "プリセットを更新しました",
        });
      }}
      presets={presets}
    />
  );
}
