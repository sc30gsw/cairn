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

export function PresetsPage({ focusWeekday }: { focusWeekday?: number }) {
  return (
    <Suspense fallback={<PresetListPending />}>
      <PresetsReady focusWeekday={focusWeekday} />
    </Suspense>
  );
}

function PresetsReady({ focusWeekday }: { focusWeekday?: number }) {
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const removePreset = useRemovePreset();

  return (
    <PresetList
      focusWeekday={focusWeekday}
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
