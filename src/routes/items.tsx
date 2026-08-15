import { convexQuery } from "@convex-dev/react-query";
import { Loader, Stack, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ItemList } from "~/features/catalog/components/item-list";
import { PresetList } from "~/features/catalog/components/preset-list";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
});

function ItemsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<Loader aria-label="読み込み中" />}>
        <ItemsReady />
      </Suspense>
    </OwnerGate>
  );
}

function ItemsReady() {
  const { data: items } = useSuspenseQuery(convexQuery(api.items.list, {}));
  const { data: presets } = useSuspenseQuery(convexQuery(api.presets.list, {}));
  const createItem = useConvexMutation(api.items.create);
  const renameItem = useConvexMutation(api.items.rename);
  const removeItem = useConvexMutation(api.items.remove);
  const removePreset = useConvexMutation(api.presets.remove);

  return (
    <Stack gap="lg">
      <Title order={1}>項目とプリセット</Title>
      <ItemList
        items={items}
        onCreate={(input) => {
          void createItem.mutateAsync(input);
        }}
        onRemove={(itemId) => {
          void removeItem.mutateAsync({ itemId });
        }}
        onRename={(input) => {
          void renameItem.mutateAsync(input);
        }}
      />
      <PresetList
        onRemove={(presetId) => {
          void removePreset.mutateAsync({ presetId });
        }}
        presets={presets}
      />
    </Stack>
  );
}
