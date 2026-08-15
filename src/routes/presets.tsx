import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PresetList } from "~/features/catalog/components/preset-list";
import { useEnsureCatalog } from "~/features/catalog/hooks/use-ensure-catalog";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/presets")({
  component: PresetsRoute,
});

function PresetsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<PendingComponent />}>
        <PresetsReady />
      </Suspense>
    </OwnerGate>
  );
}

function PresetsReady() {
  useEnsureCatalog();
  const { data: items } = useSuspenseQuery(convexQuery(api.items.list, {}));
  const { data: presets } = useSuspenseQuery(convexQuery(api.presets.list, {}));
  const createPreset = useConvexMutation(api.presets.create);
  const updatePreset = useConvexMutation(api.presets.update);
  const removePreset = useConvexMutation(api.presets.remove);

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
