import type { FunctionReturnType } from "convex/server";
import { applyItemOrderToList, applyRenameToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

type ItemList = FunctionReturnType<typeof api.queries.items.list.list>;
type PresetList = FunctionReturnType<typeof api.queries.presets.list.list>;

export function useCreateCategory() {
  return useConvexMutation(api.mutations.categories.create.create);
}

export function useRenameCategory() {
  const mutation = useConvexMutation(api.mutations.categories.rename.rename);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.categories.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.categories.list.list,
      {},
      current.map((category) =>
        category._id === args.categoryId ? { ...category, name: args.name.trim() } : category,
      ),
    );
  });
}

export function useRemoveCategory() {
  const mutation = useConvexMutation(api.mutations.categories.remove.remove);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.categories.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.categories.list.list,
      {},
      current.filter((category) => category._id !== args.categoryId),
    );
  });
}

export function useCreateItem() {
  return useConvexMutation(api.mutations.items.create.create);
}

export function useRemoveItem() {
  const mutation = useConvexMutation(api.mutations.items.remove.remove);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.items.list.list,
      {},
      current.filter((item: ItemList[number]) => item._id !== args.itemId),
    );
  });
}

export function useApplyItemOrder() {
  const mutation = useConvexMutation(api.mutations.items.applyOrder.applyOrder);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.items.list.list,
      {},
      applyItemOrderToList(current, args.updates),
    );
  });
}

export function useRenameItem() {
  const mutation = useConvexMutation(api.mutations.items.rename.rename);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.items.list.list, {}, applyRenameToList(current, args));
  });
}

export function useCreatePreset() {
  return useConvexMutation(api.mutations.presets.create.create);
}

export function useUpdatePreset() {
  const mutation = useConvexMutation(api.mutations.presets.update.update);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.presets.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.presets.list.list,
      {},
      current.map((preset: PresetList[number]) => {
        if (preset._id !== args.presetId) {
          return preset;
        }
        const itemNames = new Map(
          preset.lines.map((line: PresetList[number]["lines"][number]) => [
            line.itemId,
            line.itemName,
          ]),
        );
        const weekdays = args.weekdays ?? (args.weekday === undefined ? [] : [args.weekday]);
        return {
          ...preset,
          lines: args.lines.map((line) => ({
            ...line,
            itemName: itemNames.get(line.itemId) ?? "不明",
          })),
          name: args.name.trim(),
          weekday: weekdays[0],
          weekdays,
        };
      }),
    );
  });
}

export function useSavePresetSettings() {
  const mutation = useConvexMutation(api.mutations.presets.saveSettings.saveSettings);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.presets.settings.settings, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(api.queries.presets.settings.settings, {}, args);
  });
}

export function useRemovePreset() {
  const mutation = useConvexMutation(api.mutations.presets.remove.remove);

  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.presets.list.list, {});
    if (current === undefined) {
      return;
    }
    localStore.setQuery(
      api.queries.presets.list.list,
      {},
      current.filter((preset: PresetList[number]) => preset._id !== args.presetId),
    );
  });
}
