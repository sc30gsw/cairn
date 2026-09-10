import type { FunctionReturnType } from "convex/server";
import { applyItemOrderToList, applyRenameToList } from "~domain/itemOrder";

import { api } from "~/../convex/_generated/api";
import { optimisticId } from "~/lib/optimistic-id";
import { useConvexMutation } from "~/lib/use-convex-mutation";

type CategoryList = FunctionReturnType<typeof api.queries.categories.list.list>;
type ItemList = FunctionReturnType<typeof api.queries.items.list.list>;
type PresetList = FunctionReturnType<typeof api.queries.presets.list.list>;

export function useCreateCategory() {
  const mutation = useConvexMutation(api.mutations.categories.create.create);
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current: CategoryList | undefined = localStore.getQuery(
      api.queries.categories.list.list,
      {},
    );
    if (current === undefined) {
      return;
    }
    const sortOrder = current.reduce((max, category) => Math.max(max, category.sortOrder), -1) + 1;
    const category = {
      _id: optimisticId("categories"),
      name: args.name.trim(),
      sortOrder,
    } satisfies CategoryList[number];
    localStore.setQuery(api.queries.categories.list.list, {}, [...current, category]);
  });
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
  const mutation = useConvexMutation(api.mutations.items.create.create);
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current: ItemList | undefined = localStore.getQuery(api.queries.items.list.list, {});
    if (current === undefined) {
      return;
    }
    const sortOrder =
      current
        .filter((item: ItemList[number]) => item.categoryId === args.categoryId)
        .reduce((max: number, item: ItemList[number]) => Math.max(max, item.sortOrder), -1) + 1;
    const item = {
      _id: optimisticId("items"),
      categoryId: args.categoryId,
      name: args.name.trim(),
      sortOrder,
    } satisfies ItemList[number];
    localStore.setQuery(api.queries.items.list.list, {}, [...current, item]);
  });
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
  const mutation = useConvexMutation(api.mutations.presets.create.create);
  return mutation.withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.queries.presets.list.list, {});
    if (current === undefined) {
      return;
    }
    const items: ItemList = localStore.getQuery(api.queries.items.list.list, {}) ?? [];
    const itemNames = new Map(items.map((item: ItemList[number]) => [item._id, item.name]));
    const weekdays = args.weekdays ?? (args.weekday === undefined ? [] : [args.weekday]);
    const preset = {
      _id: optimisticId("presets"),
      lines: args.lines.map((line) => ({
        ...line,
        content: line.content.trim(),
        itemName: itemNames.get(line.itemId) ?? "不明",
      })),
      name: args.name.trim(),
      weekday: weekdays[0],
      weekdays,
    } satisfies PresetList[number];
    localStore.setQuery(api.queries.presets.list.list, {}, [...current, preset]);
  });
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
