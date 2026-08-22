import {
  useCreatePreset,
  useRemovePreset,
  useUpdatePreset,
} from "~/features/catalog/hooks/catalog-mutations";
import type {
  CreatePresetInput,
  RemovePresetInput,
  UpdatePresetInput,
} from "~/features/catalog/types/mutations";
import { runMutation } from "~/lib/run-mutation";

export type CatalogPresetActions = ReturnType<typeof useCatalogPresetActions>;

export function useCatalogPresetActions() {
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const removePreset = useRemovePreset();

  return {
    onCreate: (input: CreatePresetInput) =>
      runMutation(() => createPreset.mutateAsync(input), {
        successMessage: "プリセットを追加しました",
      }).then(() => undefined),
    onRemove: (presetId: RemovePresetInput["presetId"]) =>
      runMutation(() => removePreset.mutateAsync({ presetId }), {
        successMessage: "プリセットを削除しました",
      }).then(() => undefined),
    onUpdate: (input: UpdatePresetInput) =>
      runMutation(() => updatePreset.mutateAsync(input), {
        successMessage: "プリセットを更新しました",
      }).then(() => undefined),
  };
}
